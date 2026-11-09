"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase,
  Search,
  ClipboardList,
  Server,
  Wrench,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Play,
  Cpu,
  ArrowRight,
  ArrowUpRight,
  X,
  BarChart3,
  Activity,
  ChevronLeft,
} from "lucide-react";
import { useApi } from "@/hooks/use-api";
import { listAgents, listProjects, listApprovals } from "@/lib/api";
import type { AgentListResponse, AgentInfo } from "@/types/agent";
import type { ProjectListResponse, ProjectResponse } from "@/types/project";
import type { ApprovalResponse } from "@/types/approval";
import { cn } from "@/lib/utils";

// ── Agent metadata ──────────────────────────────────────

const AGENT_META: Record<
  string,
  {
    icon: React.ElementType;
    hex: string;
    label: string;
    role: string;
    description: string;
    responsibilities: string[];
    outputs: string[];
  }
> = {
  ceo: {
    icon: Briefcase,
    hex: "#F59E0B",
    label: "CEO",
    role: "Strategic Evaluation & Leadership",
    description:
      "Performs initial strategic evaluation of product ideas and conducts the final comprehensive review before delivery.",
    responsibilities: [
      "Evaluate market viability",
      "Strategic go/no-go decisions",
      "Final comprehensive review",
      "Executive alignment",
    ],
    outputs: ["Executive Summary", "CEO Final Review"],
  },
  research: {
    icon: Search,
    hex: "#06B6D4",
    label: "Research",
    role: "Market Intelligence & Analysis",
    description:
      "Conducts deep market research, competitive analysis, and target audience identification to inform product decisions.",
    responsibilities: [
      "Market analysis",
      "Competitive landscape mapping",
      "Target audience research",
      "Industry trend analysis",
    ],
    outputs: ["Research Report"],
  },
  cpo: {
    icon: ClipboardList,
    hex: "#8B5CF6",
    label: "CPO",
    role: "Product Strategy & Requirements",
    description:
      "Translates research insights into a clear product vision, requirements and prioritized feature roadmap.",
    responsibilities: [
      "Define product vision and strategy",
      "Create product requirements (PRD)",
      "Prioritize features and scope",
      "Ensure user and market alignment",
    ],
    outputs: ["Product Requirements Document"],
  },
  cto: {
    icon: Server,
    hex: "#10B981",
    label: "CTO",
    role: "Technical Architecture & Design",
    description:
      "Designs the technical architecture, selects the technology stack, and defines infrastructure requirements.",
    responsibilities: [
      "Technical architecture design",
      "Technology stack selection",
      "Infrastructure planning",
      "Scalability strategy",
    ],
    outputs: ["Technical Architecture Document"],
  },
  engineering: {
    icon: Wrench,
    hex: "#FB7185",
    label: "Engineering",
    role: "Implementation Planning",
    description:
      "Breaks down the technical architecture into actionable engineering tasks, sprints and effort estimates.",
    responsibilities: [
      "Task breakdown",
      "Sprint planning",
      "Effort estimation",
      "Dependency mapping",
    ],
    outputs: ["Task Breakdown Document"],
  },
  qa: {
    icon: ShieldCheck,
    hex: "#6366F1",
    label: "QA",
    role: "Quality Assurance Strategy",
    description:
      "Creates comprehensive test strategies covering all aspects of quality assurance for the planned product.",
    responsibilities: [
      "Test plan creation",
      "Quality criteria definition",
      "Testing strategy",
      "Risk assessment",
    ],
    outputs: ["Test Plan Document"],
  },
};

const AGENT_KEYS = ["ceo", "research", "cpo", "cto", "engineering", "qa"] as const;

const TAB_LABELS = {
  overview: "Overview",
  runs: "Recent Runs",
  outputs: "Outputs",
  metrics: "Metrics",
} as const;
type TabKey = keyof typeof TAB_LABELS;

// ── SVG constellation coordinates ───────────────────────

const SVG_W = 740;
const SVG_H = 380;
const CX = SVG_W / 2;
const CY = SVG_H / 2 - 5;
const ORBIT_R = 125;

const NODE_POS = AGENT_KEYS.map((_, i) => {
  const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
  return { x: CX + ORBIT_R * Math.cos(a), y: CY + ORBIT_R * Math.sin(a) };
});

