"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/server";
import { setProviderProjectTracked } from "@/lib/integrations/provider-projects-data";
import { resolveActiveOrg } from "@/lib/orgs/data";

export type SetTrackedState =
  | { ok: true; tracked: boolean }
  | { ok: false; error: string };

/** Toggle whether an available provider project is tracked for sync. */
export async function setProviderProjectTrackedAction(
  id: string,
  tracked: boolean,
  providerId: string,
): Promise<SetTrackedState> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in to update tracking." };

  try {
    const { activeOrg } = await resolveActiveOrg(session.user.id);
    const result = await setProviderProjectTracked(activeOrg.id, id, tracked);
    if (!result.ok) return result;

    revalidatePath(`/integrations/${providerId}`);
    return { ok: true, tracked: result.project.tracked };
  } catch (err) {
    console.error("setProviderProjectTrackedAction", err);
    return { ok: false, error: "Couldn't update tracking. Try again." };
  }
}
