export interface ApprovalResponse {
  id: string;
  project_id: string;
  workflow_run_id: string;
  step_name: string;
  status: "pending" | "approved" | "rejected" | "revision_requested";
  decision: string | null;
  reviewer_notes: string | null;
  output_snapshot: Record<string, unknown> | null;
  requested_at: string;
  resolved_at: string | null;
  created_at: string;
}

export interface ApprovalResolve {
  decision: "approved" | "rejected" | "revision_requested";
  notes?: string;
}
