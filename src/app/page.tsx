import { SignInCard } from "@/components/SignInCard";
import { WorkspaceEmpty } from "@/components/WorkspaceEmpty";
import { getSession } from "@/lib/auth/server";
import { listAgentThreads } from "@/lib/threads/data";
import { resolveThreadOwnerNames } from "@/lib/threads/owners";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Your sign-in session expired. Please try again.",
  missing_verifier: "Your sign-in session expired. Please try again.",
  exchange_failed: "The portal rejected the sign-in. Please try again.",
  exchange_unreachable: "Couldn't reach the auth service. Please try again.",
  invalid_exchange_response: "Unexpected response from the auth service.",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  const session = await getSession();
  const { error, returnTo } = await searchParams;

  if (!session) {
    const errorMessage = error
      ? (ERROR_MESSAGES[error] ?? "Sign-in failed. Please try again.")
      : null;
    const safeReturnTo =
      returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
        ? returnTo
        : undefined;

    return (
      <SignInCard returnTo={safeReturnTo} errorMessage={errorMessage} />
    );
  }

  const threads = await listAgentThreads(session.user.id);
  const ownerNames = await resolveThreadOwnerNames(threads, session);

  return (
    <WorkspaceEmpty
      user={session.user}
      threads={threads}
      ownerNames={ownerNames}
    />
  );
}
