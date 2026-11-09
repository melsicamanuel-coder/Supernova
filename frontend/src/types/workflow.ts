export interface WorkflowStepResponse {
  id: string;
  workflow_run_id: string;
  agent_type: string;
  node_name: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  output_data: Record<string, unknown> | null;
  error_message: string | null;
  duration_ms: number | null;
  retry_count: number;
  provider_used: string | null;
  model_used: string | null;
  token_usage: { input: number; output: number } | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface WorkflowRunResponse {
  id: string;
  project_id: string;
  status:
    | "pending"
    | "running"
    | "paused"
    | "awaiting_approval"
    | "completed"
    | "failed"
    | "cancelled";
  current_node: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  steps: WorkflowStepResponse[];
}
