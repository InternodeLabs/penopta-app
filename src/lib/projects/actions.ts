"use server";

import { randomUUID } from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { agentThreads, projects, projectThreads } from "@/lib/db/schema";
import { resolveActiveOrg } from "@/lib/orgs/data";

export type CreateProjectState =
  | { ok: true; id: string }
  | { ok: false; error: string };

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "project";
}

/** Create a project owned by the current user, returning its id. */
export async function createProjectAction(
  name: string,
): Promise<CreateProjectState> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in to start a project." };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Give your project a name." };

  try {
    const { activeOrg } = await resolveActiveOrg(session.user.id);

    let slug = slugify(trimmed);
    const existing = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1);
    if (existing.length > 0) slug = `${slug}-${randomUUID().slice(0, 6)}`;

    const [row] = await db
      .insert(projects)
      .values({
        name: trimmed,
        slug,
        orgId: activeOrg.id,
        ownerUserId: session.user.id,
      })
      .returning({ id: projects.id });

    revalidatePath("/");
    return { ok: true, id: row.id };
  } catch (err) {
    console.error("createProjectAction", err);
    return { ok: false, error: "Couldn't start the project. Try again." };
  }
}

export type RenameProjectState =
  | { ok: true; name: string }
  | { ok: false; error: string };

/** Rename a project the current user owns. */
export async function renameProjectAction(
  id: string,
  name: string,
): Promise<RenameProjectState> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in to rename a project." };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Give your project a name." };
  if (trimmed.length > 120) {
    return { ok: false, error: "Keep the name under 120 characters." };
  }

  try {
    const [row] = await db
      .update(projects)
      .set({ name: trimmed, updatedAt: new Date() })
      .where(
        and(eq(projects.id, id), eq(projects.ownerUserId, session.user.id)),
      )
      .returning({ id: projects.id, name: projects.name });

    if (!row) return { ok: false, error: "Project not found." };

    revalidatePath("/");
    revalidatePath(`/projects/${id}`);
    return { ok: true, name: row.name };
  } catch (err) {
    console.error("renameProjectAction", err);
    return { ok: false, error: "Couldn't rename the project. Try again." };
  }
}

export type SetProjectThreadsState =
  | { ok: true; count: number }
  | { ok: false; error: string };

/**
 * Replace the set of agent threads on a project the current user owns.
 * Only threads within the same org are accepted; unknown ids are ignored.
 */
export async function setProjectThreadsAction(
  projectId: string,
  threadIds: string[],
): Promise<SetProjectThreadsState> {
  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in to edit this project." };

  try {
    const { activeOrg } = await resolveActiveOrg(session.user.id);

    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, projectId),
          eq(projects.orgId, activeOrg.id),
          eq(projects.ownerUserId, session.user.id),
        ),
      )
      .limit(1);
    if (!project) return { ok: false, error: "Project not found." };

    const unique = Array.from(new Set(threadIds));
    const valid = unique.length
      ? await db
          .select({ id: agentThreads.id })
          .from(agentThreads)
          .where(
            and(
              eq(agentThreads.orgId, activeOrg.id),
              inArray(agentThreads.id, unique),
            ),
          )
      : [];
    const validIds = valid.map((t) => t.id);

    // Delete-then-insert (kept non-transactional for neon-http compatibility).
    await db
      .delete(projectThreads)
      .where(eq(projectThreads.projectId, projectId));
    if (validIds.length > 0) {
      await db.insert(projectThreads).values(
        validIds.map((agentThreadId) => ({
          orgId: activeOrg.id,
          projectId,
          agentThreadId,
          addedByUserId: session.user.id,
        })),
      );
    }

    revalidatePath(`/projects/${projectId}`);
    return { ok: true, count: validIds.length };
  } catch (err) {
    console.error("setProjectThreadsAction", err);
    return {
      ok: false,
      error: "Couldn't update the project threads. Try again.",
    };
  }
}
