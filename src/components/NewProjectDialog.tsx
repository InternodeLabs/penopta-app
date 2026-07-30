"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import type { ThreadOption } from "@/components/ManageProjectThreads";
import {
  createProjectAction,
  type ProjectVisibility,
} from "@/lib/projects/actions";

const MIN_THREADS = 2;

/** Name + thread picker for creating a project. Requires at least two threads. */
export function NewProjectDialog({
  open,
  onClose,
  threads,
}: {
  open: boolean;
  onClose: () => void;
  threads: ThreadOption[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<ProjectVisibility>("private");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  function close() {
    if (pending) return;
    setName("");
    setVisibility("private");
    setSelected(new Set());
    onClose();
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.size < MIN_THREADS) {
      toast.error("Select at least two agent threads.");
      return;
    }
    startTransition(async () => {
      const result = await createProjectAction(
        name,
        Array.from(selected),
        visibility,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Project created");
      setName("");
      setVisibility("private");
      setSelected(new Set());
      onClose();
      router.push(`/projects/${result.id}`);
    });
  }

  const canCreate = name.trim().length > 0 && selected.size >= MIN_THREADS;

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Start a project"
      onClick={close}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl border border-border bg-surface shadow-xl"
      >
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight">
            Start a project
          </h2>
          <p className="mt-1 text-sm text-muted">
            Name your project and pick at least two agent threads.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <label
            htmlFor="project-name"
            className="block text-sm font-medium text-foreground"
          >
            Project name
          </label>
          <input
            id="project-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Q3 Launch"
            className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-accent"
          />

          <p className="mt-5 text-sm font-medium text-foreground">Visibility</p>
          <div className="mt-2 space-y-2">
            {(
              [
                {
                  value: "private" as const,
                  label: "Private",
                  description: "Only you can see this project.",
                },
                {
                  value: "public" as const,
                  label: "Public",
                  description: "Everyone in this org can see it.",
                },
              ] as const
            ).map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
                  visibility === option.value
                    ? "border-foreground/25 bg-background"
                    : "border-border hover:bg-background"
                }`}
              >
                <input
                  type="radio"
                  name="new-project-visibility"
                  value={option.value}
                  checked={visibility === option.value}
                  onChange={() => setVisibility(option.value)}
                  className="mt-1 h-3.5 w-3.5 shrink-0 accent-accent"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-muted">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <p className="mt-5 text-sm font-medium text-foreground">
            Agent threads
            <span className="ml-1.5 font-normal text-muted">
              ({selected.size} selected · {MIN_THREADS} required)
            </span>
          </p>

          {threads.length === 0 ? (
            <p className="mt-3 text-sm text-muted">
              No agent threads yet. Connect an agent to get started.
            </p>
          ) : (
            <ul className="mt-2 space-y-0.5">
              {threads.map((thread) => {
                const checked = selected.has(thread.id);
                return (
                  <li key={thread.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition hover:bg-background">
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
            type="submit"
            disabled={pending || !canCreate}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create project"}
          </button>
        </div>
      </form>
    </div>
  );
}
