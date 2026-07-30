import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { agentThreads, type AgentThreadRow } from "@/lib/db/schema";

/** All agent threads owned by a portal user, most recently synced first. */
export async function listAgentThreads(
  ownerUserId: string,
): Promise<AgentThreadRow[]> {
  return db
    .select()
    .from(agentThreads)
    .where(eq(agentThreads.ownerUserId, ownerUserId))
    .orderBy(desc(agentThreads.lastSyncedAt));
}

/** A single owned thread by its internal id, or null if not found. */
export async function getAgentThread(
  ownerUserId: string,
  id: string,
): Promise<AgentThreadRow | null> {
  const rows = await db
    .select()
    .from(agentThreads)
    .where(and(eq(agentThreads.id, id), eq(agentThreads.ownerUserId, ownerUserId)))
    .limit(1);

  return rows[0] ?? null;
}
