export interface AgentInfo {
  type: string;
  name: string;
  description: string;
  status: "idle" | "running" | "completed" | "failed";
  current_project_id: string | null;
  total_executions: number;
  avg_duration_ms: number | null;
  last_executed_at: string | null;
}

export interface AgentListResponse {
  agents: AgentInfo[];
}

export const AGENT_TYPES = [
  "ceo",
  "research",
  "cpo",
  "cto",
  "engineering",
  "qa",
] as const;

export type AgentType = (typeof AGENT_TYPES)[number];

export const AGENT_LABELS: Record<AgentType, string> = {
  ceo: "CEO",
  research: "Research",
  cpo: "CPO",
  cto: "CTO",
  engineering: "Engineering",
  qa: "QA",
};
