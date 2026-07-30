import Link from "next/link";

import { BrandLogo } from "@/components/Brand";
import type { SessionUser } from "@/lib/auth/session";
import type { AgentThreadRow } from "@/lib/db/schema";

type SidebarThread = Pick<
  AgentThreadRow,
  "id" | "title" | "status" | "lastAgentName" | "ownerUserId"
>;

/** Shared workspace chrome: left sidebar (threads) + header + main content. */
export function WorkspaceShell({
  user,
  threads,
  ownerNames = {},
  activeThreadId,
  children,
}: {
  user: SessionUser;
  threads: SidebarThread[];
  /** Map of ownerUserId → display name; falls back to the id when missing. */
  ownerNames?: Record<string, string>;
  activeThreadId?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-[#f4f4f5]">
        <div className="border-b border-border px-4 py-4">
          <Link href="/">
            <BrandLogo className="text-base" />
          </Link>
        </div>

        <div className="px-3 pt-3">
          <button
            type="button"
            disabled
            title="Connect an agent first"
            className="flex h-9 w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-sm font-medium text-muted opacity-70"
          >
            <span aria-hidden>+</span>
            Add new Project
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-4 pt-5">
          <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            Threads
          </p>
          {threads.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No threads yet</p>
          ) : (
            <ul className="-mx-1 mt-2 flex-1 space-y-0.5 overflow-y-auto">
              {threads.map((thread) => {
                const active = thread.id === activeThreadId;
                const ownerName =
                  ownerNames[thread.ownerUserId] ?? thread.ownerUserId;
                return (
                  <li key={thread.id}>
                    <Link
                      href={`/threads/${thread.id}`}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-md px-2 py-1.5 transition ${
                        active ? "bg-black/10" : "hover:bg-black/5"
                      }`}
                    >
                      <p
                        className="truncate text-sm text-foreground"
                        title={thread.title}
                      >
                        {thread.title || "Untitled thread"}
                      </p>
                      <p
                        className="mt-0.5 truncate text-[11px] text-muted"
                        title={ownerName}
                      >
                        {ownerName} · {thread.lastAgentName} · {thread.status}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-border px-4 py-4">
          <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            Integrations
          </p>
          <Link
            href="/integrations"
            className="mt-2 block text-sm text-muted transition hover:text-foreground"
          >
            Manage integrations
          </Link>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-3 border-b border-border bg-surface px-4">
          <span className="truncate text-sm text-muted" title={user.email}>
            {user.name || user.email}
          </span>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-md border border-border px-2.5 py-1.5 text-sm font-medium text-foreground transition hover:bg-background"
            >
              Sign out
            </button>
          </form>
        </header>

        {children}
      </div>
    </div>
  );
}
