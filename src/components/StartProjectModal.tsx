"use client";

import { FolderPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { createProjectAction } from "@/lib/projects/actions";

/** Empty-state card + dialog for starting a project once agents are connected. */
export function StartProjectModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createProjectAction(name);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Project created");
      setOpen(false);
      setName("");
      router.push(`/projects/${result.id}`);
    });
  }

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

      {open ? (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Start a project"
          onClick={() => !pending && setOpen(false)}
        >
          <form
            onSubmit={submit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold tracking-tight">
              Start a project
            </h2>
            <p className="mt-1 text-sm text-muted">
              Name your project. You can add threads to it next.
            </p>
            <label
              htmlFor="project-name"
              className="mt-4 block text-sm font-medium text-foreground"
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
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-background disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || !name.trim()}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {pending ? "Creating…" : "Create project"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
