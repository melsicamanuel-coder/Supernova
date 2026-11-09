"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApi } from "@/hooks/use-api";
import { listApprovals, resolveApproval } from "@/lib/api";
import type { ApprovalResponse } from "@/types/approval";
import { cn } from "@/lib/utils";

const STATUS_META: Record<string, { icon: React.ReactNode; variant: "default" | "secondary" | "outline" | "destructive"; color: string }> = {
  pending: { icon: <Clock className="h-3 w-3" />, variant: "default", color: "text-nova-warning" },
  approved: { icon: <CheckCircle2 className="h-3 w-3" />, variant: "secondary", color: "text-nova-success" },
  rejected: { icon: <XCircle className="h-3 w-3" />, variant: "destructive", color: "text-nova-red" },
  revision_requested: { icon: <RotateCcw className="h-3 w-3" />, variant: "outline", color: "text-nova-blue" },
};

export default function ApprovalsPage() {
  const { data: allApprovals, loading, refetch } = useApi<ApprovalResponse[]>(() => listApprovals());
  const approvals = allApprovals ?? [];
  const pending = approvals.filter((a) => a.status === "pending");
  const resolved = approvals.filter((a) => a.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Approval Center</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Review and approve workflow outputs before final delivery.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-2" />)}
        </div>
      ) : approvals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-4 bg-surface-1 py-12 text-center">
          <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No approvals yet.</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Approvals are created when workflows reach the human approval gate.</p>
        </div>
      ) : (
        <Tabs defaultValue={pending.length > 0 ? "pending" : "all"}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-1.5">
              Pending
              {pending.length > 0 && <Badge variant="default" className="ml-1 h-5 min-w-[20px] px-1.5 text-[10px]">{pending.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="all">All ({approvals.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4 space-y-3">
            {pending.length === 0 ? (
              <div className="rounded-xl border border-surface-4 bg-surface-1 py-8 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-nova-success" />
                <p className="text-xs text-muted-foreground">All caught up! No pending approvals.</p>
              </div>
            ) : (
              pending.map((a) => <ApprovalActionCard key={a.id} approval={a} onResolved={refetch} />)
            )}
          </TabsContent>

          <TabsContent value="all" className="mt-4 space-y-3">
            {approvals.map((a) =>
              a.status === "pending"
                ? <ApprovalActionCard key={a.id} approval={a} onResolved={refetch} />
                : <ResolvedApprovalCard key={a.id} approval={a} />,
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ApprovalActionCard({ approval, onResolved }: { approval: ApprovalResponse; onResolved: () => void }) {
  const [notes, setNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  async function handleDecision(decision: "approved" | "rejected" | "revision_requested") {
    setResolving(true);
    try { await resolveApproval(approval.id, { decision, notes: notes.trim() || undefined }); onResolved(); } finally { setResolving(false); }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-nova-warning/20 bg-surface-1 transition-colors hover:border-nova-warning/30">
      <div className="border-b border-surface-4 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-nova-warning" />
            <span className="text-sm font-medium">{approval.step_name}</span>
          </div>
          <Badge variant="default" className="gap-1 text-[10px]"><Clock className="h-3 w-3" /> pending</Badge>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">Requested {new Date(approval.requested_at).toLocaleString()}</p>
      </div>
      <div className="space-y-3 px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Project:</span>
          <Link href={`/projects/${approval.project_id}`} className="font-mono text-primary hover:underline">{approval.project_id.slice(0, 8)}...</Link>
        </div>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reviewer notes (optional)..." rows={2} className="text-xs" />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleDecision("approved")} disabled={resolving} className="h-7 gap-1.5 text-xs"><CheckCircle2 className="h-3 w-3" /> Approve</Button>
          <Button size="sm" variant="outline" onClick={() => handleDecision("revision_requested")} disabled={resolving} className="h-7 gap-1.5 text-xs"><RotateCcw className="h-3 w-3" /> Revise</Button>
          <Button size="sm" variant="destructive" onClick={() => handleDecision("rejected")} disabled={resolving} className="h-7 gap-1.5 text-xs"><XCircle className="h-3 w-3" /> Reject</Button>
        </div>
      </div>
    </motion.div>
  );
}

function ResolvedApprovalCard({ approval }: { approval: ApprovalResponse }) {
  const meta = STATUS_META[approval.status] ?? STATUS_META.pending;
  return (
    <div className="flex items-center justify-between rounded-xl border border-surface-4 bg-surface-1 px-4 py-3 transition-colors hover:border-surface-4/80">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium">{approval.step_name}</p>
          <Badge variant={meta.variant} className="gap-1 text-[10px]">{meta.icon}{approval.status.replace("_", " ")}</Badge>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {approval.resolved_at ? `Resolved ${new Date(approval.resolved_at).toLocaleString()}` : `Requested ${new Date(approval.requested_at).toLocaleString()}`}
        </p>
        {approval.reviewer_notes && <p className="mt-1 text-[11px] italic text-muted-foreground">&ldquo;{approval.reviewer_notes}&rdquo;</p>}
      </div>
      <Link href={`/projects/${approval.project_id}`}>
        <Button size="sm" variant="ghost" className="h-7 text-xs">View Project</Button>
      </Link>
    </div>
  );
}
