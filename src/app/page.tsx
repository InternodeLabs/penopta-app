import { Suspense } from "react";

import { AppHeader } from "@/components/AppHeader";
import { ProjectList } from "@/components/ProjectList";
import { getSession } from "@/lib/auth/server";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const raw = Array.isArray(params.q) ? params.q[0] : params.q;
  const query = raw?.trim() || undefined;

  return (
    <>
      <AppHeader user={session?.user} />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-muted">
            Public projects are visible to everyone. Sign in to see yours.
          </p>
        </div>

        {query ? (
          <p className="mb-6 text-sm text-muted">
            Results for{" "}
            <span className="font-medium text-foreground">“{query}”</span>
          </p>
        ) : null}

        <Suspense
          fallback={<p className="text-sm text-muted">Loading projects…</p>}
        >
          <ProjectList viewerUserId={session?.user.id} query={query} />
        </Suspense>
      </main>
    </>
  );
}
