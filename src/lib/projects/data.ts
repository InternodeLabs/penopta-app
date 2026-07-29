import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { projects, type ProjectRow } from "@/lib/db/schema";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function visibilityClause(viewerUserId?: string | null) {
  const viewer = viewerUserId ?? null;
  return viewer
    ? or(eq(projects.visibility, "public"), eq(projects.ownerUserId, viewer))
    : eq(projects.visibility, "public");
}

/** Visibility-aware project reads (public for everyone; owners also see private). */
export async function listVisibleProjects(opts?: {
  viewerUserId?: string | null;
  query?: string;
}): Promise<ProjectRow[]> {
  const query = opts?.query?.trim();

  const searchClause = query
    ? or(
        ilike(projects.name, `%${query}%`),
        ilike(projects.summary, `%${query}%`),
        ilike(projects.slug, `%${query}%`),
      )
    : undefined;

  const where = searchClause
    ? and(visibilityClause(opts?.viewerUserId), searchClause)
    : visibilityClause(opts?.viewerUserId);

  return db
    .select()
    .from(projects)
    .where(where ?? sql`true`)
    .orderBy(desc(projects.updatedAt));
}

export async function getVisibleProject(
  idOrSlug: string,
  viewerUserId?: string | null,
): Promise<ProjectRow | null> {
  const idMatch = UUID_RE.test(idOrSlug)
    ? eq(projects.id, idOrSlug)
    : eq(projects.slug, idOrSlug);

  const rows = await db
    .select()
    .from(projects)
    .where(and(idMatch, visibilityClause(viewerUserId)))
    .limit(1);

  return rows[0] ?? null;
}
