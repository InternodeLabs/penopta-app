import Link from "next/link";
import { notFound } from "next/navigation";

import { AppHeader } from "@/components/AppHeader";
import { getSession } from "@/lib/auth/server";
import { getVisibleProject } from "@/lib/projects/data";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  const project = await getVisibleProject(id, session?.user.id);

  if (!project) notFound();

  return (
    <>
      <AppHeader user={session?.user} returnTo={`/projects/${id}`} />

      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/"
          className="text-sm font-medium text-muted transition hover:text-foreground"
        >
          ← Projects
        </Link>

        <div className="mt-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <p className="mt-1 text-sm text-muted">/{project.slug}</p>
          </div>
          <span className="rounded-md bg-skeleton px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted">
            {project.visibility}
          </span>
        </div>

        {project.summary ? (
          <p className="mt-6 text-base leading-relaxed text-foreground">
            {project.summary}
          </p>
        ) : null}
      </main>
    </>
  );
}
