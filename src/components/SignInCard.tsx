"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

import { loginStartHref } from "@/lib/auth/urls";

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/**
 * Logged-out home. Visual match for the Penopta sign-in mockup; all Continue
 * actions hand off to Internode via `/authenticating` (no local IdP).
 */
export function SignInCard({
  returnTo,
  errorMessage,
}: {
  returnTo?: string;
  errorMessage?: string | null;
}) {
  const router = useRouter();
  const href = loginStartHref(returnTo);

  function startSignIn(event?: FormEvent) {
    event?.preventDefault();
    router.push(href);
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #d4d4d8 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="relative w-full max-w-100 rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-center text-[1.375rem] font-semibold tracking-tight text-foreground">
          Welcome to Penopta
        </h1>

        {errorMessage ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <Link
          href={href}
          prefetch={false}
          className="mt-6 flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-surface text-sm font-medium text-foreground transition hover:bg-background"
        >
          <GoogleMark />
          Continue with Google
        </Link>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-surface px-3 text-muted">or</span>
          </div>
        </div>

        <form onSubmit={startSignIn} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none placeholder:text-muted/80 focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground outline-none placeholder:text-muted/80 focus:border-foreground/30 focus:ring-2 focus:ring-foreground/10"
            />
          </div>
          <button
            type="submit"
            className="flex h-11 w-full items-center justify-center rounded-lg bg-accent text-sm font-semibold text-accent-foreground transition hover:opacity-90"
          >
            Continue
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          Don&apos;t have an account?{" "}
          <Link
            href={href}
            prefetch={false}
            className="font-semibold text-foreground transition hover:opacity-80"
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
