import { MessageSquare } from "lucide-react";
import Link from "next/link";

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
  ownerNames = {},
}: {
  user: SessionUser;
  orgs?: OrgSwitcherItem[];
  activeOrgId?: string;
  threads?: AgentThreadRow[];
  projects?: ProjectRow[];
  ownerNames?: Record<string, string>;
}) {
  const hasThreads = threads.length > 0;

  return (
    <WorkspaceShell
      user={user}
      orgs={orgs}
      activeOrgId={activeOrgId}
      threads={threads}
      projects={projects}
      ownerNames={ownerNames}
    >
      <main className="flex flex-1 items-center justify-center p-6">
        {hasThreads ? (
          <StartProjectModal />
        ) : (
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface px-8 py-9 text-center shadow-sm">
            <MessageSquare
              aria-hidden
              className="mx-auto h-8 w-8 text-muted"
              strokeWidth={1.5}
            />
            <h1 className="mt-4 text-lg font-semibold tracking-tight">
              Start collaborating
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Connect your chat to start collaborating with others via your
              agents.
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
