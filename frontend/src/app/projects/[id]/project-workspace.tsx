"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  FileText,
  GitBranch,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Wifi,
  WifiOff,
  ArrowLeft,
  Briefcase,
  Search,
  ClipboardList,
  Server,
  Wrench,
  ShieldCheck,
  Copy,
  X,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useProject } from "@/hooks/use-project";
import {
  startWorkflow,
  pauseWorkflow,
  resumeWorkflow,
  cancelWorkflow,
  resolveApproval,
} from "@/lib/api";
import type { DocumentResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

const DOC_TYPE_LABELS: Record<string, string> = {
  executive_summary: "Executive Summary",
  research_report: "Research Report",
  prd: "Product Requirements",
  tech_architecture: "Technical Architecture",
  task_breakdown: "Task Breakdown",
  test_plan: "Test Plan",
  ceo_final_review: "CEO Final Review",
};

const DOC_TYPE_COLORS: Record<string, string> = {
  executive_summary: "#F59E0B",
  research_report: "#06B6D4",
  prd: "#8B5CF6",
  tech_architecture: "#10B981",
  task_breakdown: "#FB7185",
  test_plan: "#6366F1",
  ceo_final_review: "#F59E0B",
};

const DOC_TYPE_ICON_MAP: Record<string, React.ElementType> = {
  executive_summary: Briefcase,
  research_report: Search,
  prd: ClipboardList,
  tech_architecture: Server,
  task_breakdown: Wrench,
  test_plan: ShieldCheck,
  ceo_final_review: Briefcase,
};

const ALL_DOC_TYPES = [
  "executive_summary",
  "research_report",
  "prd",
  "tech_architecture",
  "task_breakdown",
  "test_plan",
  "ceo_final_review",
];

const TOTAL_PIPELINE_STEPS = 7;

function computeProgress(workflowStatus: string | undefined, stepCount: number): number {
  if (!workflowStatus) return 0;
  if (workflowStatus === "completed") return 100;
  if (workflowStatus === "failed") return 0;
  return Math.round((stepCount / TOTAL_PIPELINE_STEPS) * 100);
}

export function ProjectWorkspace({ id }: { id: string }) {
  const { project, workflow, documents, approvals, connected, loading, error, refetchAll, refetchApprovals } = useProject(id);
  const [openDoc, setOpenDoc] = useState<DocumentResponse | null>(null);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
        <div className="h-6 w-1/3 animate-pulse rounded bg-surface-3" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-surface-3" />
        <div className="h-16 animate-pulse rounded-xl bg-surface-2" />
        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{error ?? "Project not found"}</p>
        <Link href="/"><Button variant="outline" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /> Dashboard</Button></Link>
      </div>
    );
  }

  const completedStepCount = workflow?.steps.filter((s) => s.status === "completed").length ?? 0;
  const progress = computeProgress(workflow?.status, completedStepCount);
  const pendingApproval = approvals.find((a) => a.status === "pending");
  const docMap = new Map(documents.map((d) => [d.doc_type, d]));

  async function handleStart() { await startWorkflow(id); refetchAll(); }
  async function handlePause() { await pauseWorkflow(id); refetchAll(); }
  async function handleResume() { await resumeWorkflow(id); refetchAll(); }
  async function handleCancel() { await cancelWorkflow(id); refetchAll(); }

  return (
    <>
      <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div className="flex items-start gap-2">
            <Link href="/"><Button variant="ghost" size="sm" className="mt-0.5 h-7 w-7 p-0"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold">{project.name}</h2>
              <p className="mt-0.5 max-w-xl truncate text-xs text-muted-foreground">{project.description || project.idea_text.slice(0, 120)}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {connected ? <Wifi className="h-3.5 w-3.5 text-nova-success" /> : <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />}
            <Badge variant="outline" className="text-[11px]">{project.status}</Badge>
            {project.is_demo && <Badge variant="secondary" className="text-[10px]">Demo</Badge>}
          </div>
        </div>

        {/* Workflow bar */}
        <div className="shrink-0 rounded-xl border border-surface-4 bg-surface-1 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Workflow</span>
              {workflow ? (
                <>
                  <Badge variant="outline" className="text-[11px]">{workflow.status}</Badge>
                  {workflow.current_node && <span className="hidden text-xs text-muted-foreground sm:inline">@ {workflow.current_node}</span>}
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Not started</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {workflow && (
                <Link href={`/workflow/${id}`}>
                  <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs">Pipeline</Button>
                </Link>
              )}
              {!workflow && <Button size="sm" onClick={handleStart} className="h-7 gap-1.5"><Play className="h-3 w-3" /> Start</Button>}
              {workflow?.status === "running" && <Button size="sm" variant="outline" onClick={handlePause} className="h-7"><Pause className="mr-1 h-3 w-3" /> Pause</Button>}
              {workflow?.status === "paused" && <Button size="sm" variant="outline" onClick={handleResume} className="h-7"><RotateCcw className="mr-1 h-3 w-3" /> Resume</Button>}
              {(workflow?.status === "running" || workflow?.status === "paused") && (
                <Button size="sm" variant="destructive" onClick={handleCancel} className="h-7"><Square className="mr-1 h-3 w-3" /> Cancel</Button>
              )}
            </div>
          </div>
          {workflow && (
            <div className="mt-2 flex items-center gap-3">
              <Progress value={progress} className="h-1.5 flex-1" />
              <span className="shrink-0 text-[11px] text-muted-foreground">{completedStepCount}/{TOTAL_PIPELINE_STEPS} · {progress}%</span>
            </div>
          )}
        </div>

        {/* Pending approval (compact) */}
        {pendingApproval && (
          <div className="shrink-0">
            <ApprovalCard
              approvalId={pendingApproval.id}
              stepName={pendingApproval.step_name}
              requestedAt={pendingApproval.requested_at}
              onResolved={() => { refetchAll(); refetchApprovals(); }}
            />
          </div>
        )}

        {/* Document grid */}
        <div className="min-h-0 flex-1">
          <p className="mb-3 text-xs font-medium text-muted-foreground">Documents ({documents.length}/{ALL_DOC_TYPES.length})</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {ALL_DOC_TYPES.map((type) => {
              const doc = docMap.get(type);
              const Icon = DOC_TYPE_ICON_MAP[type] ?? FileText;
              const color = DOC_TYPE_COLORS[type] ?? "#6366F1";
              const label = DOC_TYPE_LABELS[type] ?? type;
              const available = !!doc;

              return (
                <button
                  key={type}
                  onClick={() => doc && setOpenDoc(doc)}
                  disabled={!available}
                  className={cn(
                    "group relative flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-all",
                    available
                      ? "cursor-pointer border-surface-4 bg-surface-1 hover:border-primary/25 hover:bg-surface-2"
                      : "cursor-default border-dashed border-surface-4/60 bg-surface-0 opacity-40",
                  )}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{ backgroundColor: available ? `${color}15` : undefined }}
                  >
                    <Icon className="h-5 w-5" style={{ color: available ? color : undefined }} />
                  </div>
                  <span className="text-[11px] font-medium leading-tight">{label}</span>
                  {available ? (
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[9px]">{doc.agent_type}</Badge>
                      <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Pending</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Workflow error */}
        {workflow?.error_message && (
          <div className="shrink-0 rounded-xl border border-nova-red/20 bg-nova-red/5 px-4 py-3">
            <p className="text-xs font-medium text-nova-red">Workflow Error</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{workflow.error_message}</p>
          </div>
        )}
      </div>

      {/* Document modal overlay */}
      <AnimatePresence>
        {openDoc && (
          <DocumentModal doc={openDoc} onClose={() => setOpenDoc(null)} />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Document Modal ───────────────────────────────────────

function DocumentModal({ doc, onClose }: { doc: DocumentResponse; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const color = DOC_TYPE_COLORS[doc.doc_type] ?? "#6366F1";
  const Icon = DOC_TYPE_ICON_MAP[doc.doc_type] ?? FileText;

  function handleCopy() {
    navigator.clipboard.writeText(JSON.stringify(doc.content, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col border-l border-surface-4 bg-surface-0"
      >
        {/* Modal header */}
        <div className="flex shrink-0 items-center justify-between border-b border-surface-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${color}15` }}
            >
              <Icon className="h-4 w-4" style={{ color }} />
            </div>
            <div>
              <h3 className="text-sm font-bold">{doc.title || DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}</h3>
              <div className="mt-0.5 flex items-center gap-2">
                <Badge variant="secondary" className="text-[9px]">{doc.agent_type}</Badge>
                <span className="text-[10px] text-muted-foreground">v{doc.version} · {new Date(doc.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex h-7 items-center gap-1.5 rounded-md border border-surface-4 px-2.5 text-[11px] text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              {copied ? <CheckCircle2 className="h-3 w-3 text-nova-success" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <StructuredContent content={doc.content} />
        </div>
      </motion.div>
    </>
  );
}

// ── Structured Content ───────────────────────────────────

function StructuredContent({ content }: { content: Record<string, unknown> }) {
  if (!content || Object.keys(content).length === 0) {
    return <p className="text-xs text-muted-foreground">No content available</p>;
  }
  return (
    <div className="space-y-5">
      {Object.entries(content).map(([key, value]) => (
        <div key={key}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary/60">{key.replace(/_/g, " ")}</p>
          <ContentValue value={value} />
        </div>
      ))}
    </div>
  );
}

function ContentValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <p className="text-xs text-muted-foreground">—</p>;
  if (typeof value === "string") return <p className="whitespace-pre-wrap text-xs leading-relaxed">{value}</p>;
  if (typeof value === "number" || typeof value === "boolean") return <p className="font-mono text-xs">{String(value)}</p>;
  if (Array.isArray(value)) {
    return (
      <ul className="space-y-1 pl-3">
        {value.map((item, i) => (
          <li key={i} className="relative text-xs before:absolute before:-left-2.5 before:top-1.5 before:h-1 before:w-1 before:rounded-full before:bg-primary/40">
            {typeof item === "string"
              ? item
              : typeof item === "object" && item !== null && "name" in item
                ? String((item as Record<string, unknown>).name)
                : JSON.stringify(item)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === "object") {
    return <pre className="mt-1 overflow-auto rounded-lg bg-surface-3 p-3 font-mono text-[11px] leading-relaxed">{JSON.stringify(value, null, 2)}</pre>;
  }
  return <p className="text-xs">{String(value)}</p>;
}

// ── Approval Card ────────────────────────────────────────

function ApprovalCard({ approvalId, stepName, requestedAt, onResolved }: { approvalId: string; stepName: string; requestedAt: string; onResolved: () => void }) {
  const [notes, setNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  async function handleDecision(decision: "approved" | "rejected" | "revision_requested") {
    setResolving(true);
    try { await resolveApproval(approvalId, { decision, notes: notes.trim() || undefined }); onResolved(); } finally { setResolving(false); }
  }

  return (
    <div className="rounded-xl border border-nova-warning/20 bg-nova-warning/5 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-nova-warning" />
          <h3 className="text-xs font-semibold">Approval Required</h3>
          <span className="text-[11px] text-muted-foreground">· {stepName}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{new Date(requestedAt).toLocaleString()}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)..." rows={1} className="h-8 min-h-0 flex-1 text-xs" />
        <Button size="sm" onClick={() => handleDecision("approved")} disabled={resolving} className="h-7 gap-1 text-xs">
          <CheckCircle2 className="h-3 w-3" /> Approve
        </Button>
        <Button size="sm" variant="outline" onClick={() => handleDecision("revision_requested")} disabled={resolving} className="h-7 gap-1 text-xs">
          <RotateCcw className="h-3 w-3" /> Revise
        </Button>
        <Button size="sm" variant="destructive" onClick={() => handleDecision("rejected")} disabled={resolving} className="h-7 gap-1 text-xs">
          <XCircle className="h-3 w-3" /> Reject
        </Button>
      </div>
    </div>
  );
}
