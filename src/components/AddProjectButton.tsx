"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { createProjectAction } from "@/lib/projects/actions";

/** Sidebar "Add new Project" button. Enabled once at least one thread exists. */
export function AddProjectButton({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function create() {
    startTransition(async () => {
      const result = await createProjectAction("Untitled Project");
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push(`/projects/${result.id}`);
    });
  }

  return (
    <button
      type="button"
      onClick={create}
      disabled={!enabled || pending}
      title={enabled ? "Create a new project" : "Connect an agent first"}
      className={`flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-sm font-medium transition ${
        enabled
          ? "text-foreground hover:bg-background"
          : "cursor-not-allowed text-muted opacity-70"
      } disabled:opacity-60`}
    >
      <span aria-hidden>+</span>
      {pending ? "Creating…" : "Add new Project"}
    </button>
  );
}
