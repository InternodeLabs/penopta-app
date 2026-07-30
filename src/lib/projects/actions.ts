"use server";

import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getSession } from "@/lib/auth/server";
import { db } from "@/lib/db/client";
import { projects } from "@/lib/db/schema";

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
