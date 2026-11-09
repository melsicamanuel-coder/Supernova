import type { ApprovalResolve, ApprovalResponse } from "@/types/approval";
import type { ProjectCreate, ProjectListResponse, ProjectResponse } from "@/types/project";
import type { WorkflowRunResponse } from "@/types/workflow";
import type { AgentInfo, AgentListResponse } from "@/types/agent";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Projects ──────────────────────────────────────────────

export function createProject(body: ProjectCreate) {
  return request<ProjectResponse>("/projects", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function listProjects(status?: string) {
  const q = status ? `?status=${status}` : "";
  return request<ProjectListResponse>(`/projects${q}`);
}

export function getProject(id: string) {
  return request<ProjectResponse>(`/projects/${id}`);
}

export function deleteProject(id: string) {
  return request<void>(`/projects/${id}`, { method: "DELETE" });
}

// ── Workflow ──────────────────────────────────────────────

export function getWorkflow(projectId: string) {
  return request<WorkflowRunResponse>(`/projects/${projectId}/workflow`);
}

export function startWorkflow(projectId: string) {
  return request<WorkflowRunResponse>(`/projects/${projectId}/workflow/start`, {
    method: "POST",
  });
}

export function pauseWorkflow(projectId: string) {
  return request<WorkflowRunResponse>(`/projects/${projectId}/workflow/pause`, {
    method: "POST",
  });
}

export function resumeWorkflow(projectId: string) {
  return request<WorkflowRunResponse>(
    `/projects/${projectId}/workflow/resume`,
    { method: "POST" }
  );
}

export function cancelWorkflow(projectId: string) {
  return request<WorkflowRunResponse>(
    `/projects/${projectId}/workflow/cancel`,
    { method: "POST" }
  );
}

// ── Agents ────────────────────────────────────────────────

export function listAgents() {
  return request<AgentListResponse>("/agents");
}

export function getAgent(type: string) {
  return request<AgentInfo>(`/agents/${type}`);
}

// ── Documents ─────────────────────────────────────────────

export interface DocumentResponse {
  id: string;
  project_id: string;
  doc_type: string;
  title: string;
  content: Record<string, unknown>;
  version: number;
  agent_type: string;
  workflow_step_id: string | null;
  created_at: string;
}

export function listDocuments(projectId: string) {
  return request<DocumentResponse[]>(`/projects/${projectId}/documents`);
}

export function getDocumentByType(projectId: string, docType: string) {
  return request<DocumentResponse>(
    `/projects/${projectId}/documents/${docType}`
  );
}

// ── Approvals ─────────────────────────────────────────────

export function listApprovals(opts?: { status?: string; projectId?: string }) {
  const params = new URLSearchParams();
  if (opts?.status) params.set("status", opts.status);
  if (opts?.projectId) params.set("project_id", opts.projectId);
  const q = params.toString() ? `?${params}` : "";
  return request<ApprovalResponse[]>(`/approvals${q}`);
}

export function getApproval(id: string) {
  return request<ApprovalResponse>(`/approvals/${id}`);
}

export function resolveApproval(id: string, body: ApprovalResolve) {
  return request<ApprovalResponse>(`/approvals/${id}/resolve`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ── Settings ──────────────────────────────────────────────

export interface SettingsResponse {
  active_provider: string;
  default_model: string;
  available_providers: string[];
  max_retries: number;
  request_timeout_s: number;
  fallback_to_mock: boolean;
}

export interface ProviderHealthResponse {
  provider: string;
  status: { healthy: boolean; latency_ms: number | null; error: string | null };
}

export function getSettings() {
  return request<SettingsResponse>("/settings");
}

export function getProviderHealth() {
  return request<ProviderHealthResponse>("/settings/health");
}

// ── Demo ──────────────────────────────────────────────────

export function startDemo() {
  return request<{ project_id: string; workflow_run_id: string }>(
    "/demo/start",
    { method: "POST" }
  );
}
