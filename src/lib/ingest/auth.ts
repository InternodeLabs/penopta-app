import { resolveOwnerByApiKey, type ApiKeyOwner } from "@/lib/keys/data";

/** Extract the Bearer token from an Authorization header value. */
export function parseBearerToken(
  authorization: string | null,
): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  const token = match?.[1]?.trim();
  return token || null;
}

/**
 * Resolve the owner + org from `Authorization: Bearer <api-key>`.
 * Returns null when missing/invalid/expired.
 */
export async function resolveOwnerFromBearer(
  authorization: string | null,
): Promise<ApiKeyOwner | null> {
  const token = parseBearerToken(authorization);
  if (!token) return null;
  return resolveOwnerByApiKey(token);
}
