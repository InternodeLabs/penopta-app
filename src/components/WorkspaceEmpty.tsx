import { MessageSquare } from "lucide-react";
import Link from "next/link";

import type { SourceProjectOption } from "@/components/ManageProjectThreads";
import type { OrgSwitcherItem } from "@/components/OrgSwitcher";
import { StartProjectModal } from "@/components/StartProjectModal";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import type { SessionUser } from "@/lib/auth/session";
import type { AgentThreadRow, ProjectRow } from "@/lib/db/schema";

/** Logged-in workspace landing — prompt to connect an agent, then start a project. */
export function WorkspaceEmpty({
  user,
  orgs = [],
  activeOrgId,
  threads = [],
  projects = [],
  sourceProjects = [],
  ownerNames = {},
}: {
  user: SessionUser;
  orgs?: OrgSwitcherItem[];
  activeOrgId?: string;
  threads?: AgentThreadRow[];
  projects?: ProjectRow[];
  sourceProjects?: SourceProjectOption[];
  ownerNames?: Record<string, string>;
}) {
  const myThreads = threads.filter(
    (thread) => thread.ownerUserId === user.id,
  );
  const canStartProject = myThreads.length >= 2 || sourceProjects.length >= 1;
  const threadOptions = myThreads.map((thread) => ({
    id: thread.id,
    title: thread.title,
    lastAgentName: thread.lastAgentName,
    status: thread.status,
    ownerName: ownerNames[thread.ownerUserId] ?? thread.ownerUserId,
    ownerUserId: thread.ownerUserId,
  }));

  return (
    <WorkspaceShell
      user={user}
      orgs={orgs}
      activeOrgId={activeOrgId}
      threads={threads}
      projects={projects}
      sourceProjects={sourceProjects}
      ownerNames={ownerNames}
    >
      <main className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-6">
        {canStartProject ? (
          <StartProjectModal
            threads={threadOptions}
            sourceProjects={sourceProjects}
          />
        ) : (
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface px-8 py-9 text-center shadow-sm">
            <MessageSquare
              aria-hidden
              className="mx-auto h-8 w-8 text-muted"
              strokeWidth={1.5}
            />
            <h1 className="mt-4 text-lg font-semibold tracking-tight">
              {myThreads.length === 1
                ? "Need one more thread"
                : "Start collaborating"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {myThreads.length === 1
                ? "Projects need a source project or at least two of your agent threads. Sync another conversation, or connect another agent."
                : "Connect your chat to start collaborating with others via your agents."}
            </p>
            <Link
              href="/integrations"
              className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg bg-accent text-sm font-semibold text-accent-foreground transition hover:opacity-90"
            >
              Connect Agent
            </Link>
          </div>
        )}
      </main>
    </WorkspaceShell>
  );
}
