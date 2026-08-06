import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  availableProviderProjects,
  type AvailableProviderProjectRow,
} from "@/lib/db/schema";
import {
  isPrivateProviderProjectName,
  type ProviderProjectProvider,
} from "@/lib/integrations/provider-projects";

export type AvailableProviderProject = {
  id: string;
  provider: ProviderProjectProvider;
  projectId: string;
  name: string;
  createdAt: string | null;
  tracked: boolean;
  private: boolean;
};

function toPublic(row: AvailableProviderProjectRow): AvailableProviderProject {
  const isPrivate = isPrivateProviderProjectName(row.name);
  return {
    id: row.id,
    provider: row.provider,
    projectId: row.externalProjectId,
    name: row.name,
    createdAt: row.projectCreatedAt?.toISOString() ?? null,
    tracked: row.tracked && !isPrivate,
    private: isPrivate,
  };
}

/** List available provider projects for an org, optionally filtered by provider. */
export async function listAvailableProviderProjects(
  orgId: string,
  provider?: ProviderProjectProvider,
): Promise<AvailableProviderProject[]> {
  const rows = await db
    .select()
    .from(availableProviderProjects)
    .where(
      provider
        ? and(
            eq(availableProviderProjects.orgId, orgId),
            eq(availableProviderProjects.provider, provider),
          )
        : eq(availableProviderProjects.orgId, orgId),
    )
    .orderBy(asc(availableProviderProjects.name));

  return rows.map(toPublic);
}

/** Projects Penopta already knows about for a provider (MCP `known_projects`). */
export async function listKnownProviderProjects(
  orgId: string,
  provider: ProviderProjectProvider,
): Promise<AvailableProviderProject[]> {
  return listAvailableProviderProjects(orgId, provider);
}

/**
 * Tracked, non-private projects the skill should sync (MCP `tracked_projects`).
 */
export async function listTrackedProviderProjects(
  orgId: string,
  provider: ProviderProjectProvider,
): Promise<AvailableProviderProject[]> {
  const all = await listAvailableProviderProjects(orgId, provider);
  return all.filter((p) => p.tracked && !p.private);
}

export type MakeAvailableInput = {
  projectId: string;
  name: string;
  createdAt?: string | null;
};

/**
 * Upsert provider project metadata into the available catalog. Never changes
 * `tracked`. If a renamed project becomes private while tracked, clear tracking.
 */
export async function makeProviderProjectsAvailable(
  ownerUserId: string,
  orgId: string,
  provider: ProviderProjectProvider,
  projects: MakeAvailableInput[],
): Promise<{ inserted: number; updated: number; projects: AvailableProviderProject[] }> {
  let inserted = 0;
  let updated = 0;
  const results: AvailableProviderProject[] = [];

  for (const item of projects) {
    const projectId = item.projectId.trim();
    const name = item.name.trim();
    if (!projectId || !name) continue;

    let projectCreatedAt: Date | null = null;
    if (item.createdAt) {
      const parsed = new Date(item.createdAt);
      if (!Number.isNaN(parsed.getTime())) projectCreatedAt = parsed;
    }

    const existing = await db
      .select()
      .from(availableProviderProjects)
      .where(
        and(
          eq(availableProviderProjects.orgId, orgId),
          eq(availableProviderProjects.provider, provider),
          eq(availableProviderProjects.externalProjectId, projectId),
        ),
      )
      .limit(1);

    const now = new Date();
    const becomesPrivate = isPrivateProviderProjectName(name);

    if (existing[0]) {
      const [row] = await db
        .update(availableProviderProjects)
        .set({
          name,
          projectCreatedAt:
            projectCreatedAt ?? existing[0].projectCreatedAt ?? null,
          ownerUserId,
          // Private projects cannot stay tracked.
          tracked: becomesPrivate ? false : existing[0].tracked,
          updatedAt: now,
        })
        .where(eq(availableProviderProjects.id, existing[0].id))
        .returning();
      updated += 1;
      results.push(toPublic(row));
    } else {
      const [row] = await db
        .insert(availableProviderProjects)
        .values({
          orgId,
          ownerUserId,
          provider,
          externalProjectId: projectId,
          name,
          projectCreatedAt,
          tracked: false,
          updatedAt: now,
        })
        .returning();
      inserted += 1;
      results.push(toPublic(row));
    }
  }

  return { inserted, updated, projects: results };
}

/**
 * Set tracked for a catalog row in the active org. Private names cannot be
 * tracked.
 */
export async function setProviderProjectTracked(
  orgId: string,
  id: string,
  tracked: boolean,
): Promise<
  | { ok: true; project: AvailableProviderProject }
  | { ok: false; error: string }
> {
  const [row] = await db
    .select()
    .from(availableProviderProjects)
    .where(
      and(
        eq(availableProviderProjects.id, id),
        eq(availableProviderProjects.orgId, orgId),
      ),
    )
    .limit(1);

  if (!row) return { ok: false, error: "Project not found." };
  if (tracked && isPrivateProviderProjectName(row.name)) {
    return {
      ok: false,
      error: "Private projects (names starting with P: or Private:) cannot be tracked.",
    };
  }

  const [updated] = await db
    .update(availableProviderProjects)
    .set({ tracked, updatedAt: new Date() })
    .where(eq(availableProviderProjects.id, id))
    .returning();

  return { ok: true, project: toPublic(updated) };
}
