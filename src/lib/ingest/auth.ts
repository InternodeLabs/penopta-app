import { resolveOwnerByApiKey, type ApiKeyOwner } from "@/lib/keys/data";
import { verifyAccessToken } from "@/lib/oauth/tokens";

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
 * Resolve the owner + org from `Authorization: Bearer <token>`.
 *
 * Accepts:
 * - OAuth access tokens (`pat_…`) from the same flow MCP clients use
 * - User API keys (`pk_…`) for headless/agent clients
 *
 * Returns null when missing/invalid/expired.
 */
export async function resolveOwnerFromBearer(
  authorization: string | null,
): Promise<ApiKeyOwner | null> {
  const token = parseBearerToken(authorization);
  if (!token) return null;

  // Prefer OAuth when the token is a live access token.
  const oauth = await verifyAccessToken(token);
  if (oauth) {
    return { ownerUserId: oauth.ownerUserId, orgId: oauth.orgId };
  }

  return resolveOwnerByApiKey(token);
}
