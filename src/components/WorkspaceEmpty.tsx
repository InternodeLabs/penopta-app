import { MessageSquare } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/Brand";
import type { SessionUser } from "@/lib/auth/session";

/** Logged-in empty workspace — integrate before projects (mockup step 2). */
export function WorkspaceEmpty({ user }: { user: SessionUser }) {
  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-[#f4f4f5]">
        <div className="border-b border-border px-4 py-4">
          <BrandLogo className="text-base" />
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

        <div className="flex-1 px-4 pt-5">
          <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            Projects
          </p>
          <p className="mt-2 text-sm text-muted">No projects yet</p>
        </div>

        <div className="border-t border-border px-4 py-4">
          <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            Integrations
          </p>
          <p className="mt-2 text-sm text-muted">No integrations yet</p>
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

        <main className="flex flex-1 items-center justify-center p-6">
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
        </main>
      </div>
    </div>
  );
}