const STARS: { cx: number; cy: number; r: number; o: number }[] = [];
for (let i = 0; i < 100; i++) {
  STARS.push({
    cx: (i * 137.508 + 43) % SVG_W,
    cy: (i * 97.181 + 29) % SVG_H,
    r: i % 7 === 0 ? 1.3 : i % 3 === 0 ? 0.9 : 0.5,
    o: 0.12 + (i % 6) * 0.07,
  });
}

const STATUS_INFO: Record<string, { label: string; dot: string }> = {
  idle: { label: "Idle", dot: "#10B981" },
  running: { label: "Running", dot: "#6366F1" },
  completed: { label: "Ready", dot: "#10B981" },
  failed: { label: "Error", dot: "#EF4444" },
};

const STATUS_BADGE_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  idle: { bg: "bg-nova-success/10", text: "text-nova-success", dot: "bg-nova-success" },
  running: { bg: "bg-nova-blue/10", text: "text-nova-blue", dot: "bg-nova-blue" },
  completed: { bg: "bg-nova-success/10", text: "text-nova-success", dot: "bg-nova-success" },
  failed: { bg: "bg-nova-red/10", text: "text-nova-red", dot: "bg-nova-red" },
};

// ── Main page ───────────────────────────────────────────

export default function AgentsPage() {
  const { data: agentData, loading: agentsLoading } = useApi<AgentListResponse>(listAgents);
  const { data: projectData } = useApi<ProjectListResponse>(listProjects);
  const { data: approvalData } = useApi<ApprovalResponse[]>(() => listApprovals());

  const agents = agentData?.agents ?? [];
  const projects = projectData?.items ?? [];
  const approvals = approvalData ?? [];

  const [selected, setSelected] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const selAgent = agents.find((a) => a.type === selected);

  const statusCounts = useMemo(
    () => ({
      idle: agents.filter((a) => a.status === "idle").length,
      running: agents.filter((a) => a.status === "running").length,
      awaiting: approvals.filter((a) => a.status === "pending").length,
      failed: agents.filter((a) => a.status === "failed").length,
    }),
    [agents, approvals],
  );

  const totalRuns = agents.reduce((s, a) => s + a.total_executions, 0);
  const successRuns = projects.filter((p) => p.status === "completed").length;
  const failedRuns = projects.filter((p) => p.status === "failed").length;

  const [nowIso, setNowIso] = useState("");
  useEffect(() => { setNowIso(new Date().toISOString()); }, []);

  const activities = useMemo(
    () => (nowIso ? deriveActivity(projects, approvals, nowIso) : []),
    [projects, approvals, nowIso],
  );

  useEffect(() => {
    setActiveTab("overview");
  }, [selected]);

  if (agentsLoading) return <LoadingSkeleton />;

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      {/* Header */}
      <div className="shrink-0">
        <p className="mb-0.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-primary">
          <ChevronLeft className="h-3 w-3" /> Agent Network
        </p>
        <h1 className="text-lg font-bold tracking-tight">Intelligence Command Center</h1>
        <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">
          Six specialized AI agents working in concert to turn ideas into executable products.
        </p>
      </div>

      {/* Main grid: Constellation + Detail Panel */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_380px]">
        <OrchestrationConstellation
          agents={agents}
          selected={selected}
          onSelect={(key) => setSelected(key === selected ? null : key)}
        />
        <AgentDetailPanel
          agent={selAgent}
          meta={selected ? AGENT_META[selected] : null}
          agentKey={selected}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onClose={() => setSelected(null)}
        />
      </div>

      {/* Bottom panels */}
      <div className="grid shrink-0 gap-4 lg:grid-cols-3">
        <AgentStatusPanel agents={agents} counts={statusCounts} />
        <ExecutionOverviewPanel total={totalRuns} success={successRuns} failures={failedRuns} />
        <RecentActivityPanel activities={activities} />
      </div>
    </div>
  );
}

// ── Orchestration Constellation ─────────────────────────

