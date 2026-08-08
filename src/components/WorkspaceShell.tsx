import Link from "next/link";

import { AddProjectButton } from "@/components/AddProjectButton";
import { BrandLogo } from "@/components/Brand";
import { GroupedThreadList } from "@/components/GroupedThreadList";
import type { SourceProjectOption } from "@/components/ManageProjectThreads";
import { OrgSwitcher, type OrgSwitcherItem } from "@/components/OrgSwitcher";
import type { SessionUser } from "@/lib/auth/session";
import type { AgentThreadRow, ProjectRow } from "@/lib/db/schema";

type SidebarThread = Pick<
  AgentThreadRow,
  | "id"
  | "title"
  | "status"
  | "lastAgentName"
  | "ownerUserId"
  | "projectContext"
  | "threadUpdatedAt"
  | "lastSyncedAt"
  | "sourceActivity"
>;

type SidebarProject = Pick<ProjectRow, "id" | "name">;

/** Shared workspace chrome: left sidebar (projects + threads) + header + main content. */
export function WorkspaceShell({
  user,
  orgs = [],
  activeOrgId,
  threads,
  projects = [],
  sourceProjects = [],
  ownerNames = {},
  activeThreadId,
  activeProjectId,
  children,
}: {
  user: SessionUser;
  orgs?: OrgSwitcherItem[];
  activeOrgId?: string;
  threads: SidebarThread[];
  projects?: SidebarProject[];
  sourceProjects?: SourceProjectOption[];
  /** Map of ownerUserId → display name; falls back to the id when missing. */
  ownerNames?: Record<string, string>;
  activeThreadId?: string;
  activeProjectId?: string;
  children: React.ReactNode;
}) {
  const myThreadCount = threads.filter(
    (thread) => thread.ownerUserId === user.id,
  ).length;
  const sourceCatalog = sourceProjects.map((project) => ({
    name: project.name,
    projectId: project.projectId ?? "",
  }));

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-[#f4f4f5]">
        <div className="shrink-0 border-b border-border px-4 py-4">
          <Link href="/">
            <BrandLogo className="h-6" />
          </Link>
        </div>

        <div className="shrink-0 px-3 pt-3">
          <AddProjectButton
            enabled={myThreadCount >= 2 || sourceProjects.length >= 1}
            sourceProjects={sourceProjects}
            threads={threads
              .filter((thread) => thread.ownerUserId === user.id)
              .map((thread) => ({
                id: thread.id,
                title: thread.title,
                lastAgentName: thread.lastAgentName,
                status: thread.status,
                ownerName: ownerNames[thread.ownerUserId] ?? thread.ownerUserId,
                ownerUserId: thread.ownerUserId,
              }))}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-4 pt-5">
          {projects.length > 0 ? (
            <div className="mb-5 shrink-0">
              <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
                Projects
              </p>
              <ul className="-mx-1 mt-2 space-y-0.5">
                {projects.map((project) => {
                  const active = project.id === activeProjectId;
                  return (
                    <li key={project.id}>
                      <Link
                        href={`/projects/${project.id}`}
                        aria-current={active ? "page" : undefined}
                        className={`block truncate rounded-md px-2 py-1.5 text-sm transition ${
                          active
                            ? "bg-black/10 font-medium text-foreground"
                            : "text-foreground hover:bg-black/5"
                        }`}
                        title={project.name}
                      >
                        {project.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          <p className="shrink-0 text-[11px] font-semibold tracking-wider text-muted uppercase">
            Agent Threads
          </p>
          <GroupedThreadList
            threads={threads}
            catalog={sourceCatalog}
            activeThreadId={activeThreadId}
            hrefForThread={(id) => `/threads/${id}`}
            ownerNames={ownerNames}
            showMeta
          />
        </div>

        {activeOrgId ? (
          <div className="shrink-0 border-t border-border px-4 py-4">
            <OrgSwitcher activeOrgId={activeOrgId} orgs={orgs} />
          </div>
        ) : null}
      </aside>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-end gap-3 border-b border-border bg-surface px-4">
          <span className="truncate text-sm text-muted" title={user.email}>
            {user.name || user.email}
          </span>
        </header>

        {children}
      </div>
    </div>
  );
}
