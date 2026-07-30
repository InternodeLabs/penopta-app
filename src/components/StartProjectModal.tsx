"use client";

import { FolderPlus } from "lucide-react";
import { useState } from "react";

import { NewProjectDialog } from "@/components/NewProjectDialog";

/** Empty-state card + dialog for starting a project once agents are connected. */
export function StartProjectModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface px-8 py-9 text-center shadow-sm">
        <FolderPlus
          aria-hidden
          className="mx-auto h-8 w-8 text-muted"
          strokeWidth={1.5}
        />
        <h1 className="mt-4 text-lg font-semibold tracking-tight">
          Start a project
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Group your agent threads into a project to organize and share the
          work.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg bg-accent text-sm font-semibold text-accent-foreground transition hover:opacity-90"
        >
          Start a project
        </button>
      </div>

      <NewProjectDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
