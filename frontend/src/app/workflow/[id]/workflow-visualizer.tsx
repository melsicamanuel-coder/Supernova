"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Wifi,
  WifiOff,
  Briefcase,
  Search,
  ClipboardList,
  Server,
  Wrench,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useProject } from "@/hooks/use-project";
import type { WorkflowStepResponse } from "@/types/workflow";
import { cn } from "@/lib/utils";

const PIPELINE = [
  { id: "ceo_evaluate", label: "CEO Evaluation", agent: "ceo", icon: Briefcase, hex: "#F59E0B" },
  { id: "research", label: "Market Research", agent: "research", icon: Search, hex: "#06B6D4" },
  { id: "cpo_define", label: "Product Definition", agent: "cpo", icon: ClipboardList, hex: "#8B5CF6" },
  { id: "cto_design", label: "Tech Architecture", agent: "cto", icon: Server, hex: "#10B981" },
  { id: "eng_plan", label: "Engineering Plan", agent: "engineering", icon: Wrench, hex: "#FB7185" },
  { id: "qa_plan", label: "QA Strategy", agent: "qa", icon: ShieldCheck, hex: "#6366F1" },
  { id: "ceo_review", label: "CEO Final Review", agent: "ceo", icon: Briefcase, hex: "#F59E0B" },
  { id: "approval_gate", label: "Human Approval", agent: "human", icon: UserCheck, hex: "#F59E0B" },
] as const;

type NodeStatus = "pending" | "active" | "completed" | "failed" | "skipped";

function getNodeStatus(nodeId: string, steps: WorkflowStepResponse[], currentNode: string | null, wfStatus: string): NodeStatus {
  const step = steps.find((s) => s.node_name === nodeId);
  if (step) {
    if (step.status === "completed") return "completed";
    if (step.status === "failed") return "failed";
    if (step.status === "running") return "active";
    if (step.status === "skipped") return "skipped";
  }
  if (currentNode === nodeId) return "active";
  if (wfStatus === "completed") return "completed";
  return "pending";
}

const statusStyles: Record<NodeStatus, { border: string; bg: string; icon: React.ReactNode }> = {
  pending: { border: "#1E293B", bg: "#0B0F1B", icon: <Circle className="h-3.5 w-3.5 text-muted-foreground/40" /> },
  active: { border: "#6366F1", bg: "#0B0F1B", icon: <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> },
  completed: { border: "#10B981", bg: "#0B0F1B", icon: <CheckCircle2 className="h-3.5 w-3.5 text-nova-success" /> },
  failed: { border: "#EF4444", bg: "#1a0a0a", icon: <AlertCircle className="h-3.5 w-3.5 text-nova-red" /> },
  skipped: { border: "#334155", bg: "#0B0F1B", icon: <Circle className="h-3.5 w-3.5 text-muted-foreground/20" /> },
};

