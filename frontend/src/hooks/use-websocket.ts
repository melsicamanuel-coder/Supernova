"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SupernovaWS, type WSEvent, type WSStatus } from "@/lib/ws";

const REFETCH_EVENTS = new Set([
  "step_started",
  "step_completed",
  "approval_requested",
  "workflow_paused",
  "workflow_completed",
  "workflow_failed",
  "workflow_rejected",
  "workflow_revision_requested",
]);

export function useWebSocket(
  projectId: string | null,
  onRefetch?: () => void,
) {
  const [events, setEvents] = useState<WSEvent[]>([]);
  const [status, setStatus] = useState<WSStatus>("disconnected");
  const wsRef = useRef<SupernovaWS | null>(null);
  const refetchRef = useRef(onRefetch);
  refetchRef.current = onRefetch;

  useEffect(() => {
    if (!projectId) return;

    const ws = new SupernovaWS(projectId);
    wsRef.current = ws;

    ws.onStatusChange(setStatus);

    ws.onEvent((event) => {
      setEvents((prev) => [...prev.slice(-99), event]);
      if (REFETCH_EVENTS.has(event.type) && refetchRef.current) {
        refetchRef.current();
      }
    });

    ws.connect();

    return () => {
      ws.disconnect();
      wsRef.current = null;
    };
  }, [projectId]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return {
    events,
    status,
    connected: status === "connected",
    clearEvents,
  };
}
