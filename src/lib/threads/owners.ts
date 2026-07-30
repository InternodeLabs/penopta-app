import { lookupPortalUsers } from "@/lib/auth/portal-users";
import type { Session } from "@/lib/auth/session";
import type { AgentThreadRow } from "@/lib/db/schema";

/**
 * Resolve owner user ids on threads to portal display names.
 * Seeds the current user from the session, then fills the rest from the portal
 * directory. Ids that can't be resolved are simply omitted (callers fall back).
 */
export async function resolveThreadOwnerNames(
  threads: Pick<AgentThreadRow, "ownerUserId">[],
  session: Session,
): Promise<Record<string, string>> {
  const names: Record<string, string> = {
    [session.user.id]: session.user.name || session.user.email,
  };

  const directory = await lookupPortalUsers(
    threads.map((t) => t.ownerUserId),
    session.apiToken,
  );
  for (const [id, user] of directory) {
    if (user.name) names[id] = user.name;
  }

  return names;
}
