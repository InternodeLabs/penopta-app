"use client";

import { Check, Pencil, Share2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { deleteProjectAction, renameProjectAction } from "@/lib/projects/actions";

/** Project detail header with inline name editing for the owner. */
export function ProjectHeader({
  projectId,
  name,
}: {
  projectId: string;
  name: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(name);
  }, [name]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function cancel() {
    setValue(name);
    setEditing(false);
  }

  function save() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === name) {
      cancel();
      return;
    }
    startTransition(async () => {
      const result = await renameProjectAction(projectId, trimmed);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function remove() {
    startDelete(async () => {
      const result = await deleteProjectAction(projectId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Project deleted");
      router.push("/");
    });
  }

  return (
    <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-surface px-6">
      {editing ? (
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          disabled={pending}
          maxLength={120}
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-base font-semibold tracking-tight outline-none focus:border-accent disabled:opacity-60"
        />
      ) : (
        <h1 className="truncate text-base font-semibold tracking-tight">
          {name}
        </h1>
      )}

      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition hover:bg-background disabled:opacity-60"
            >
              <X aria-hidden className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-3 text-sm font-medium text-background transition hover:opacity-90 disabled:opacity-60"
            >
              <Check aria-hidden className="h-4 w-4" />
              {pending ? "Saving…" : "Save"}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition hover:bg-background"
            >
              <Share2 aria-hidden className="h-4 w-4" />
              Share
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-3 text-sm font-medium text-background transition hover:opacity-90"
            >
              <Pencil aria-hidden className="h-4 w-4" />
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              title="Delete project"
              aria-label="Delete project"
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-surface px-2.5 text-sm font-medium text-danger transition hover:bg-danger/10"
            >
              <Trash2 aria-hidden className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {confirmingDelete ? (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Delete project"
          onClick={() => !deleting && setConfirmingDelete(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold tracking-tight">
              Delete project
            </h2>
            <p className="mt-1 text-sm text-muted">
              Delete <span className="font-medium text-foreground">{name}</span>?
              This removes the project and its thread links. Your agent threads
              themselves are not deleted. This can’t be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-background disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={deleting}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-danger px-4 text-sm font-semibold text-danger-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Delete project"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
