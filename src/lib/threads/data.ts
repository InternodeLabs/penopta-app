import { and, desc, eq, or } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  agentThreads,
  availableProviderProjects,
  projectSourceProjects,
  projectThreads,
  type AgentThreadRow,
} from "@/lib/db/schema";

/**
 * Agent threads in an org, most recently synced first.
 * Pass `ownerUserId` for the home/sidebar “mine only” lists; omit it for
 * org-wide reads (e.g. project pickers that still filter client-side, MCP).
 */
export async function listAgentThreads(
  orgId: string,
  opts?: { ownerUserId?: string },
): Promise<AgentThreadRow[]> {
  const where = opts?.ownerUserId
    ? and(
        eq(agentThreads.orgId, orgId),
        eq(agentThreads.ownerUserId, opts.ownerUserId),
      )
    : eq(agentThreads.orgId, orgId);

  return db
    .select()
    .from(agentThreads)
    .where(where)
    .orderBy(desc(agentThreads.lastSyncedAt));
}

/**
 * Distinct agent names (`claude`, `chatgpt`, …) that have synced at least one
 * thread into the org. Used to mark integrations as connected.
 */
export async function listSyncedAgentNames(orgId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ name: agentThreads.lastAgentName })
    .from(agentThreads)
    .where(eq(agentThreads.orgId, orgId));

  return rows.map((r) => r.name);
}

/**
 * Agent threads in a Penopta project: explicit `project_thread` picks plus
 * threads whose `project_context` matches a linked source (provider) project.
 * Deduped; most recently synced first.
 */
export async function listProjectThreads(
  projectId: string,
): Promise<AgentThreadRow[]> {
  const [explicit, viaSource] = await Promise.all([
    db
      .select({ thread: agentThreads })
      .from(projectThreads)
      .innerJoin(
        agentThreads,
        eq(agentThreads.id, projectThreads.agentThreadId),
      )
      .where(eq(projectThreads.projectId, projectId)),
    db
      .select({ thread: agentThreads })
      .from(projectSourceProjects)
      .innerJoin(
        availableProviderProjects,
        eq(
          availableProviderProjects.id,
          projectSourceProjects.availableProviderProjectId,
        ),
      )
      .innerJoin(
        agentThreads,
        and(
          eq(agentThreads.orgId, projectSourceProjects.orgId),
          or(
            eq(agentThreads.projectContext, availableProviderProjects.name),
            eq(
              agentThreads.projectContext,
              availableProviderProjects.externalProjectId,
            ),
          ),
        ),
      )
      .where(eq(projectSourceProjects.projectId, projectId)),
  ]);

  const byId = new Map<string, AgentThreadRow>();
  for (const row of [...explicit, ...viaSource]) {
    byId.set(row.thread.id, row.thread);
  }

  return Array.from(byId.values()).sort(
    (a, b) => b.lastSyncedAt.getTime() - a.lastSyncedAt.getTime(),
  );
}

/** Explicit per-thread links only (not source-project membership). */
export async function listExplicitProjectThreadIds(
  projectId: string,
): Promise<string[]> {
  const rows = await db
    .select({ agentThreadId: projectThreads.agentThreadId })
    .from(projectThreads)
    .where(eq(projectThreads.projectId, projectId));
  return rows.map((r) => r.agentThreadId);
}

/** Catalog ids of source projects linked into a Penopta project. */
export async function listProjectSourceProjectIds(
  projectId: string,
  opts?: { addedByUserId?: string },
): Promise<string[]> {
  const where = opts?.addedByUserId
    ? and(
        eq(projectSourceProjects.projectId, projectId),
        eq(projectSourceProjects.addedByUserId, opts.addedByUserId),
      )
    : eq(projectSourceProjects.projectId, projectId);

  const rows = await db
    .select({
      id: projectSourceProjects.availableProviderProjectId,
    })
    .from(projectSourceProjects)
    .where(where);
  return rows.map((r) => r.id);
}

/** A single thread in an org by its internal id, or null if not found. */
export async function getAgentThread(
  orgId: string,
  id: string,
): Promise<AgentThreadRow | null> {
  const rows = await db
    .select()
    .from(agentThreads)
    .where(and(eq(agentThreads.id, id), eq(agentThreads.orgId, orgId)))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * A single thread in an org by the producing agent's stable thread id
 * (payload `threadId`), or null if not found.
 */
export async function getAgentThreadByExternalId(
  orgId: string,
  externalThreadId: string,
): Promise<AgentThreadRow | null> {
  const rows = await db
    .select()
    .from(agentThreads)
    .where(
      and(
        eq(agentThreads.orgId, orgId),
        eq(agentThreads.threadId, externalThreadId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}
