import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  availableProviderProjects,
  type AvailableProviderProjectRow,
} from "@/lib/db/schema";
import { isPrivateProjectName } from "@/lib/ingest/data";
import type { ProviderProjectProvider } from "@/lib/integrations/provider-projects";

export type AvailableProviderProject = {
  id: string;
  provider: ProviderProjectProvider;
  projectId: string;
  name: string;
  createdAt: string | null;
  tracked: boolean;
};

function toPublic(row: AvailableProviderProjectRow): AvailableProviderProject {
  return {
    id: row.id,
    provider: row.provider,
    projectId: row.externalProjectId,
    name: row.name,
    createdAt: row.projectCreatedAt?.toISOString() ?? null,
    tracked: row.tracked,
  };
}

/** Drop any catalog rows whose names are private-prefixed (safety cleanup). */
async function deletePrivateCatalogRows(
  rows: AvailableProviderProjectRow[],
): Promise<AvailableProviderProjectRow[]> {
  const privateIds = rows
    .filter((r) => isPrivateProjectName(r.name))
    .map((r) => r.id);
  if (privateIds.length > 0) {
    await db
      .delete(availableProviderProjects)
      .where(inArray(availableProviderProjects.id, privateIds));
  }
  return rows.filter((r) => !isPrivateProjectName(r.name));
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

  const kept = await deletePrivateCatalogRows(rows);
  return kept.map(toPublic);
}

/** Projects Penopta already knows about for a provider (MCP `known_projects`). */
export async function listKnownProviderProjects(
  orgId: string,
  provider: ProviderProjectProvider,
): Promise<AvailableProviderProject[]> {
  return listAvailableProviderProjects(orgId, provider);
}

/**
 * Tracked projects the skill should sync (MCP `tracked_projects`).
 * Private-prefixed names are never returned (and are deleted if found).
 */
export async function listTrackedProviderProjects(
  orgId: string,
  provider: ProviderProjectProvider,
): Promise<AvailableProviderProject[]> {
  const all = await listAvailableProviderProjects(orgId, provider);
  return all.filter((p) => p.tracked);
}

export type MakeAvailableInput = {
  projectId: string;
  name: string;
  createdAt?: string | null;
};

/**
 * Upsert provider project metadata into the available catalog. Never changes
 * `tracked`. Skips (and deletes any existing) private-prefixed names — those
 * must never be stored.
 */
export async function makeProviderProjectsAvailable(
  ownerUserId: string,
  orgId: string,
  provider: ProviderProjectProvider,
  projects: MakeAvailableInput[],
): Promise<{
  inserted: number;
  updated: number;
  skippedPrivate: number;
  projects: AvailableProviderProject[];
}> {
  let inserted = 0;
  let updated = 0;
  let skippedPrivate = 0;
  const results: AvailableProviderProject[] = [];

  for (const item of projects) {
    const projectId = item.projectId.trim();
    const name = item.name.trim();
    if (!projectId || !name) continue;

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

    // Never store private-prefixed projects; remove if already present.
    if (isPrivateProjectName(name)) {
      skippedPrivate += 1;
      if (existing[0]) {
        await db
          .delete(availableProviderProjects)
          .where(eq(availableProviderProjects.id, existing[0].id));
      }
      continue;
    }

    let projectCreatedAt: Date | null = null;
    if (item.createdAt) {
      const parsed = new Date(item.createdAt);
      if (!Number.isNaN(parsed.getTime())) projectCreatedAt = parsed;
    }

    const now = new Date();

    if (existing[0]) {
      // Existing row became private under a prior name — also drop it.
      if (isPrivateProjectName(existing[0].name)) {
        skippedPrivate += 1;
        await db
          .delete(availableProviderProjects)
          .where(eq(availableProviderProjects.id, existing[0].id));
        continue;
      }

      const [row] = await db
        .update(availableProviderProjects)
        .set({
          name,
          projectCreatedAt:
            projectCreatedAt ?? existing[0].projectCreatedAt ?? null,
          ownerUserId,
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

  return { inserted, updated, skippedPrivate, projects: results };
}

/**
 * Set tracked for a catalog row in the active org. Private names cannot be
 * tracked and are deleted if found.
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
  if (isPrivateProjectName(row.name)) {
    await db
      .delete(availableProviderProjects)
      .where(eq(availableProviderProjects.id, id));
    return {
      ok: false,
      error: "Private projects (names starting with P: or Private:) are not stored.",
    };
  }

  const [updated] = await db
    .update(availableProviderProjects)
    .set({ tracked, updatedAt: new Date() })
    .where(eq(availableProviderProjects.id, id))
    .returning();

  return { ok: true, project: toPublic(updated) };
}
