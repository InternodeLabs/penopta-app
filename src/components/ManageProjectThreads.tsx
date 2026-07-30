"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { setProjectThreadsAction } from "@/lib/projects/actions";

export type ThreadOption = {
  id: string;
  title: string;
  lastAgentName: string;
  status: string;
  ownerName: string;
};

/** Sidebar control + dialog to choose which agent threads belong to a project. */
export function ManageProjectThreads({
  projectId,
  threads,
  selectedIds,
}: {
  projectId: string;
  threads: ThreadOption[];
  selectedIds: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedIds));
  const [pending, startTransition] = useTransition();

  function openDialog() {
    setSelected(new Set(selectedIds));
    setOpen(true);
  }

  function close() {
    if (pending) return;
    setOpen(false);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      const result = await setProjectThreadsAction(
        projectId,
        Array.from(selected),
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Threads updated");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        aria-label="Add threads"
        title="Add threads"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-muted transition hover:bg-black/5 hover:text-foreground"
      >
        <Plus aria-hidden className="h-3.5 w-3.5" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Add threads to project"
          onClick={close}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-border bg-surface shadow-xl"
          >
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-lg font-semibold tracking-tight">
                Add threads
              </h2>
              <p className="mt-1 text-sm text-muted">
                Choose which agent threads are part of this project.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
              {threads.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted">
                  No agent threads yet. Connect an agent to get started.
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {threads.map((thread) => {
                    const checked = selected.has(thread.id);
                    return (
                      <li key={thread.id}>
                        <label className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 transition hover:bg-background">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(thread.id)}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-foreground">
                              {thread.title || "Untitled thread"}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-muted">
                              {thread.ownerName} · {thread.lastAgentName} ·{" "}
                              {thread.status}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-background disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={pending}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
