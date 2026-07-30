"use client";

import { useState } from "react";

import type { ThreadOption } from "@/components/ManageProjectThreads";
import { NewProjectDialog } from "@/components/NewProjectDialog";

/** Sidebar "Add new Project" button. Opens a name + threads dialog. */
export function AddProjectButton({
  enabled,
  threads,
}: {
  enabled: boolean;
  threads: ThreadOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!enabled}
        title={
          enabled
            ? "Create a new project"
            : "Connect at least two agent threads first"
        }
        className={`flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-sm font-medium transition ${
          enabled
            ? "text-foreground hover:bg-background"
            : "cursor-not-allowed text-muted opacity-70"
        } disabled:opacity-60`}
      >
        <span aria-hidden>+</span>
        Add new Project
      </button>

      <NewProjectDialog
        open={open}
        onClose={() => setOpen(false)}
        threads={threads}
      />
    </>
  );
}
