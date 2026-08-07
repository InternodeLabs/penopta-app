/** Client-safe helpers for post-auth redirects (no DB imports). */

export function safeAppPath(value: string | null | undefined): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) return value;
  return "/";
}

/** Post-auth landing route; server decides integrations vs `returnTo`. */
export function postSignInHref(returnTo?: string | null): string {
  const to = safeAppPath(returnTo);
  if (to === "/") return "/api/auth/post-sign-in";
  return `/api/auth/post-sign-in?to=${encodeURIComponent(to)}`;
}
