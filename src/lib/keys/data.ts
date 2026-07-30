import { and, desc, eq, gt } from "drizzle-orm";
import { randomBytes } from "node:crypto";

import { db } from "@/lib/db/client";
import { userApiKeys, type UserApiKeyRow } from "@/lib/db/schema";

/** How long a minted key stays valid. */
export const API_KEY_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export class ActiveKeyExistsError extends Error {
  constructor(public readonly active: UserApiKeyRow) {
    super("An active key already exists until it expires.");
    this.name = "ActiveKeyExistsError";
  }
}

export class NoActiveKeyError extends Error {
  constructor() {
    super("No active key to invalidate.");
    this.name = "NoActiveKeyError";
  }
}

function generateKey(): string {
  return `pk_${randomBytes(24).toString("base64url")}`;
}

/** Current non-expired key for this user, if any. */
export async function getActiveApiKey(
  ownerUserId: string,
): Promise<UserApiKeyRow | null> {
  const rows = await db
    .select()
    .from(userApiKeys)
    .where(
      and(
        eq(userApiKeys.ownerUserId, ownerUserId),
        gt(userApiKeys.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(userApiKeys.createdAt))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Expire every non-expired key for this user immediately.
 * Returns how many rows were invalidated.
 */
export async function invalidateActiveApiKeys(
  ownerUserId: string,
): Promise<number> {
  const now = new Date();
  const rows = await db
    .update(userApiKeys)
    .set({ expiresAt: now })
    .where(
      and(
        eq(userApiKeys.ownerUserId, ownerUserId),
        gt(userApiKeys.expiresAt, now),
      ),
    )
    .returning({ id: userApiKeys.id });

  return rows.length;
}

/**
 * Mint a new key. Fails if the user already has a non-expired key —
 * use `remintApiKey` to rotate, or `invalidateActiveApiKeys` first.
 */
export async function mintApiKey(ownerUserId: string): Promise<UserApiKeyRow> {
  const active = await getActiveApiKey(ownerUserId);
  if (active) throw new ActiveKeyExistsError(active);

  const now = new Date();
  const expiresAt = new Date(now.getTime() + API_KEY_TTL_MS);
  const key = generateKey();

  const rows = await db
    .insert(userApiKeys)
    .values({
      ownerUserId,
      key,
      expiresAt,
    })
    .returning();

  const created = rows[0];
  if (!created) throw new Error("Failed to mint API key");
  return created;
}

/** Invalidate the active key (if any), then mint a fresh one. */
export async function remintApiKey(
  ownerUserId: string,
): Promise<UserApiKeyRow> {
  await invalidateActiveApiKeys(ownerUserId);
  return mintApiKey(ownerUserId);
}

/** Resolve a portal user id from an external key (expired keys do not match). */
export async function resolveUserIdByApiKey(
  key: string,
): Promise<string | null> {
  const trimmed = key.trim();
  if (!trimmed) return null;

  const rows = await db
    .select({ ownerUserId: userApiKeys.ownerUserId })
    .from(userApiKeys)
    .where(
      and(eq(userApiKeys.key, trimmed), gt(userApiKeys.expiresAt, new Date())),
    )
    .limit(1);

  return rows[0]?.ownerUserId ?? null;
}
