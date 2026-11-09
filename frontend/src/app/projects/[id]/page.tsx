"use client";

import { use, Suspense } from "react";
import { ProjectWorkspace } from "./project-workspace";

function ProjectContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ProjectWorkspace id={id} />;
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={<p className="text-muted-foreground">Loading project...</p>}
    >
      <ProjectContent params={params} />
    </Suspense>
  );
}
