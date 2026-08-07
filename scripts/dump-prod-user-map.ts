/**
 * Dump Penopta prod portal-user-id → email → org membership.
 *
 * Re-run right before the Better Auth cutover so any new prod users
 * between now and then show up in the remap checklist.
 *
 * Usage:
 *   npm run auth:dump-user-map
 *
 * Reads:
 *   - penopta `.env.production` → DATABASE_URL (Neon)
 *   - portal env (sibling repo or PORTAL_DATABASE_URL) → users.email
 *
 * Writes (gitignored):
 *   - scripts/.prod-user-map.json
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";
import { Client } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = join(__dirname, ".prod-user-map.json");

function loadEnvFile(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  const env: Record<string, string> = {};
  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (!line || line.trim().startsWith("#")) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!m) continue;
    let v = m[2];
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

function resolvePortalDatabaseUrl(): string {
  if (process.env.PORTAL_DATABASE_URL?.trim()) {
    return process.env.PORTAL_DATABASE_URL.trim();
  }
  const portalRoot =
    process.env.PORTAL_FRONTEND_ROOT?.trim() ||
    resolve(ROOT, "../portal-frontend");
  const portalEnv = {
    ...loadEnvFile(join(portalRoot, ".env.production")),
    ...loadEnvFile(join(portalRoot, ".env.production.local")),
  };
  const url =
    portalEnv.DATABASE_URL ||
    portalEnv.POSTGRES_URL ||
    portalEnv.POSTGRES_PRISMA_URL;
  if (!url) {
    throw new Error(
      "Portal DB URL not found. Set PORTAL_DATABASE_URL or point PORTAL_FRONTEND_ROOT at portal-frontend.",
    );
  }
  return url;
}

type OrgRow = {
  id: string;
  slug: string;
  name: string;
  created_by_user_id: string;
  is_personal: boolean;
};

type MembershipRow = {
  user_id: string;
  org_id: string;
  role: string;
};

type ActiveRow = {
  user_id: string;
  org_id: string;
};

async function main() {
  const penoptaEnv = loadEnvFile(join(ROOT, ".env.production"));
  const penoptaUrl = penoptaEnv.DATABASE_URL;
  if (!penoptaUrl) {
    throw new Error("Missing DATABASE_URL in .env.production");
  }

  const sql = neon(penoptaUrl);

  const [orgs, memberships, active, ownerRows] = (await Promise.all([
    sql`
      SELECT id, slug, name, created_by_user_id, is_personal
      FROM organization
      ORDER BY created_at
    `,
    sql`
      SELECT user_id, org_id, role
      FROM organization_membership
      ORDER BY user_id, org_id
    `,
    sql`
      SELECT user_id, org_id FROM user_active_org
    `,
    sql`
      SELECT DISTINCT owner_user_id AS user_id FROM (
        SELECT owner_user_id FROM project
        UNION SELECT owner_user_id FROM user_api_key
        UNION SELECT owner_user_id FROM agent_thread
        UNION SELECT owner_user_id FROM agent_sync_run
        UNION SELECT user_id AS owner_user_id FROM oauth_token
      ) t
      ORDER BY 1
    `,
  ])) as [OrgRow[], MembershipRow[], ActiveRow[], { user_id: string }[]];

  const userIds = [
    ...new Set([
      ...memberships.map((m) => m.user_id),
      ...active.map((a) => a.user_id),
      ...ownerRows.map((o) => o.user_id),
      ...orgs.map((o) => o.created_by_user_id),
    ]),
  ].sort();

  const portalUrl = resolvePortalDatabaseUrl();
  const portal = new Client({
    connectionString: portalUrl,
    ssl: { rejectUnauthorized: false },
  });
  await portal.connect();
  const portalUsers = userIds.length
    ? (
        await portal.query<{ id: string; email: string; name: string | null }>(
          `SELECT id::text AS id, email, name
           FROM users
           WHERE id = ANY($1::uuid[])
           ORDER BY email`,
          [userIds],
        )
      ).rows
    : [];
  await portal.end();

  const emailById = new Map(portalUsers.map((u) => [u.id, u]));
  const orgById = new Map(orgs.map((o) => [o.id, o]));
  const activeByUser = new Map(active.map((a) => [a.user_id, a.org_id]));

  const users = userIds.map((id) => {
    const portalUser = emailById.get(id);
    const memberOf = memberships
      .filter((m) => m.user_id === id)
      .map((m) => ({
        orgId: m.org_id,
        role: m.role,
        slug: orgById.get(m.org_id)?.slug ?? null,
        name: orgById.get(m.org_id)?.name ?? null,
      }));
    return {
      portalUserId: id,
      email: portalUser?.email ?? null,
      name: portalUser?.name ?? null,
      activeOrgId: activeByUser.get(id) ?? null,
      memberships: memberOf,
    };
  });

  const missingEmail = users.filter((u) => !u.email).map((u) => u.portalUserId);

  const payload = {
    generatedAt: new Date().toISOString(),
    note: "Re-run before Better Auth cutover. Prefer keeping these portal UUIDs as Better Auth user ids so org/project rows need no rewrite.",
    counts: {
      users: users.length,
      orgs: orgs.length,
      memberships: memberships.length,
    },
    orgs,
    users,
    missingEmail,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(`Wrote ${OUT}`);
  console.log(`Users: ${users.length}  Orgs: ${orgs.length}`);
  for (const u of users) {
    const orgsLabel = u.memberships
      .map((m) => `${m.name ?? m.orgId} (${m.role})`)
      .join(", ");
    console.log(`- ${u.email ?? "(no email)"}  ${u.portalUserId}`);
    console.log(`  orgs: ${orgsLabel || "(none)"}`);
  }
  if (missingEmail.length) {
    console.warn(`\nWARNING: ${missingEmail.length} id(s) missing portal email:`);
    for (const id of missingEmail) console.warn(`  ${id}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
