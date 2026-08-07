import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth/auth";
import {
  isNewlyRegisteredUser,
  safeAppPath,
} from "@/lib/auth/post-sign-in";

/**
 * After social / passkey sign-in: first-time accounts land on integrations;
 * returning users continue to `?to=` (default `/`).
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/", request.nextUrl.origin));
  }

  const returnTo = safeAppPath(request.nextUrl.searchParams.get("to"));
  const isNew = await isNewlyRegisteredUser(session.user.id);
  const dest = isNew ? "/integrations" : returnTo;

  return NextResponse.redirect(new URL(dest, request.nextUrl.origin));
}
