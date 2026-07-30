import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  agentThreads,
  projectThreads,
  type AgentThreadRow,
} from "@/lib/db/schema";

/** All agent threads in an org, most recently synced first. */
export async function listAgentThreads(
  orgId: string,
): Promise<AgentThreadRow[]> {
  return db
    .select()
    .from(agentThreads)
    .where(eq(agentThreads.orgId, orgId))
    .orderBy(desc(agentThreads.lastSyncedAt));
}

/** Agent threads a user has added to a project, most recently synced first. */
export async function listProjectThreads(
  projectId: string,
): Promise<AgentThreadRow[]> {
  const rows = await db
    .select({ thread: agentThreads })
    .from(projectThreads)
    .innerJoin(agentThreads, eq(agentThreads.id, projectThreads.agentThreadId))
    .where(eq(projectThreads.projectId, projectId))
    .orderBy(desc(agentThreads.lastSyncedAt));

  return rows.map((r) => r.thread);
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
