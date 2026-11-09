"use client";

import { useCallback } from "react";
import { getProject, getWorkflow, listDocuments, listApprovals, type DocumentResponse } from "@/lib/api";
import type { ProjectResponse } from "@/types/project";
import type { WorkflowRunResponse } from "@/types/workflow";
import type { ApprovalResponse } from "@/types/approval";
import { useApi } from "./use-api";
import { useWebSocket } from "./use-websocket";

export function useProject(projectId: string) {
  const {
    data: project,
    loading: projectLoading,
    error: projectError,
    refetch: refetchProject,
  } = useApi<ProjectResponse>(() => getProject(projectId));

  const {
    data: workflow,
    loading: workflowLoading,
    error: workflowError,
    refetch: refetchWorkflow,
  } = useApi<WorkflowRunResponse>(() => getWorkflow(projectId));

  const {
    data: documents,
    loading: docsLoading,
    refetch: refetchDocs,
  } = useApi<DocumentResponse[]>(() => listDocuments(projectId));

  const {
    data: approvals,
    loading: approvalsLoading,
    refetch: refetchApprovals,
  } = useApi<ApprovalResponse[]>(() => listApprovals({ projectId }));

  const refetchAll = useCallback(() => {
    refetchProject();
    refetchWorkflow();
    refetchDocs();
    refetchApprovals();
  }, [refetchProject, refetchWorkflow, refetchDocs, refetchApprovals]);

  const { events, connected, status: wsStatus } = useWebSocket(projectId, refetchAll);

  return {
    project,
    workflow,
    documents: documents ?? [],
    approvals: approvals ?? [],
    events,
    connected,
    wsStatus,
    loading: projectLoading || docsLoading || approvalsLoading,
    error: projectError,
    refetchAll,
    refetchWorkflow,
    refetchDocs,
    refetchApprovals,
  };
}
