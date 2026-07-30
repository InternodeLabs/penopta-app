import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import {
  agentSyncRuns,
  agentThreadSnapshots,
  agentThreads,
  type AgentSyncRunRow,
} from "@/lib/db/schema";
import type { AgentSyncPayload } from "@/lib/ingest/schema";

export class DuplicateRunError extends Error {
  constructor(public readonly existing: AgentSyncRunRow) {
    super(`Run already ingested: ${existing.runId}`);
    this.name = "DuplicateRunError";
  }
}

function parseOptionalDate(value: string | null): Date | null {
  if (!value) return null;
  return new Date(value);
}

/**
 * Titles that start with `PRIVATE:` (case-insensitive, optional leading
 * whitespace) are intentionally out of scope. Match the title prefix only —
 * the marker in message text or mid-title does not count.
 */
export function isPrivateThreadTitle(title: string): boolean {
  return /^\s*private:/i.test(title);
}

/**
 * Persist a validated sync payload for `ownerUserId`.
 * Inserts an immutable run row, upserts current thread state, and stores
 * per-thread snapshots for history. Threads whose titles start with
 * `PRIVATE:` are dropped before write (server-side guard matching the skill).
 */
export async function ingestAgentSync(
  ownerUserId: string,
  orgId: string,
  payload: AgentSyncPayload,
): Promise<{ run: AgentSyncRunRow; threadsUpserted: number }> {
  const existing = await db
    .select()
    .from(agentSyncRuns)
    .where(
      and(
        eq(agentSyncRuns.ownerUserId, ownerUserId),
        eq(agentSyncRuns.runId, payload.runId),
      ),
    )
    .limit(1);

  if (existing[0]) throw new DuplicateRunError(existing[0]);

  const syncedAt = new Date();
  const threads = payload.threads.filter(
    (thread) => !isPrivateThreadTitle(thread.title),
  );

  const inserted = await db
    .insert(agentSyncRuns)
    .values({
      orgId,
      ownerUserId,
      schemaVersion: payload.schemaVersion,
      agentId: payload.agentId,
      runId: payload.runId,
      windowStart: new Date(payload.windowStart),
      windowEnd: new Date(payload.windowEnd),
      agentName: payload.agent.name,
      agentModel: payload.agent.model,
      agentEffort: payload.agent.effort ?? null,
      captureCoverage: payload.captureCoverage,
      runSummary: payload.runSummary,
    })
    .returning();

  const run = inserted[0];
  if (!run) throw new Error("Failed to insert agent sync run");

  for (const thread of threads) {
    const threadValues = {
      orgId,
      ownerUserId,
      threadId: thread.threadId,
      title: thread.title,
      kind: thread.kind,
      status: thread.status,
      threadCreatedAt: parseOptionalDate(thread.createdAt),
      threadUpdatedAt: parseOptionalDate(thread.updatedAt),
      projectContext: thread.projectContext,
      sourceActivity: thread.sourceActivity,
      workingState: thread.workingState,
      lastAgentName: payload.agent.name,
      lastAgentModel: payload.agent.model,
      lastAgentEffort: payload.agent.effort ?? null,
      lastAgentId: payload.agentId,
      lastRunId: payload.runId,
      lastSyncedAt: syncedAt,
      updatedAt: syncedAt,
    };

    await db
      .insert(agentThreads)
      .values(threadValues)
      .onConflictDoUpdate({
        target: [agentThreads.ownerUserId, agentThreads.threadId],
        set: {
          orgId: threadValues.orgId,
          title: threadValues.title,
          kind: threadValues.kind,
          status: threadValues.status,
          threadCreatedAt: threadValues.threadCreatedAt,
          threadUpdatedAt: threadValues.threadUpdatedAt,
          projectContext: threadValues.projectContext,
          sourceActivity: threadValues.sourceActivity,
          workingState: threadValues.workingState,
          lastAgentName: threadValues.lastAgentName,
          lastAgentModel: threadValues.lastAgentModel,
          lastAgentEffort: threadValues.lastAgentEffort,
          lastAgentId: threadValues.lastAgentId,
          lastRunId: threadValues.lastRunId,
          lastSyncedAt: threadValues.lastSyncedAt,
          updatedAt: threadValues.updatedAt,
        },
      });

    await db.insert(agentThreadSnapshots).values({
      syncRunId: run.id,
      orgId,
      ownerUserId,
      threadId: thread.threadId,
      title: thread.title,
      kind: thread.kind,
      status: thread.status,
      threadCreatedAt: parseOptionalDate(thread.createdAt),
      threadUpdatedAt: parseOptionalDate(thread.updatedAt),
      projectContext: thread.projectContext,
      sourceActivity: thread.sourceActivity,
      workingState: thread.workingState,
      agentName: payload.agent.name,
      agentModel: payload.agent.model,
      agentEffort: payload.agent.effort ?? null,
    });
  }

  return { run, threadsUpserted: threads.length };
}
