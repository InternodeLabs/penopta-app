/**
 * Seeds a sample public project so the home page has data to render.
 * Idempotent: skips if a project with the same slug already exists.
 *
 * Run with: npm run db:seed
 */
import { eq } from "drizzle-orm";

import { db } from "./client";
import { projects } from "./schema";

const SEED_OWNER = "seed";

async function main() {
  const slug = "welcome";

  const existing = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);

  if (existing.length > 0) {
    console.log(`Project "${slug}" already exists — nothing to seed.`);
    return;
  }

  await db.insert(projects).values({
    slug,
    name: "Welcome to Penopta",
    summary:
      "A starter project proving Postgres + Drizzle + Internode auth are wired.",
    ownerUserId: SEED_OWNER,
    visibility: "public",
  });

  console.log(`Seeded project "${slug}" (public).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
