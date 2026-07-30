import { readFile } from "node:fs/promises";
import path from "node:path";

/** On-disk location of the hourly sync skill markdown. */
export const SYNC_SKILL_PATH = path.join(
  process.cwd(),
  "src/lib/integrations/sync-skill.md",
);

/** Read the raw sync-skill markdown from disk (server-only). */
export async function readSyncSkill(): Promise<string> {
  return readFile(SYNC_SKILL_PATH, "utf8");
}
