import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

const SYNC_SKILL_PATH = path.join(
  process.cwd(),
  "src/lib/integrations/sync-skill.md",
);

/**
 * Public skill document for the hourly thread-context sync agent.
 * Returns raw markdown from `src/lib/integrations/sync-skill.md`.
 */
export async function GET() {
  const body = await readFile(SYNC_SKILL_PATH, "utf8");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });
}
