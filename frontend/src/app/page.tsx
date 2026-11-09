"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderKanban,
  Activity,
  CheckCircle2,
  Clock,
  Rocket,
  Zap,
  Search,
  ArrowUpRight,
  SortDesc,
  X,
  Briefcase,
  ClipboardList,
  Server,
  Wrench,
  ShieldCheck,
  Cpu,
  Play,
  FileText,
  MessageSquare,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useApi } from "@/hooks/use-api";
import {
  listProjects,
  listAgents,
  listApprovals,
  startDemo,
} from "@/lib/api";
import type { ProjectListResponse, ProjectResponse } from "@/types/project";
import type { AgentListResponse } from "@/types/agent";
import type { ApprovalResponse } from "@/types/approval";
import { cn } from "@/lib/utils";

// ── Agent metadata ─────────────────────────────────────
const AGENT_META: Record<
  string,
  { icon: React.ElementType; color: string; bg: string; label: string; role: string; hex: string }
> = {
  ceo: { icon: Briefcase, color: "text-amber-400", bg: "bg-amber-400/10", label: "CEO", role: "Strategic evaluation and final review", hex: "#F59E0B" },
  research: { icon: Search, color: "text-nova-cyan", bg: "bg-nova-cyan/10", label: "Research", role: "Market analysis and competitive research", hex: "#06B6D4" },
  cpo: { icon: ClipboardList, color: "text-nova-violet", bg: "bg-nova-violet/10", label: "CPO", role: "Product requirements and user stories", hex: "#8B5CF6" },
  cto: { icon: Server, color: "text-nova-success", bg: "bg-nova-success/10", label: "CTO", role: "Technical architecture and stack decisions", hex: "#10B981" },
  engineering: { icon: Wrench, color: "text-rose-400", bg: "bg-rose-400/10", label: "Engineering", role: "Task breakdown and sprint planning", hex: "#FB7185" },
  qa: { icon: ShieldCheck, color: "text-nova-blue", bg: "bg-nova-blue/10", label: "QA", role: "Test strategy and quality assurance", hex: "#6366F1" },
};

// ── Constellation positions ────────────────────────────
const CX = 200;
const CY = 160;
const R = 110;
const AGENT_KEYS = ["ceo", "research", "cpo", "cto", "engineering", "qa"] as const;
const NODE_POS = AGENT_KEYS.map((_, i) => {
  const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
  return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
});

// ── Activity derivation ────────────────────────────────
interface DerivedEvent {
  id: string;
  type: "workflow" | "approval" | "error";
  message: string;
  timestamp: string;
  projectId?: string;
}

