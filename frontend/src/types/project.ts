export interface ProjectResponse {
  id: string;
  name: string;
  description: string;
  idea_text: string;
  status: "draft" | "active" | "paused" | "completed" | "failed";
  config: Record<string, unknown> | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  idea_text: string;
  config?: Record<string, unknown>;
}

export interface ProjectListResponse {
  items: ProjectResponse[];
  total: number;
}
