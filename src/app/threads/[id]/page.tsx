import { formatDistanceToNow } from "date-fns";
import { notFound, redirect } from "next/navigation";

import { ThreadConversation } from "@/components/ThreadConversation";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { getSession } from "@/lib/auth/server";
import { loginStartHref } from "@/lib/auth/urls";
import { resolveActiveOrg } from "@/lib/orgs/data";
import { toOrgSwitcherItems } from "@/lib/orgs/view";
import { listVisibleProjects } from "@/lib/projects/data";
import { getAgentThread, listAgentThreads } from "@/lib/threads/data";
import { resolveThreadOwnerNames } from "@/lib/threads/owners";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(loginStartHref(`/threads/${id}`));

  const { activeOrg, memberships } = await resolveActiveOrg(session.user.id);

  const [threads, thread, projects] = await Promise.all([
    listAgentThreads(activeOrg.id),
    getAgentThread(activeOrg.id, id),
    listVisibleProjects({ orgId: activeOrg.id, viewerUserId: session.user.id }),
  ]);
  if (!thread) notFound();

  const ownerNames = await resolveThreadOwnerNames(threads, session);
  const ownerName = ownerNames[thread.ownerUserId] ?? thread.ownerUserId;

  return (
    <WorkspaceShell
      user={session.user}
      orgs={toOrgSwitcherItems(memberships)}
      activeOrgId={activeOrg.id}
      threads={threads}
      projects={projects}
      ownerNames={ownerNames}
      activeThreadId={thread.id}
    >
      <main className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border bg-surface px-6 py-4">
          <h1 className="truncate text-lg font-semibold tracking-tight">
            {thread.title || "Untitled thread"}
          </h1>
          <p className="mt-1 text-xs text-muted">
            {ownerName} · {thread.lastAgentName} · {thread.kind} ·{" "}
            {thread.status} · synced{" "}
            {formatDistanceToNow(thread.lastSyncedAt, { addSuffix: true })}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto w-full max-w-3xl">
            {thread.workingState?.statusSummary ? (
              <div className="mb-6 rounded-xl border border-border bg-[#f4f4f5] px-4 py-3 text-sm leading-relaxed text-foreground">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Summary
                </p>
                {thread.workingState.statusSummary}
              </div>
            ) : null}

            <ThreadConversation activity={thread.sourceActivity} />
          </div>
        </div>
      </main>
    </WorkspaceShell>
  );
}