function PipelineNode({ data }: { data: { label: string; agent: string; status: NodeStatus; hex: string; icon: React.ElementType; step?: WorkflowStepResponse; onSelect: () => void } }) {
  const st = statusStyles[data.status];
  const Icon = data.icon;
  return (
    <div
      onClick={data.onSelect}
      className="cursor-pointer"
      style={{
        background: st.bg,
        border: `1.5px solid ${st.border}`,
        borderRadius: 12,
        padding: "10px 16px",
        minWidth: 180,
        boxShadow: data.status === "active" ? `0 0 20px -4px ${data.hex}40` : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} className="!bg-surface-4 !border-none !w-2 !h-2" />
      <div className="flex items-center gap-2.5">
        {st.icon}
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5" style={{ color: data.hex }} />
          <span className="text-xs font-medium text-foreground">{data.label}</span>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>{data.agent} agent</span>
        {data.step?.duration_ms != null && (
          <span className="font-mono">{(data.step.duration_ms / 1000).toFixed(1)}s</span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-surface-4 !border-none !w-2 !h-2" />
    </div>
  );
}

const nodeTypes: NodeTypes = { pipeline: PipelineNode };

export function WorkflowVisualizer({ projectId }: { projectId: string }) {
  const { project, workflow, connected, loading } = useProject(projectId);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const { flowNodes, flowEdges } = useMemo(() => {
    const nodes: Node[] = PIPELINE.map((p, i) => {
      const status = workflow ? getNodeStatus(p.id, workflow.steps, workflow.current_node, workflow.status) : "pending";
      const step = workflow?.steps.find((s) => s.node_name === p.id);
      return {
        id: p.id,
        type: "pipeline",
        position: { x: 110, y: i * 90 },
        data: {
          label: p.label,
          agent: p.agent,
          status,
          hex: p.hex,
          icon: p.icon,
          step,
          onSelect: () => setSelectedNode(p.id),
        },
      };
    });
    const edges: Edge[] = PIPELINE.slice(0, -1).map((p, i) => {
      const sourceStatus = workflow ? getNodeStatus(p.id, workflow.steps, workflow.current_node, workflow.status) : "pending";
      return {
        id: `e-${p.id}-${PIPELINE[i + 1].id}`,
        source: p.id,
        target: PIPELINE[i + 1].id,
        animated: sourceStatus === "active",
        style: {
          stroke: sourceStatus === "completed" ? "#10B981" : sourceStatus === "active" ? "#6366F1" : "#1E293B",
          strokeWidth: 1.5,
        },
      };
    });
    return { flowNodes: nodes, flowEdges: edges };
  }, [workflow]);

  const [nodes, , onNodesChange] = useNodesState(flowNodes);
  const [edges, , onEdgesChange] = useEdgesState(flowEdges);

  const selectedStep = workflow?.steps.find((s) => s.node_name === selectedNode);
  const selectedPipeline = PIPELINE.find((p) => p.id === selectedNode);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 py-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-surface-2" />
        ))}
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="space-y-4 py-8">
        <p className="text-muted-foreground">No workflow found for this project.</p>
        <Link href={`/projects/${projectId}`}>
          <Button variant="outline" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back to project</Button>
        </Link>
      </div>
    );
  }

  const completedCount = workflow.steps.filter((s) => s.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/projects/${projectId}`}>
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h2 className="text-lg font-semibold">{project?.name ?? "Workflow"} Pipeline</h2>
            <p className="text-xs text-muted-foreground">{completedCount}/{PIPELINE.length} steps completed</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {connected ? <Wifi className="h-3.5 w-3.5 text-nova-success" /> : <WifiOff className="h-3.5 w-3.5" />}
            {connected ? "Live" : "Offline"}
          </div>
          <Badge variant="outline">{workflow.status}</Badge>
        </div>
      </div>

      {/* Flow + detail */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="h-[640px] overflow-hidden rounded-xl border border-surface-4 bg-surface-0">
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.3 }}
              minZoom={0.5}
              maxZoom={1.5}
              proOptions={{ hideAttribution: true }}
              className="[&_.react-flow__background]:!bg-surface-0"
            >
              <Background color="#1E293B" gap={30} size={1} />
              <Controls
                showInteractive={false}
                className="!bg-surface-2 !border-surface-4 !rounded-lg !shadow-lg [&_button]:!bg-surface-2 [&_button]:!border-surface-4 [&_button]:!text-muted-foreground [&_button:hover]:!bg-surface-3"
              />
            </ReactFlow>
          </div>
        </div>

        {/* Node detail */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-surface-4 bg-surface-1 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Node Details</h3>
              {selectedNode && (
                <button onClick={() => setSelectedNode(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <AnimatePresence mode="wait">
              {selectedNode && selectedPipeline ? (
                <motion.div key={selectedNode} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${selectedPipeline.hex}15` }}>
                      {(() => { const I = selectedPipeline.icon; return <I className="h-4 w-4" style={{ color: selectedPipeline.hex }} />; })()}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold">{selectedPipeline.label}</h4>
                      <p className="text-[11px] text-muted-foreground">{selectedPipeline.agent} agent</p>
                    </div>
                  </div>
                  {selectedStep && (
                    <div className="space-y-2 text-xs">
                      <DetailRow label="Status" value={selectedStep.status} />
                      {selectedStep.started_at && <DetailRow label="Started" value={new Date(selectedStep.started_at).toLocaleString()} />}
                      {selectedStep.completed_at && <DetailRow label="Completed" value={new Date(selectedStep.completed_at).toLocaleString()} />}
                      {selectedStep.duration_ms != null && <DetailRow label="Duration" value={`${(selectedStep.duration_ms / 1000).toFixed(1)}s`} />}
                      {selectedStep.provider_used && <DetailRow label="Provider" value={selectedStep.provider_used} />}
                      {selectedStep.model_used && <DetailRow label="Model" value={selectedStep.model_used} />}
                      {selectedStep.token_usage && (
                        <DetailRow label="Tokens" value={`${selectedStep.token_usage.input} in / ${selectedStep.token_usage.output} out`} />
                      )}
                      {selectedStep.error_message && (
                        <div className="rounded-lg bg-nova-red/10 p-2 text-xs text-nova-red">{selectedStep.error_message}</div>
                      )}
                    </div>
                  )}
                  {!selectedStep && <p className="text-xs text-muted-foreground">This step has not started yet.</p>}
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">Select a node</p>
                  <p className="text-[11px] text-muted-foreground/60">Click a pipeline node to inspect it</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Run details */}
          <div className="mt-4 rounded-xl border border-surface-4 bg-surface-1 p-4">
            <h3 className="mb-3 text-sm font-semibold">Run Details</h3>
            <div className="space-y-2 text-xs">
              <DetailRow label="Run ID" value={workflow.id} />
              <DetailRow label="Status" value={workflow.status} />
              <DetailRow label="Current Node" value={workflow.current_node ?? "—"} />
              <DetailRow label="Started" value={workflow.started_at ? new Date(workflow.started_at).toLocaleString() : "—"} />
              <DetailRow label="Completed" value={workflow.completed_at ? new Date(workflow.completed_at).toLocaleString() : "—"} />
              {workflow.error_message && <DetailRow label="Error" value={workflow.error_message} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-[60%] truncate font-mono">{value}</span>
    </div>
  );
}
