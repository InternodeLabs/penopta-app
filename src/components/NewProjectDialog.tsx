"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import type {
  SourceProjectOption,
  ThreadOption,
} from "@/components/ManageProjectThreads";
import {
  filterSourceProjects,
  filterThreads,
  MembershipFilterInput,
  MembershipTabBar,
  SourceProjectMembershipList,
  ThreadMembershipList,
  type MembershipTab,
} from "@/components/ProjectMembershipPicker";
import { VisibilityField } from "@/components/VisibilityField";
import {
  createProjectAction,
  type ProjectVisibility,
} from "@/lib/projects/actions";

const MIN_THREADS = 2;

/** Name + tabbed source-project / thread picker for creating a Penopta project. */
export function NewProjectDialog({
  open,
  onClose,
  threads,
  sourceProjects = [],
}: {
  open: boolean;
  onClose: () => void;
  threads: ThreadOption[];
  sourceProjects?: SourceProjectOption[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<ProjectVisibility>("public");
  const [tab, setTab] = useState<MembershipTab>("threads");
  const [filter, setFilter] = useState("");
  const [selectedThreads, setSelectedThreads] = useState<Set<string>>(
    new Set(),
  );
  const [selectedSources, setSelectedSources] = useState<Set<string>>(
    new Set(),
  );
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  const filteredThreads = filterThreads(threads, filter);
  const filteredProjects = filterSourceProjects(sourceProjects, filter);

  function close() {
    if (pending) return;
    setName("");
    setVisibility("public");
    setTab("threads");
    setFilter("");
    setSelectedThreads(new Set());
    setSelectedSources(new Set());
    onClose();
  }

  function changeTab(next: MembershipTab) {
    setTab(next);
    setFilter("");
  }

  function toggleThread(id: string) {
    setSelectedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSource(id: string) {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const hasEnough =
    selectedSources.size >= 1 || selectedThreads.size >= MIN_THREADS;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasEnough) {
      toast.error(
        "Select a source project or at least two of your agent threads.",
      );
      return;
    }
    startTransition(async () => {
      const result = await createProjectAction(
        name,
        Array.from(selectedThreads),
        visibility,
        Array.from(selectedSources),
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Project created");
      setName("");
      setVisibility("public");
      setTab("threads");
      setFilter("");
      setSelectedThreads(new Set());
      setSelectedSources(new Set());
      onClose();
      router.push(`/projects/${result.id}`);
    });
  }

  const canCreate = name.trim().length > 0 && hasEnough;

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
            Name your project, then include source projects and/or individual
            threads.
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

          <div className="mt-5">
            <VisibilityField
              value={visibility}
              onChange={setVisibility}
              disabled={pending}
              name="new-project-visibility"
            />
          </div>

          <div className="mt-5 space-y-3">
            <MembershipTabBar
              tab={tab}
              onChange={changeTab}
              threadCount={selectedThreads.size}
              projectCount={selectedSources.size}
            />
            <MembershipFilterInput
              value={filter}
              onChange={setFilter}
              placeholder={
                tab === "projects" ? "Filter projects…" : "Filter threads…"
              }
            />
          </div>

          <div className="mt-3" role="tabpanel">
            {tab === "projects" ? (
              <>
                <p className="mb-2 text-xs text-muted">
                  New threads in a selected source project stay included
                  automatically.
                </p>
                <SourceProjectMembershipList
                  projects={filteredProjects}
                  selected={selectedSources}
                  onToggle={toggleSource}
                  emptyMessage={
                    filter.trim()
                      ? "No projects match that filter."
                      : "No source projects yet. Sync from Penopta Sync or the hourly skill first — or use the Threads tab."
                  }
                />
              </>
            ) : (
              <>
                <p className="mb-2 text-xs text-muted">
                  {selectedSources.size === 0
                    ? `Select at least ${MIN_THREADS} threads, or switch to Projects.`
                    : "Optional — add individual threads beyond source projects."}
                </p>
                <ThreadMembershipList
                  threads={filteredThreads}
                  selected={selectedThreads}
                  onToggle={toggleThread}
                  emptyMessage={
                    filter.trim()
                      ? "No threads match that filter."
                      : "No agent threads of yours yet. Connect an agent to get started."
                  }
                />
              </>
            )}
          </div>
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
