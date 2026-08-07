import { NextResponse, type NextRequest } from "next/server";

import { resolveOwnerFromBearer } from "@/lib/ingest/auth";
import { DuplicateRunError, ingestAgentSync } from "@/lib/ingest/data";
import { agentSyncPayloadSchema } from "@/lib/ingest/schema";

/**
 * Ingest a windowed agent thread-context sync.
 *
 * Auth: `Authorization: Bearer <token>` where token is either an OAuth access
 * token (`pat_…`, same flow as MCP) or a user API key (`pk_…`). Optional
 * `penopta_user_id` in the body must match the resolved owner when present.
 */
export async function POST(request: NextRequest) {
  const owner = await resolveOwnerFromBearer(
    request.headers.get("authorization"),
  );
  if (!owner) {
    return NextResponse.json(
      { error: "Invalid or missing bearer token." },
      { status: 401 },
    );
  }
  const { ownerUserId, orgId } = owner;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = agentSyncPayloadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  if (payload.penopta_user_id && payload.penopta_user_id !== ownerUserId) {
    return NextResponse.json(
      { error: "API key does not match penopta_user_id." },
      { status: 403 },
    );
  }

  try {
    const { run, threadsUpserted } = await ingestAgentSync(
      ownerUserId,
      orgId,
      payload,
    );
    const checkpoint = run.windowEnd.toISOString();
    return NextResponse.json(
      {
        ok: true,
        runId: run.runId,
        syncRunId: run.id,
        threadsUpserted,
        checkpoint,
        cursor: checkpoint,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof DuplicateRunError) {
      const checkpoint = err.existing.windowEnd.toISOString();
      return NextResponse.json(
        {
          ok: true,
          runId: err.existing.runId,
          syncRunId: err.existing.id,
          duplicate: true,
          checkpoint,
          cursor: checkpoint,
        },
        { status: 200 },
      );
    }
    console.error("POST /api/v1/agent-sync", err);
    return NextResponse.json(
      { error: "Failed to ingest sync payload." },
      { status: 500 },
    );
  }
}
