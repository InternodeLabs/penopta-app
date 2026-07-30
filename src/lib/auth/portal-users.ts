import { PORTAL_BASE_URL } from "./config";

/** Public display info for a portal user, resolved by id or email. */
export interface PortalUser {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
}

interface PortalLookupResponse {
  users?: Array<{
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  }>;
  missing?: string[];
}

/**
 * Resolve portal users by id (or email) via the portal directory
 * (`/api/users/lookup`). Requires a portal-issued bearer token. Failures are
 * swallowed and return an empty map so owner attribution never breaks a page.
 */
export async function lookupPortalUsers(
  ids: Array<string | null | undefined>,
  apiToken: string,
): Promise<Map<string, PortalUser>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();

  const params = new URLSearchParams();
  for (const id of unique) params.append("identifier", id);

  try {
    const url = new URL(
      `/api/users/lookup?${params.toString()}`,
      PORTAL_BASE_URL,
    );
    const response = await fetch(url.toString(), {
      headers: { authorization: `Bearer ${apiToken}` },
      cache: "no-store",
    });
    if (!response.ok) return new Map();

    const data = (await response.json()) as PortalLookupResponse;
    const map = new Map<string, PortalUser>();
    for (const user of data.users ?? []) {
      map.set(user.id, {
        id: user.id,
        email: user.email ?? null,
        name: user.name ?? null,
        image: user.image ?? null,
      });
    }
    return map;
  } catch {
    return new Map();
  }
}

/**
 * Resolve a single portal user by email or id. Returns null when the
 * identifier is unknown or the portal call fails.
 */
export async function resolvePortalUser(
  identifier: string,
  apiToken: string,
): Promise<PortalUser | null> {
  const trimmed = identifier.trim();
  if (!trimmed) return null;

  try {
    const params = new URLSearchParams();
    params.append("identifier", trimmed);
    const url = new URL(
      `/api/users/lookup?${params.toString()}`,
      PORTAL_BASE_URL,
    );
    const response = await fetch(url.toString(), {
      headers: { authorization: `Bearer ${apiToken}` },
      cache: "no-store",
    });
    if (!response.ok) return null;

    const data = (await response.json()) as PortalLookupResponse;
    const user = data.users?.[0];
    if (!user) return null;
    return {
      id: user.id,
      email: user.email ?? null,
      name: user.name ?? null,
      image: user.image ?? null,
    };
  } catch {
    return null;
  }
}
