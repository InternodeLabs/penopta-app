"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { DotGridBackground } from "@/components/DotGridBackground";
import { authClient } from "@/lib/auth/client";
import { postSignInHref } from "@/lib/auth/post-sign-in-url";

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

function PasskeyMark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 5.25a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 19.5a7.5 7.5 0 0 1 15 0"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 12.75v3.75m0 0 1.5 1.5M12 16.5l-1.5 1.5"
      />
    </svg>
  );
}

/**
 * Logged-out home. Google OAuth + passkey via Better Auth.
 */
export function SignInCard({
  returnTo,
  errorMessage,
}: {
  returnTo?: string;
  errorMessage?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);
  const destination =
    returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : "/";
  const afterAuthHref = postSignInHref(destination);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !window.PublicKeyCredential?.isConditionalMediationAvailable
    ) {
      return;
    }
    void PublicKeyCredential.isConditionalMediationAvailable().then(
      (available) => {
        if (!available) return;
        void authClient.signIn.passkey({
          autoFill: true,
          fetchOptions: {
            onSuccess() {
              startTransition(() => {
                router.replace(afterAuthHref);
                router.refresh();
              });
            },
          },
        });
      },
    );
  }, [afterAuthHref, router]);

  async function continueWithGoogle() {
    setLocalError(null);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: afterAuthHref,
    });
    if (error) {
      setLocalError(error.message || "Google sign-in failed. Try again.");
    }
  }

  async function continueWithPasskey() {
    setLocalError(null);
    const { error } = await authClient.signIn.passkey({
      fetchOptions: {
        onSuccess() {
          startTransition(() => {
            router.replace(afterAuthHref);
            router.refresh();
          });
        },
      },
    });
    if (error) {
      setLocalError(
        error.message ||
          "Passkey sign-in failed. Sign in with Google first, then add a passkey.",
      );
    }
  }

  const shownError = localError || errorMessage;

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <DotGridBackground />

      <div className="relative w-full max-w-100 rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-center text-[1.375rem] font-semibold tracking-tight text-foreground">
          Welcome to Penopta
        </h1>

        {shownError ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {shownError}
          </p>
        ) : null}

        <p className="mt-2 text-center text-sm text-muted">
          Continue to register or sign in.
        </p>

        {/* Conditional UI hint for passkey autofill */}
        <input
          type="text"
          name="username"
          autoComplete="username webauthn"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
        />

        <div className="mt-6 space-y-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => void continueWithGoogle()}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-surface text-sm font-medium text-foreground transition hover:bg-background disabled:opacity-60"
          >
            <GoogleMark />
            Continue with Google
          </button>

          <button
            type="button"
            disabled={pending}
            onClick={() => void continueWithPasskey()}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-border bg-surface text-sm font-medium text-foreground transition hover:bg-background disabled:opacity-60"
          >
            <PasskeyMark />
            Continue with Passkey
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          <a
            href="https://penopta.com/privacy"
            className="underline-offset-2 transition hover:text-foreground hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Privacy
          </a>
          <span className="mx-1.5" aria-hidden>
            ·
          </span>
          <a
            href="https://penopta.com/terms"
            className="underline-offset-2 transition hover:text-foreground hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Terms
          </a>
        </p>
      </div>
    </main>
  );
}