function OrchestrationConstellation({
  agents,
  selected,
  onSelect,
}: {
  agents: AgentInfo[];
  selected: string | null;
  onSelect: (key: string) => void;
}) {
  return (
    <div
      className="relative min-h-0 overflow-hidden rounded-2xl"
      style={{
        background: "linear-gradient(180deg, #0d1025 0%, #080B14 100%)",
        border: "1px solid rgba(99,102,241,0.10)",
      }}
    >
      {/* Nebula layers */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 45%, rgba(139,92,246,0.12) 0%, transparent 55%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 30% 60%, rgba(6,182,212,0.05) 0%, transparent 45%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 70% 35%, rgba(99,102,241,0.06) 0%, transparent 40%)",
        }}
      />

      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="relative h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="core-outer-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
            <stop offset="40%" stopColor="#6366F1" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="core-inner-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.5" />
            <stop offset="50%" stopColor="#6366F1" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0.03" />
          </radialGradient>
          <radialGradient id="core-center" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0.05" />
          </radialGradient>
        </defs>

        {/* Stars */}
        {STARS.map((s, i) => (
          <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="white" opacity={s.o} />
        ))}

        {/* Outer orbital rings */}
        <circle
          cx={CX}
          cy={CY}
          r={ORBIT_R}
          fill="none"
          stroke="#6366F1"
          strokeWidth="0.5"
          opacity="0.12"
          strokeDasharray="3 6"
        />
        <circle
          cx={CX}
          cy={CY}
          r={ORBIT_R + 18}
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="0.3"
          opacity="0.06"
          strokeDasharray="2 8"
        />

        {/* Connection lines: center → agents */}
        {AGENT_KEYS.map((key, i) => {
          const pos = NODE_POS[i];
          const meta = AGENT_META[key];
          const agent = agents.find((a) => a.type === key);
          const isSel = selected === key;
          const isRun = agent?.status === "running";
          return (
            <line
              key={`conn-${key}`}
              x1={CX}
              y1={CY}
              x2={pos.x}
              y2={pos.y}
              stroke={isSel ? meta.hex : isRun ? "#6366F1" : "#1E293B"}
              strokeWidth={isSel ? 1.5 : 0.8}
              strokeDasharray={isSel || isRun ? "none" : "4 6"}
              opacity={isSel ? 0.8 : isRun ? 0.5 : 0.25}
              className="transition-all duration-500"
            />
          );
        })}

        {/* Adjacent agent connections */}
        {AGENT_KEYS.map((_, i) => {
          const n = (i + 1) % 6;
          return (
            <line
              key={`adj-${i}`}
              x1={NODE_POS[i].x}
              y1={NODE_POS[i].y}
              x2={NODE_POS[n].x}
              y2={NODE_POS[n].y}
              stroke="#1E293B"
              strokeWidth="0.4"
              strokeDasharray="2 5"
              opacity="0.15"
            />
          );
        })}

        {/* ── Central Core ── */}
        {/* Outer glow (breathing) */}
        <circle
          cx={CX}
          cy={CY}
          r={88}
          fill="url(#core-outer-glow)"
          className="animate-core-breathe"
        />

        {/* Mid glow ring */}
        <circle cx={CX} cy={CY} r={60} fill="url(#core-inner-glow)" opacity="0.4" />

        {/* Spinning orbital ring */}
        <g
          className="animate-spin-slow"
          style={{ transformOrigin: `${CX}px ${CY}px` }}
        >
          <circle
            cx={CX}
            cy={CY}
            r={52}
            fill="none"
            stroke="#6366F1"
            strokeWidth="0.5"
            opacity="0.2"
          />
          {/* Orbital dot */}
          <circle cx={CX + 52} cy={CY} r={2} fill="#6366F1" opacity="0.5" />
        </g>

        {/* Static inner ring */}
        <circle
          cx={CX}
          cy={CY}
          r={44}
          fill="none"
          stroke="#8B5CF6"
          strokeWidth="0.3"
          opacity="0.12"
        />

        {/* Core body */}
        <circle
          cx={CX}
          cy={CY}
          r={36}
          fill="#0B0F1B"
          stroke="#6366F1"
          strokeWidth="1.5"
        />

        {/* Core inner glow */}
        <circle cx={CX} cy={CY} r={28} fill="url(#core-inner-glow)" opacity="0.6" />

        {/* Core center light */}
        <circle cx={CX} cy={CY} r={14} fill="url(#core-center)" />

        {/* Core text */}
        <text
          x={CX}
          y={CY - 5}
          textAnchor="middle"
          className="fill-foreground text-[9px] font-bold"
          style={{ letterSpacing: "0.15em", pointerEvents: "none" }}
        >
          SUPERNOVA
        </text>
        <text
          x={CX}
          y={CY + 8}
          textAnchor="middle"
          className="fill-muted-foreground text-[7px]"
          style={{ pointerEvents: "none" }}
        >
          Orchestration Core
        </text>

        {/* ── Agent Nodes ── */}
        {AGENT_KEYS.map((key, i) => {
          const pos = NODE_POS[i];
          const meta = AGENT_META[key];
          const agent = agents.find((a) => a.type === key);
          const status = agent?.status ?? "idle";
          const info = STATUS_INFO[status] ?? STATUS_INFO.idle;
          const isSel = selected === key;
          const isRun = status === "running";

          return (
            <g key={key} className="cursor-pointer" onClick={() => onSelect(key)}>
              {/* Selection ring */}
              {isSel && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={38}
                  fill="none"
                  stroke={meta.hex}
                  strokeWidth="1.5"
                  opacity="0.3"
                />
              )}
              {/* Running pulse */}
              {isRun && (
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={35}
                  fill="none"
                  stroke={meta.hex}
                  strokeWidth="1"
                  opacity="0.4"
                  className="animate-pulse-ring"
                  style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
                />
              )}

              {/* Node background */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={28}
                fill="#0B0F1B"
                stroke={isSel ? meta.hex : "#1E293B"}
                strokeWidth={isSel ? 2 : 1}
                className="transition-all duration-300"
              />
              {/* Hover overlay */}
              <circle
                cx={pos.x}
                cy={pos.y}
                r={28}
                fill="transparent"
                className="transition-all duration-200 hover:fill-[rgba(99,102,241,0.06)]"
              />

              {/* Icon */}
              <foreignObject
                x={pos.x - 10}
                y={pos.y - 10}
                width="20"
                height="20"
                style={{ pointerEvents: "none" }}
              >
                <div className="flex h-full w-full items-center justify-center">
                  {(() => {
                    const I = meta.icon;
                    return <I className="h-4 w-4" style={{ color: meta.hex }} />;
                  })()}
                </div>
              </foreignObject>

              {/* Name label */}
              <text
                x={pos.x}
                y={pos.y + 43}
                textAnchor="middle"
                className="fill-foreground text-[11px] font-medium"
                style={{ pointerEvents: "none" }}
              >
                {meta.label}
              </text>

              {/* Status dot + label */}
              <circle
                cx={pos.x - 14}
                cy={pos.y + 55}
                r={3}
                fill={info.dot}
                style={{ pointerEvents: "none" }}
              />
              <text
                x={pos.x + 1}
                y={pos.y + 58}
                textAnchor="middle"
                className="fill-muted-foreground text-[9px]"
                style={{ pointerEvents: "none" }}
              >
                {info.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Agent Detail Panel ──────────────────────────────────

function AgentDetailPanel({
  agent,
  meta,
  agentKey,
  activeTab,
  onTabChange,
  onClose,
}: {
  agent: AgentInfo | undefined;
  meta: (typeof AGENT_META)[string] | null;
  agentKey: string | null;
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-surface-4 bg-surface-1">
      <AnimatePresence mode="wait">
        {agentKey && agent && meta ? (
          <motion.div
            key={agentKey}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-1 flex-col"
          >
            {/* Agent header */}
            <div className="border-b border-surface-4 p-5">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${meta.hex}15` }}
                >
                  {(() => {
                    const I = meta.icon;
                    return <I className="h-5 w-5" style={{ color: meta.hex }} />;
                  })()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold">{agent.name}</h3>
                    {(() => {
                      const ss =
                        STATUS_BADGE_STYLES[agent.status] ?? STATUS_BADGE_STYLES.idle;
                      return (
                        <span
                          className={cn(
                            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                            ss.bg,
                            ss.text,
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", ss.dot)} />
                          {STATUS_INFO[agent.status]?.label ?? agent.status}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{meta.role}</p>
                </div>
                <button
                  onClick={onClose}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-surface-4">
              {(Object.keys(TAB_LABELS) as TabKey[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => onTabChange(tab)}
                  className={cn(
                    "flex-1 py-2.5 text-center text-[11px] font-medium transition-colors",
                    activeTab === tab
                      ? "border-b-2 border-primary text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <AnimatePresence mode="wait">
                {activeTab === "overview" && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-4"
                  >
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {meta.description}
                    </p>
                    <div>
                      <h4 className="mb-2.5 text-xs font-semibold">Responsibilities</h4>
                      <ul className="space-y-2">
                        {meta.responsibilities.map((r) => (
                          <li
                            key={r}
                            className="flex items-start gap-2 text-xs text-muted-foreground"
                          >
                            <CheckCircle2
                              className="mt-0.5 h-3.5 w-3.5 shrink-0"
                              style={{ color: meta.hex }}
                            />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}

                {activeTab === "runs" && (
                  <motion.div
                    key="runs"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    {agent.total_executions > 0 ? (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-surface-4 bg-surface-2 p-3">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Last execution</span>
                            <span className="font-mono">
                              {agent.last_executed_at
                                ? new Date(agent.last_executed_at).toLocaleString()
                                : "—"}
                            </span>
                          </div>
                        </div>
                        <div className="rounded-lg border border-surface-4 bg-surface-2 p-3">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Total executions</span>
                            <span className="font-mono font-semibold">
                              {agent.total_executions}
                            </span>
                          </div>
                        </div>
                        {agent.current_project_id && (
                          <Link
                            href={`/projects/${agent.current_project_id}`}
                            className="flex items-center justify-between rounded-lg border border-surface-4 bg-surface-2 p-3 text-xs transition-colors hover:border-primary/20"
                          >
                            <span>Active project</span>
                            <span className="flex items-center gap-1 text-primary">
                              View <ArrowUpRight className="h-3 w-3" />
                            </span>
                          </Link>
                        )}
                      </div>
                    ) : (
                      <EmptyTabState
                        icon={Clock}
                        message="No execution history yet"
                        hint="Run a workflow to see agent activity"
                      />
                    )}
                  </motion.div>
                )}

                {activeTab === "outputs" && (
                  <motion.div
                    key="outputs"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Expected outputs
                    </p>
                    {meta.outputs.map((o) => (
                      <div
                        key={o}
                        className="flex items-center gap-2 rounded-lg border border-surface-4 bg-surface-2 px-3 py-2.5 text-xs"
                      >
                        <div
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: meta.hex }}
                        />
                        {o}
                      </div>
                    ))}
                    {agent.current_project_id && (
                      <Link
                        href={`/projects/${agent.current_project_id}`}
                        className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        View project documents <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    )}
                  </motion.div>
                )}

                {activeTab === "metrics" && (
                  <motion.div
                    key="metrics"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <MetricCell
                        label="Total Runs"
                        value={String(agent.total_executions)}
                        color={meta.hex}
                      />
                      <MetricCell
                        label="Avg Duration"
                        value={
                          agent.avg_duration_ms
                            ? `${(agent.avg_duration_ms / 1000).toFixed(1)}s`
                            : "—"
                        }
                        color={meta.hex}
                      />
                      <MetricCell
                        label="Status"
                        value={STATUS_INFO[agent.status]?.label ?? agent.status}
                        color={meta.hex}
                      />
                      <MetricCell
                        label="Last Run"
                        value={
                          agent.last_executed_at
                            ? new Date(agent.last_executed_at).toLocaleDateString()
                            : "Never"
                        }
                        color={meta.hex}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col items-center justify-center py-12 text-center"
          >
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-3">
              <Cpu className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Select an agent</p>
            <p className="mt-1 text-[11px] text-muted-foreground/60">
              Click a node in the constellation to inspect it
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EmptyTabState({
  icon: Icon,
  message,
  hint,
}: {
  icon: React.ElementType;
  message: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <Icon className="mb-2 h-6 w-6 text-muted-foreground/30" />
      <p className="text-xs text-muted-foreground">{message}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground/50">{hint}</p>
    </div>
  );
}

function MetricCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-surface-4 bg-surface-2 p-3 text-center">
      <p className="font-mono text-base font-bold" style={{ color }}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

// ── Bottom Panels ───────────────────────────────────────

function AgentStatusPanel({
  agents,
  counts,
}: {
  agents: AgentInfo[];
  counts: { idle: number; running: number; awaiting: number; failed: number };
}) {
  const total = agents.length;
  const rows = [
    {
      label: "Idle",
      count: counts.idle,
      color: "#10B981",
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-nova-success" />,
    },
    {
      label: "Running",
      count: counts.running,
      color: "#6366F1",
      icon: <Play className="h-3.5 w-3.5 text-nova-blue" />,
    },
    {
      label: "Awaiting Approval",
      count: counts.awaiting,
      color: "#F59E0B",
      icon: <Clock className="h-3.5 w-3.5 text-nova-warning" />,
    },
    {
      label: "Failed",
      count: counts.failed,
      color: "#EF4444",
      icon: <AlertCircle className="h-3.5 w-3.5 text-nova-red" />,
    },
  ];

  return (
    <div className="rounded-2xl border border-surface-4 bg-surface-1 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Agent Status</h3>
        </div>
        <span className="text-[11px] text-muted-foreground">{total} Agents</span>
      </div>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2.5">
            {r.icon}
            <span className="w-28 text-xs text-muted-foreground">{r.label}</span>
            <div className="flex-1">
              <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: total > 0 ? `${(r.count / total) * 100}%` : "0%",
                    backgroundColor: r.color,
                  }}
                />
              </div>
            </div>
            <span className="w-6 text-right font-mono text-xs text-muted-foreground">
              {r.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExecutionOverviewPanel({
  total,
  success,
  failures,
}: {
  total: number;
  success: number;
  failures: number;
}) {
  return (
    <div className="rounded-2xl border border-surface-4 bg-surface-1 p-4">
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Execution Overview</h3>
      </div>
      <div className="flex items-center justify-around py-2">
        <div className="text-center">
          <p className="font-mono text-2xl font-bold text-nova-blue">{total}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Total Runs</p>
        </div>
        <div className="h-10 w-px bg-surface-4" />
        <div className="text-center">
          <p className="font-mono text-2xl font-bold text-nova-success">{success}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Success</p>
        </div>
        <div className="h-10 w-px bg-surface-4" />
        <div className="text-center">
          <p className="font-mono text-2xl font-bold text-nova-red">{failures}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Failures</p>
        </div>
      </div>
    </div>
  );
}

interface ActivityItem {
  type: "system" | "project" | "approval";
  label: string;
  sublabel: string;
  time: string;
  href?: string;
}

function RecentActivityPanel({ activities }: { activities: ActivityItem[] }) {
  return (
    <div className="rounded-2xl border border-surface-4 bg-surface-1 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Recent Activity</h3>
        </div>
        <Link
          href="/"
          className="flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          View All <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="space-y-3">
        {activities.map((a, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-nova-blue" />
            <div className="min-w-0 flex-1">
              {a.href ? (
                <Link href={a.href} className="text-xs font-medium hover:text-primary">
                  {a.label}
                </Link>
              ) : (
                <p className="text-xs font-medium">{a.label}</p>
              )}
              <p className="text-[11px] text-muted-foreground">{a.sublabel}</p>
            </div>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {relativeTime(a.time)}
            </span>
          </div>
        ))}
        {activities.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">
            No recent activity
          </p>
        )}
      </div>
    </div>
  );
}

// ── Loading skeleton ────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      <div className="shrink-0">
        <div className="mb-2 h-3 w-24 animate-pulse rounded bg-surface-3" />
        <div className="h-5 w-64 animate-pulse rounded bg-surface-3" />
        <div className="mt-2 h-3 w-80 animate-pulse rounded bg-surface-3" />
      </div>
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_380px]">
        <div className="animate-pulse rounded-2xl bg-surface-2" />
        <div className="animate-pulse rounded-2xl bg-surface-2" />
      </div>
      <div className="grid shrink-0 gap-4 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-surface-2" />
        ))}
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────

function deriveActivity(
  projects: ProjectResponse[],
  approvals: ApprovalResponse[],
  nowIso: string,
): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const p of projects) {
    const statusLabel =
      p.status === "active"
        ? "Workflow processing"
        : p.status === "completed"
          ? "All agents completed"
          : p.status === "failed"
            ? "Workflow encountered errors"
            : "Draft created";
    items.push({
      type: "project",
      label: `Project "${p.name}"`,
      sublabel: statusLabel,
      time: p.updated_at,
      href: `/projects/${p.id}`,
    });
  }

  for (const a of approvals.slice(0, 5)) {
    items.push({
      type: "approval",
      label:
        a.status === "pending"
          ? `Approval requested: ${a.step_name}`
          : `${a.step_name} ${a.status.replace("_", " ")}`,
      sublabel:
        a.status === "pending"
          ? "Awaiting review"
          : `Resolved ${a.resolved_at ? new Date(a.resolved_at).toLocaleDateString() : ""}`,
      time: a.status === "pending" ? a.requested_at : (a.resolved_at ?? a.requested_at),
      href: "/approvals",
    });
  }

  items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const systemEvents: ActivityItem[] = [
    {
      type: "system",
      label: "System initialized",
      sublabel: "All agents ready",
      time: nowIso,
    },
    {
      type: "system",
      label: "Agent network is online",
      sublabel: "Orchestration core active",
      time: nowIso,
    },
  ];

  return [...items, ...systemEvents].slice(0, 5);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
