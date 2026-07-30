/**
 * Start Internode PKCE after the brief `/authenticating` interstitial.
 * Logged-out users land on `/` (sign-in). Do not send them to `/login` —
 * that route only forwards auth errors onto `/`.
 */
export function loginStartHref(returnTo?: string | null): string {
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return `/authenticating?returnTo=${encodeURIComponent(returnTo)}`;
  }
  return "/authenticating";
}

/** Internode PKCE start — used by the authenticating interstitial after the pause. */
export function loginApiHref(returnTo?: string | null): string {
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return `/api/auth/login?returnTo=${encodeURIComponent(returnTo)}`;
  }
  return "/api/auth/login";
}
