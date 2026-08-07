"use client";

import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { setProviderProjectTrackedAction } from "@/lib/integrations/actions";
import {
  PROVIDER_PROJECT_SOURCE_LABEL,
  type AvailableProviderProject,
} from "@/lib/integrations/provider-projects-view";

/** List available provider projects with track toggles. */
export function AvailableProjectsPanel({
  providerId,
  projects,
}: {
  providerId: string;
  projects: AvailableProviderProject[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setTracked(id: string, tracked: boolean) {
    startTransition(async () => {
      const result = await setProviderProjectTrackedAction(
        id,
        tracked,
        providerId,
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(tracked ? "Tracking enabled" : "Tracking disabled");
      router.refresh();
    });
  }

  return (
    <section className="mt-8 max-w-2xl">
      <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
        Available projects
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Projects show up here from Penopta Sync or the hourly skill — whichever
        lands first. Turn tracking on for projects you want the scheduled sync
        to keep pulling transcripts from. Names with a{" "}
        <span className="font-medium text-foreground">P:</span> or{" "}
        <span className="font-medium text-foreground">Private:</span> prefix are
        never imported.
      </p>

      {projects.length === 0 ? (
        <p className="mt-4 rounded-md border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-5 text-sm text-muted">
          No projects yet. Sync from the Penopta Sync app, or run the scheduled
          skill once — either is enough to start.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-zinc-100 border border-zinc-200 rounded-md">
          {projects.map((project) => {
            const sourceLabel = project.source
              ? PROVIDER_PROJECT_SOURCE_LABEL[project.source]
              : null;
            return (
              <li
                key={project.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">
                      {project.name}
                    </p>
                    {project.tracked ? (
                      <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                        Tracked
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {project.createdAt
                      ? `Created ${formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}`
                      : "Created time unknown"}
                    {sourceLabel ? (
                      <>
                        <span className="text-zinc-300"> · </span>
                        via {sourceLabel}
                      </>
                    ) : null}
                  </p>
                </div>
                <label className="flex shrink-0 items-center gap-2 text-sm">
                  <span className="sr-only">Track {project.name}</span>
                  <input
                    type="checkbox"
                    className="size-4 rounded border-zinc-300 text-foreground accent-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                    checked={project.tracked}
                    disabled={pending}
                    onChange={(e) => setTracked(project.id, e.target.checked)}
                  />
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
