"use client";

import Link from "next/link";
import { GitBranch, ArrowRight, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useApi } from "@/hooks/use-api";
import { listProjects } from "@/lib/api";
import type { ProjectListResponse } from "@/types/project";

export default function WorkflowExplorerPage() {
  const { data, loading } = useApi<ProjectListResponse>(listProjects);
  const projects = (data?.items ?? []).filter((p) => p.status !== "draft");

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-primary">
          <ChevronLeft className="h-3 w-3" /> Workflow Explorer
        </p>
        <h2 className="text-lg font-semibold">Workflow Pipelines</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          View and monitor agent workflow pipelines across all projects.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-surface-2" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-4 bg-surface-1 py-12 text-center">
          <GitBranch className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No workflows yet.</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Create a project and start a workflow to see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <Link key={p.id} href={`/workflow/${p.id}`}>
              <div className="flex items-center justify-between rounded-xl border border-surface-4 bg-surface-1 px-4 py-3 transition-colors hover:border-primary/20">
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Updated {new Date(p.updated_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {p.status}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
