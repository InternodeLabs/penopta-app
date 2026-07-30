"use client";

import { useState } from "react";

import { NewProjectDialog } from "@/components/NewProjectDialog";

/** Sidebar "Add new Project" button. Opens a name-required dialog. */
export function AddProjectButton({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!enabled}
        title={enabled ? "Create a new project" : "Connect an agent first"}
        className={`flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-sm font-medium transition ${
          enabled
            ? "text-foreground hover:bg-background"
            : "cursor-not-allowed text-muted opacity-70"
        } disabled:opacity-60`}
      >
        <span aria-hidden>+</span>
        Add new Project
      </button>

      <NewProjectDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
