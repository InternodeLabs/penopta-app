import { ArrowLeft, MessageSquare, Pencil, Send, Share2 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { BrandLogo } from "@/components/Brand";
import { getSession } from "@/lib/auth/server";
import type { SessionUser } from "@/lib/auth/session";
import { loginStartHref } from "@/lib/auth/urls";
import { getVisibleProject, listVisibleProjects } from "@/lib/projects/data";

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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(loginStartHref(`/projects/${id}`));

  const [project, projects] = await Promise.all([
    getVisibleProject(id, session.user.id),
    listVisibleProjects({ viewerUserId: session.user.id }),
  ]);
  if (!project) notFound();

  const user = session.user;
  const displayName = user.name || user.email;

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Left: projects sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-[#f4f4f5]">
        <div className="border-b border-border px-4 py-4">
          <Link href="/">
            <BrandLogo className="text-base" />
          </Link>
        </div>

        <div className="px-3 pt-3">
          <Link
            href="/"
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-surface text-sm font-medium text-foreground transition hover:bg-background"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Back
          </Link>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-4 pt-5">
          <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            Projects
          </p>
          <ul className="-mx-1 mt-2 flex-1 space-y-0.5 overflow-y-auto">
            {projects.map((p) => {
              const active = p.id === project.id;
              return (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    aria-current={active ? "page" : undefined}
                    className={`block truncate rounded-md px-2 py-1.5 text-sm transition ${
                      active
                        ? "bg-black/10 font-medium text-foreground"
                        : "text-foreground hover:bg-black/5"
                    }`}
                    title={p.name}
                  >
                    {p.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-border px-4 py-4">
          <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            Integrations
          </p>
          <Link
            href="/integrations"
            className="mt-2 block text-sm text-muted transition hover:text-foreground"
          >
            No integrations yet
          </Link>
        </div>
      </aside>

      {/* Center: conversation */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-surface px-6">
          <h1 className="truncate text-base font-semibold tracking-tight">
            {project.name}
          </h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition hover:bg-background"
            >
              <Share2 aria-hidden className="h-4 w-4" />
              Share
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-3 text-sm font-medium text-background transition hover:opacity-90"
            >
              <Pencil aria-hidden className="h-4 w-4" />
              Edit
            </button>
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-skeleton text-muted">
            <MessageSquare aria-hidden className="h-5 w-5" strokeWidth={1.5} />
          </span>
          <p className="mt-4 text-sm font-medium text-foreground">
            No messages yet
          </p>
          <p className="mt-1 text-sm text-muted">
            Add an agent and a member to start collaborating
          </p>
        </main>

        <div className="border-t border-border bg-surface px-4 py-3">
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
      </div>

      {/* Right: details */}
      <aside className="hidden w-64 shrink-0 flex-col gap-6 border-l border-border bg-surface px-5 py-5 lg:flex">
        <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
          Details
        </p>

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
          <Link
            href="/integrations"
            className="mt-3 flex h-9 w-full items-center justify-center rounded-lg border border-border bg-surface text-sm font-medium text-foreground transition hover:bg-background"
          >
            Connect your agent
          </Link>
        </section>

        <section>
          <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            Members
          </p>
          <p className="mt-2 text-sm text-muted">Only you</p>
        </section>

        <section>
          <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            Activity
          </p>
          <p className="mt-2 text-sm text-muted">No recent activity</p>
        </section>
      </aside>
    </div>
  );
}