function deriveActivity(projects: ProjectResponse[], approvals: ApprovalResponse[]): DerivedEvent[] {
  const events: DerivedEvent[] = [];
  for (const p of projects) {
    if (p.status === "active")
      events.push({ id: `wf-s-${p.id}`, type: "workflow", message: `Workflow started: ${p.name}`, timestamp: p.updated_at, projectId: p.id });
    if (p.status === "completed")
      events.push({ id: `wf-d-${p.id}`, type: "workflow", message: `Workflow completed: ${p.name}`, timestamp: p.updated_at, projectId: p.id });
    if (p.status === "failed")
      events.push({ id: `wf-f-${p.id}`, type: "error", message: `Workflow failed: ${p.name}`, timestamp: p.updated_at, projectId: p.id });
  }
  for (const a of approvals) {
    events.push({
      id: `ap-${a.id}`,
      type: "approval",
      message: a.status === "pending" ? `Approval requested: ${a.step_name}` : `Approval ${a.status}: ${a.step_name}`,
      timestamp: a.resolved_at ?? a.requested_at,
      projectId: a.project_id,
    });
  }
  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

const EVENT_ICON: Record<string, React.ReactNode> = {
  workflow: <Play className="h-3 w-3" />,
  approval: <MessageSquare className="h-3 w-3" />,
  error: <XCircle className="h-3 w-3" />,
};
const EVENT_COLOR: Record<string, string> = {
  workflow: "text-nova-blue bg-nova-blue/10",
  approval: "text-nova-warning bg-nova-warning/10",
  error: "text-nova-red bg-nova-red/10",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  draft: { color: "text-muted-foreground", bg: "bg-muted" },
  active: { color: "text-nova-blue", bg: "bg-nova-blue/10" },
  paused: { color: "text-nova-warning", bg: "bg-nova-warning/10" },
  completed: { color: "text-nova-success", bg: "bg-nova-success/10" },
  failed: { color: "text-nova-red", bg: "bg-nova-red/10" },
};

// ══════════════════════════════════════════════════════
export default function DashboardPage() {
  const router = useRouter();
  const { data: projectData, loading: projLoad } = useApi<ProjectListResponse>(listProjects);
  const { data: agentData, loading: agentLoad } = useApi<AgentListResponse>(listAgents);
  const { data: approvalData } = useApi<ApprovalResponse[]>(() => listApprovals());

  const projects = projectData?.items ?? [];
  const agents = agentData?.agents ?? [];
  const approvals = approvalData ?? [];

  const activeCount = projects.filter((p) => p.status === "active").length;
  const completedCount = projects.filter((p) => p.status === "completed").length;
  const pendingApprovals = approvals.filter((a) => a.status === "pending").length;

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const selAgentData = agents.find((a) => a.type === selectedAgent);

  const activity = useMemo(() => deriveActivity(projects, approvals), [projects, approvals]);
  const [actFilter, setActFilter] = useState<string | null>(null);
  const filteredActivity = actFilter ? activity.filter((e) => e.type === actFilter) : activity;

  const [projSearch, setProjSearch] = useState("");
  const [projSort, setProjSort] = useState<"updated" | "name">("updated");
  const [projStatus, setProjStatus] = useState<string | null>(null);

  const filteredProjects = useMemo(() => {
    let list = [...projects];
    if (projSearch.trim()) {
      const q = projSearch.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    if (projStatus) list = list.filter((p) => p.status === projStatus);
    list.sort((a, b) => (projSort === "name" ? a.name.localeCompare(b.name) : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
    return list;
  }, [projects, projSearch, projSort, projStatus]);

  const [dateStr, setDateStr] = useState("");
  useEffect(() => {
    setDateStr(new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }));
  }, []);

  const [launching, setLaunching] = useState(false);
  const handleDemo = useCallback(async () => {
    setLaunching(true);
    try { const r = await startDemo(); router.push(`/projects/${r.project_id}`); } catch { /* */ } finally { setLaunching(false); }
  }, [router]);

  return (
    <div className="space-y-6">
      {/* ── Command Centre Header ────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Command Centre</h1>
          <p className="text-xs text-muted-foreground">
            {dateStr}
            {" · "}<span className="text-nova-success">All systems operational</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/projects/new">
            <Button size="sm" variant="outline" className="h-8 gap-1.5 border-surface-4 text-xs hover:border-primary/30">
              <Rocket className="h-3 w-3" /> Create Project
            </Button>
          </Link>
          <Button size="sm" onClick={handleDemo} disabled={launching} className="h-8 gap-1.5 text-xs">
            <Zap className="h-3 w-3" /> {launching ? "Launching..." : "Quick Demo"}
          </Button>
        </div>
      </div>

      {/* ── Intelligence Core ────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-xl border border-surface-4 bg-surface-1 p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(99,102,241,0.08),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.06),transparent_60%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-8">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                <Cpu className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-lg font-bold">SUPERNOVA</h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Six autonomous AI agents collaborate to transform your ideas into structured engineering plans — from executive evaluation through research, product, technical architecture, engineering, and QA.
            </p>
            <p className="gradient-text text-xs font-semibold tracking-wide">
              Ideas don&apos;t just evolve. They explode into possibilities.
            </p>
          </div>
          {/* Mini constellation */}
          <div className="hidden shrink-0 lg:block">
            <svg viewBox="0 0 160 160" className="h-32 w-32 opacity-60">
              {AGENT_KEYS.map((key, i) => {
                const a = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                const x = 80 + 50 * Math.cos(a);
                const y = 80 + 50 * Math.sin(a);
                return (
                  <g key={key}>
                    <line x1="80" y1="80" x2={x} y2={y} stroke="#6366F1" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
                    <circle cx={x} cy={y} r="6" fill="#0F1420" stroke={AGENT_META[key].hex} strokeWidth="1.5" />
                  </g>
                );
              })}
              <circle cx="80" cy="80" r="10" fill="#0F1420" stroke="#6366F1" strokeWidth="1.5" />
              <circle cx="80" cy="80" r="16" fill="none" stroke="#6366F1" strokeWidth="0.5" opacity="0.2" className="animate-pulse-ring" />
            </svg>
          </div>
        </div>
      </motion.div>

      {/* ── Metrics ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Total Projects" value={projects.length} icon={<FolderKanban className="h-4 w-4" />} color="text-nova-blue" loading={projLoad} />
        <MetricCard label="Active Workflows" value={activeCount} icon={<Activity className="h-4 w-4" />} color="text-nova-cyan" loading={projLoad} onClick={() => setProjStatus("active")} glow={activeCount > 0} />
        <MetricCard label="Completed" value={completedCount} icon={<CheckCircle2 className="h-4 w-4" />} color="text-nova-success" loading={projLoad} onClick={() => setProjStatus("completed")} />
        <MetricCard label="Pending Approvals" value={pendingApprovals} icon={<Clock className="h-4 w-4" />} color="text-nova-warning" loading={projLoad} onClick={() => router.push("/approvals")} glow={pendingApprovals > 0} />
      </div>

      {/* ── Agent Constellation ──────────────────── */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-surface-4 bg-surface-1 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Agent Constellation</h3>
              <Link href="/agents" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                View all <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
            <svg viewBox="0 0 400 320" className="w-full" style={{ maxHeight: 320 }}>
              {/* Connections to center */}
              {AGENT_KEYS.map((key, i) => (
                <line key={`l-${key}`} x1={CX} y1={CY} x2={NODE_POS[i].x} y2={NODE_POS[i].y}
                  stroke={selectedAgent === key ? "#6366F1" : "#1E293B"} strokeWidth={selectedAgent === key ? 1.5 : 0.8}
                  strokeDasharray={selectedAgent === key ? "none" : "4 4"} className="transition-all duration-300" />
              ))}
              {/* Adjacent connections */}
              {AGENT_KEYS.map((_, i) => {
                const n = (i + 1) % 6;
                return <line key={`a-${i}`} x1={NODE_POS[i].x} y1={NODE_POS[i].y} x2={NODE_POS[n].x} y2={NODE_POS[n].y} stroke="#1E293B" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.4" />;
              })}
              {/* Center */}
              <circle cx={CX} cy={CY} r="22" fill="#0B0F1B" stroke="#6366F1" strokeWidth="1.5" />
              <circle cx={CX} cy={CY} r="30" fill="none" stroke="#6366F1" strokeWidth="0.5" opacity="0.15" className="animate-pulse-ring" />
              <text x={CX} y={CY - 3} textAnchor="middle" className="fill-primary text-[8px] font-bold">CORE</text>
              <text x={CX} y={CY + 7} textAnchor="middle" className="fill-muted-foreground text-[6px]">Orchestrator</text>
              {/* Agent nodes */}
              {AGENT_KEYS.map((key, i) => {
                const pos = NODE_POS[i];
                const meta = AGENT_META[key];
                const agent = agents.find((a) => a.type === key);
                const isRun = agent?.status === "running";
                const isSel = selectedAgent === key;
                return (
                  <g key={key} className="cursor-pointer" onClick={() => setSelectedAgent(isSel ? null : key)}>
                    {isSel && <circle cx={pos.x} cy={pos.y} r="28" fill="none" stroke={meta.hex} strokeWidth="1.5" opacity="0.3" />}
                    {isRun && <circle cx={pos.x} cy={pos.y} r="24" fill="none" stroke={meta.hex} strokeWidth="1" opacity="0.5" className="animate-pulse-ring" />}
                    <circle cx={pos.x} cy={pos.y} r="20" fill="#0B0F1B" stroke={isSel ? meta.hex : "#1E293B"} strokeWidth={isSel ? 2 : 1} className="transition-all duration-200" />
                    <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-[9px] font-semibold" style={{ pointerEvents: "none" }}>{meta.label}</text>
                    <circle cx={pos.x + 15} cy={pos.y - 15} r="4" fill={isRun ? "#6366F1" : agent?.status === "completed" ? "#10B981" : agent?.status === "failed" ? "#EF4444" : "#334155"} stroke="#0B0F1B" strokeWidth="2" />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Agent detail panel */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-surface-4 bg-surface-1 p-4">
            <h3 className="mb-3 text-sm font-semibold">Agent Details</h3>
            <AnimatePresence mode="wait">
              {selectedAgent && selAgentData ? (
                <motion.div key={selectedAgent} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", AGENT_META[selectedAgent].bg)}>
                      {(() => { const I = AGENT_META[selectedAgent].icon; return <I className={cn("h-5 w-5", AGENT_META[selectedAgent].color)} />; })()}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">{selAgentData.name}</h4>
                      <p className="text-[11px] text-muted-foreground">{AGENT_META[selectedAgent].role}</p>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{selAgentData.description}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <MiniStat label="Executions" value={String(selAgentData.total_executions)} />
                    <MiniStat label="Avg Time" value={selAgentData.avg_duration_ms ? `${(selAgentData.avg_duration_ms / 1000).toFixed(1)}s` : "—"} />
                    <MiniStat label="Status" value={selAgentData.status} highlight={selAgentData.status === "running"} />
                  </div>
                  {selAgentData.last_executed_at && (
                    <p className="text-[11px] text-muted-foreground">Last run: {new Date(selAgentData.last_executed_at).toLocaleString()}</p>
                  )}
                  {selAgentData.current_project_id && (
                    <Link href={`/projects/${selAgentData.current_project_id}`} className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                      View active project <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  )}
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-12 text-center">
                  <Cpu className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Select an agent</p>
                  <p className="text-[11px] text-muted-foreground/60">Click a node in the constellation</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Activity + Projects ──────────────────── */}
      <div className="grid gap-4 lg:grid-cols-5">
        {/* Activity */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-surface-4 bg-surface-1 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Live Activity</h3>
              {actFilter && (
                <button onClick={() => setActFilter(null)} className="flex items-center gap-1 text-[11px] text-primary hover:underline">
                  Clear <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {["workflow", "approval", "error"].map((t) => (
                <button key={t} onClick={() => setActFilter(actFilter === t ? null : t)}
                  className={cn("rounded-md px-2 py-0.5 text-[10px] font-medium capitalize transition-colors",
                    actFilter === t ? "bg-primary/15 text-primary" : "bg-surface-3 text-muted-foreground hover:text-foreground")}>
                  {t}
                </button>
              ))}
            </div>
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {filteredActivity.length === 0 ? (
                <div className="py-8 text-center">
                  <Activity className="mx-auto mb-2 h-6 w-6 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">No activity yet.</p>
                </div>
              ) : (
                filteredActivity.slice(0, 20).map((ev) => (
                  <Link key={ev.id} href={ev.projectId ? `/projects/${ev.projectId}` : "#"}
                    className="group flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-surface-3">
                    <div className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md", EVENT_COLOR[ev.type])}>
                      {EVENT_ICON[ev.type]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs">{ev.message}</p>
                      <p className="text-[10px] text-muted-foreground">{relativeTime(ev.timestamp)}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Projects */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-surface-4 bg-surface-1 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Project Universe</h3>
              <Link href="/projects/new">
                <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs"><Rocket className="h-3 w-3" /> New</Button>
              </Link>
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={projSearch} onChange={(e) => setProjSearch(e.target.value)} placeholder="Search projects..." className="h-8 bg-surface-2 pl-8 text-xs" />
              </div>
              <div className="flex items-center gap-1">
                {["active", "completed", "draft"].map((s) => (
                  <button key={s} onClick={() => setProjStatus(projStatus === s ? null : s)}
                    className={cn("rounded-md px-2 py-1 text-[10px] font-medium capitalize transition-colors",
                      projStatus === s ? "bg-primary/15 text-primary" : "bg-surface-3 text-muted-foreground hover:text-foreground")}>
                    {s}
                  </button>
                ))}
                <button onClick={() => setProjSort(projSort === "updated" ? "name" : "updated")}
                  className="ml-1 rounded-md bg-surface-3 p-1.5 text-muted-foreground hover:text-foreground"
                  title={`Sort by ${projSort === "updated" ? "name" : "last updated"}`}>
                  <SortDesc className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="max-h-80 space-y-1.5 overflow-y-auto">
              {projLoad ? (
                [1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-3" />)
              ) : filteredProjects.length === 0 ? (
                <div className="py-8 text-center">
                  <FolderKanban className="mx-auto mb-2 h-6 w-6 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">{projects.length === 0 ? "No projects yet." : "No matches."}</p>
                </div>
              ) : (
                filteredProjects.map((p) => <ProjectRow key={p.id} project={p} />)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────

function MetricCard({ label, value, icon, color, loading, onClick, glow }: {
  label: string; value: number; icon: React.ReactNode; color: string; loading: boolean; onClick?: () => void; glow?: boolean;
}) {
  return (
    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClick}
      className={cn("rounded-xl border border-surface-4 bg-surface-1 p-4 text-left transition-all hover:border-primary/20", glow && "glow-blue")}>
      <div className={cn("mb-2", color)}>{icon}</div>
      {loading ? <div className="h-7 w-12 animate-pulse rounded bg-surface-3" /> : <p className="font-mono text-2xl font-bold">{value}</p>}
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </motion.button>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-surface-2 px-2.5 py-2 text-center">
      <p className={cn("font-mono text-sm font-semibold", highlight && "text-primary")}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function ProjectRow({ project }: { project: ProjectResponse }) {
  const cfg = STATUS_CFG[project.status] ?? STATUS_CFG.draft;
  return (
    <Link href={`/projects/${project.id}`} className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{project.name}</p>
          {project.is_demo && <Badge variant="secondary" className="text-[9px]">Demo</Badge>}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{project.description || project.idea_text.slice(0, 80)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge className={cn("text-[10px]", cfg.color, cfg.bg)}>{project.status}</Badge>
        <span className="text-[10px] text-muted-foreground">{relativeTime(project.updated_at)}</span>
        <ArrowUpRight className="h-3 w-3 text-muted-foreground/0 group-hover:text-muted-foreground" />
      </div>
    </Link>
  );
}
