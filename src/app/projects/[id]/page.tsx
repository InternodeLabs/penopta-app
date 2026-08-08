import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BrandLogo } from "@/components/Brand";
import { GroupedThreadList } from "@/components/GroupedThreadList";
import { ManageProjectThreads } from "@/components/ManageProjectThreads";
import { OrgSwitcher } from "@/components/OrgSwitcher";
import {
  buildProjectActivityFeed,
  ProjectActivityFeed,
} from "@/components/ProjectActivityFeed";
import { ProjectHeader } from "@/components/ProjectHeader";
import { ProjectVisibilityControl } from "@/components/ProjectVisibilityControl";
import { ThreadConversation } from "@/components/ThreadConversation";
import { getSession } from "@/lib/auth/server";
import type { SessionUser } from "@/lib/auth/session";
import { loginStartHref } from "@/lib/auth/urls";
import { lookupUsers } from "@/lib/auth/users";
import { listOrgMembers, resolveActiveOrg } from "@/lib/orgs/data";
import { toOrgSwitcherItems } from "@/lib/orgs/view";
import { listAvailableProviderProjects, listMyAvailableProviderProjects } from "@/lib/integrations/provider-projects-data";
import {
  providerDisplayName,
  resolveSourceProjectLabel,
} from "@/lib/integrations/provider-projects-view";
import { getVisibleProject } from "@/lib/projects/data";
import {
  listAgentThreads,
  listExplicitProjectThreadIds,
  listProjectSourceProjectIds,
  listProjectThreads,
} from "@/lib/threads/data";
import { resolveThreadOwnerNames } from "@/lib/threads/owners";

