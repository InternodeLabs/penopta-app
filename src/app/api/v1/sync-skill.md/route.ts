import { NextResponse } from "next/server";

import { readSyncSkill } from "@/lib/integrations/skill";

/**
 * Public skill document for the hourly thread-context sync agent.
 * Returns raw markdown from `src/lib/integrations/sync-skill.md`.
 */
export async function GET() {
  const body = await readSyncSkill();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
