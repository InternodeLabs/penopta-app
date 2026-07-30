"use server";

import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/server";
import {
  createOrg,
  getMembershipRole,
  setActiveOrg,
} from "@/lib/orgs/data";

export type OrgActionState =
  | { ok: true; id: string }
  | { ok: false; error: string };

/** Create an organization and switch the current user into it. */
export async function createOrgAction(name: string): Promise<OrgActionState> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in to create an org." };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Give your org a name." };
  if (trimmed.length > 80) {
    return { ok: false, error: "Keep the name under 80 characters." };
  }

  try {
    const org = await createOrg(trimmed, session.user.id);
    await setActiveOrg(session.user.id, org.id);
    revalidatePath("/", "layout");
    return { ok: true, id: org.id };
  } catch (err) {
    console.error("createOrgAction", err);
    return { ok: false, error: "Couldn't create the org. Try again." };
  }
}

/** Switch the current user's active org (must be a member). */
export async function switchOrgAction(orgId: string): Promise<OrgActionState> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in to switch orgs." };

  try {
    const role = await getMembershipRole(orgId, session.user.id);
    if (!role) return { ok: false, error: "You're not a member of that org." };

    await setActiveOrg(session.user.id, orgId);
    revalidatePath("/", "layout");
    return { ok: true, id: orgId };
  } catch (err) {
    console.error("switchOrgAction", err);
    return { ok: false, error: "Couldn't switch orgs. Try again." };
  }
}
