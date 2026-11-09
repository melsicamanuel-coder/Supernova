"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Rocket, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProject } from "@/lib/api";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ideaText, setIdeaText] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [constraints, setConstraints] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !ideaText.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const config: Record<string, unknown> = {};
      if (targetAudience.trim()) config.target_audience = targetAudience.trim();
      if (constraints.trim()) config.constraints = constraints.trim();

      const project = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        idea_text: ideaText.trim(),
        config: Object.keys(config).length > 0 ? config : undefined,
      });
      router.push(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Button variant="ghost" size="sm" className="gap-2 text-xs" onClick={() => router.back()}>
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Button>

      <div className="rounded-xl border border-surface-4 bg-surface-1 p-6">
        <div className="mb-5 flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          <h2 className="text-base font-bold">Create New Project</h2>
        </div>
        <p className="mb-6 text-xs text-muted-foreground">
          Describe your idea and let the AI agents transform it into a structured engineering plan.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs">Project Name <span className="text-destructive">*</span></Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Product Idea" required className="bg-surface-2 text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs">Description</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief project description" className="bg-surface-2 text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="idea" className="text-xs">Product Idea <span className="text-destructive">*</span></Label>
            <Textarea id="idea" value={ideaText} onChange={(e) => setIdeaText(e.target.value)}
              placeholder="Describe your product idea in detail. Include the problem it solves, key features, and what makes it unique..."
              rows={8} required className="bg-surface-2 text-sm" />
            <p className="text-[11px] text-muted-foreground">
              Be as detailed as possible. The agents will analyze through executive, research, product, technical, engineering, and QA perspectives.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="audience" className="text-xs">Target Audience</Label>
            <Textarea id="audience" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="Who is this product for? Describe your target users..." rows={3} className="bg-surface-2 text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="constraints" className="text-xs">Constraints &amp; Requirements</Label>
            <Textarea id="constraints" value={constraints} onChange={(e) => setConstraints(e.target.value)}
              placeholder="Budget constraints, timeline, technology preferences..." rows={3} className="bg-surface-2 text-sm" />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-3 pt-1">
            <Button type="submit" disabled={submitting} className="h-8 gap-2 text-xs">
              <Rocket className="h-3.5 w-3.5" /> {submitting ? "Creating..." : "Launch Project"}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()} className="h-8 border-surface-4 text-xs">Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
