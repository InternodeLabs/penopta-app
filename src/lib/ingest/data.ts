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
 * Persist a validated sync payload for `ownerUserId`.
 * Inserts an immutable run row, upserts current thread state, and stores
 * per-thread snapshots for history.
 */
export async function ingestAgentSync(
  ownerUserId: string,
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

  const inserted = await db
    .insert(agentSyncRuns)
    .values({
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

  for (const thread of payload.threads) {
    const threadValues = {
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

  return { run, threadsUpserted: payload.threads.length };
}