function initials(user: SessionUser): string {
  const base = user.name || user.email || "?";
  return (
    base
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ thread?: string }>;
}) {
  const { id } = await params;
  const { thread: threadParam } = await searchParams;
  const returnPath = threadParam
    ? `/projects/${id}?thread=${threadParam}`
    : `/projects/${id}`;
  const session = await getSession();
  if (!session) redirect(loginStartHref(returnPath));

  const { activeOrg, memberships } = await resolveActiveOrg(session.user.id);

  const [project, members] = await Promise.all([
    getVisibleProject(id, activeOrg.id, session.user.id),
    listOrgMembers(activeOrg.id),
  ]);
  if (!project) notFound();

  const [
    threads,
    myThreads,
    mySources,
    orgSources,
    explicitThreadIds,
    myLinkedSourceIds,
  ] = await Promise.all([
    listProjectThreads(project.id),
    listAgentThreads(activeOrg.id, { ownerUserId: session.user.id }),
    listMyAvailableProviderProjects(activeOrg.id, session.user.id),
    listAvailableProviderProjects(activeOrg.id),
    listExplicitProjectThreadIds(project.id),
    listProjectSourceProjectIds(project.id, {
      addedByUserId: session.user.id,
    }),
  ]);

  const [memberNames, ownerNames] = await Promise.all([
    lookupUsers(members.map((m) => m.userId)),
    resolveThreadOwnerNames(threads, session),
  ]);
  const sourceProjects = mySources.map((source) => ({
    id: source.id,
    name: source.name,
    providerLabel: providerDisplayName(source.provider),
    projectId: source.projectId,
  }));
  // Org-wide catalog so mixed teammate threads still resolve source labels.
  const sourceCatalog = orgSources.map((source) => ({
    name: source.name,
    projectId: source.projectId,
  }));
  const memberLabels = members.map((m) =>
    m.userId === session.user.id
      ? "You"
      : (memberNames.get(m.userId)?.name ?? m.userId),
  );

  const user = session.user;
  const isOwner = project.ownerUserId === user.id;
  const displayName = user.name || user.email;
  const agentCount = new Set(
    threads.map((t) => t.lastAgentName).filter(Boolean),
  ).size;
  const activityLines = buildProjectActivityFeed(threads);
  const recentActivity = activityLines.slice(-5).reverse();
  const selectedThread = threadParam
    ? (threads.find((thread) => thread.id === threadParam) ?? null)
    : null;
  const selectedOwnerName = selectedThread
    ? (ownerNames[selectedThread.ownerUserId] ?? selectedThread.ownerUserId)
    : null;
  const selectedSourceProject = selectedThread
    ? resolveSourceProjectLabel(selectedThread.projectContext, sourceCatalog)
    : null;

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Left: project threads sidebar */}
      <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-[#f4f4f5]">
        <div className="shrink-0 border-b border-border px-4 py-4">
          <Link href="/">
            <BrandLogo className="h-7" />
          </Link>
        </div>

        <div className="shrink-0 px-3 pt-3">
          <Link
            href="/"
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-sm font-medium text-foreground transition hover:bg-background"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Back
          </Link>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-4 pt-5">
          <div className="flex shrink-0 items-center justify-between gap-2">
            <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
              Agent Threads
            </p>
            <ManageProjectThreads
              projectId={project.id}
              currentUserId={user.id}
              threads={myThreads.map((thread) => ({
                id: thread.id,
                title: thread.title,
                lastAgentName: thread.lastAgentName,
                status: thread.status,
                ownerName:
                  ownerNames[thread.ownerUserId] ?? thread.ownerUserId,
                ownerUserId: thread.ownerUserId,
              }))}
              selectedThreadIds={explicitThreadIds}
              sourceProjects={sourceProjects}
              selectedSourceProjectIds={myLinkedSourceIds}
            />
          </div>
          <GroupedThreadList
            threads={threads}
            catalog={sourceCatalog}
            activeThreadId={selectedThread?.id}
            linkTarget={{ kind: "project", projectId: project.id }}
          />
        </div>

        <div className="shrink-0 border-t border-border px-4 py-4">
          <OrgSwitcher
            activeOrgId={activeOrg.id}
            orgs={toOrgSwitcherItems(memberships)}
          />
        </div>
      </aside>

      {/* Center: conversation */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <ProjectHeader
          projectId={project.id}
          name={project.name}
          isOwner={isOwner}
        />

        {selectedThread ? (
          <main className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 border-b border-border bg-surface px-6 py-4">
              <h2 className="truncate text-lg font-semibold tracking-tight">
                {selectedThread.title || "Untitled thread"}
              </h2>
              <p className="mt-1 text-xs text-muted">
                {selectedSourceProject ? (
                  <>
                    <span title="Source project">{selectedSourceProject}</span>
                    {" · "}
                  </>
                ) : null}
                {selectedOwnerName} · {selectedThread.lastAgentName} ·{" "}
                {selectedThread.kind} · {selectedThread.status} · synced{" "}
                {formatDistanceToNow(selectedThread.lastSyncedAt, {
                  addSuffix: true,
                })}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
              <div className="mx-auto w-full max-w-3xl">
                {selectedThread.workingState?.statusSummary ? (
                  <div className="mb-6 rounded-xl border border-border bg-[#f4f4f5] px-4 py-3 text-sm leading-relaxed text-foreground">
                    <p className="mb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
                      Summary
                    </p>
                    {selectedThread.workingState.statusSummary}
                  </div>
                ) : null}

                <ThreadConversation activity={selectedThread.sourceActivity} />
              </div>
            </div>
          </main>
        ) : (
          <>
            <main
              className={
                activityLines.length > 0
                  ? "flex min-h-0 flex-1 flex-col overflow-y-auto p-6"
                  : "flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center"
              }
            >
              {activityLines.length > 0 ? (
                <ProjectActivityFeed
                  lines={activityLines}
                  projectId={project.id}
                />
              ) : (
                <>
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-skeleton text-muted">
                    <MessageSquare
                      aria-hidden
                      className="h-5 w-5"
                      strokeWidth={1.5}
                    />
                  </span>
                  <p className="mt-4 text-sm font-medium text-foreground">
                    No messages yet
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Add an agent and a member to start collaborating
                  </p>
                </>
              )}
            </main>

            <div className="shrink-0 border-t border-border bg-surface px-4 py-3">
              <div className="mx-auto flex max-w-3xl items-end gap-2">
                <textarea
                  rows={1}
                  disabled
                  placeholder="Send a message…"
                  className="min-h-10 flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  disabled
                  title="Add an agent and a member to start collaborating"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
                >
                  <Send aria-hidden className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-center text-[11px] text-muted">
                Press Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </div>

      {/* Right: details */}
      <aside className="hidden h-full w-64 shrink-0 flex-col gap-6 overflow-y-auto border-l border-border bg-surface px-5 py-5 lg:flex">
        <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
          Details
        </p>

        <section>
          <ProjectVisibilityControl
            projectId={project.id}
            visibility={project.visibility}
            canEdit={isOwner}
          />
        </section>

        <section>
          <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            Agents
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-skeleton text-[11px] font-semibold text-foreground">
              {initials(user)}
            </span>
            <span className="truncate text-sm text-foreground">
              {displayName}
            </span>
          </div>
          {threads.length > 0 ? (
            <p className="mt-3 text-sm text-muted">
              {agentCount} {agentCount === 1 ? "agent" : "agents"}
            </p>
          ) : (
            <Link
              href="/integrations"
              className="mt-3 flex h-9 w-full items-center justify-center rounded-lg border border-border bg-surface text-sm font-medium text-foreground transition hover:bg-background"
            >
              Connect an agent
            </Link>
          )}
        </section>

        <section>
          <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            Members · {activeOrg.name}
          </p>
          {memberLabels.length <= 1 ? (
            <p className="mt-2 text-sm text-muted">Only you</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {memberLabels.map((label, i) => (
                <li
                  key={members[i].id}
                  className="truncate text-sm text-foreground"
                  title={label}
                >
                  {label}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            Activity
          </p>
          {recentActivity.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No recent activity</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {recentActivity.map((line) => (
                <li
                  key={line.key}
                  className="truncate text-sm text-muted"
                  title={`${line.timeLabel} [${line.threadTitle}] posted activity`}
                >
                  {line.timeLabel} [{line.threadTitle}]
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}
