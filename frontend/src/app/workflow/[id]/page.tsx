"use client";

import { use, Suspense } from "react";
import { WorkflowVisualizer } from "./workflow-visualizer";

function WorkflowContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <WorkflowVisualizer projectId={id} />;
}

export default function WorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={<p className="text-muted-foreground">Loading workflow...</p>}
    >
      <WorkflowContent params={params} />
    </Suspense>
  );
}
