import { SignInCard } from "@/components/SignInCard";
import { WorkspaceEmpty } from "@/components/WorkspaceEmpty";
import { getSession } from "@/lib/auth/server";
import { resolveActiveOrg } from "@/lib/orgs/data";
import { toOrgSwitcherItems } from "@/lib/orgs/view";
import { listVisibleProjects } from "@/lib/projects/data";
import { listAgentThreads } from "@/lib/threads/data";
import { resolveThreadOwnerNames } from "@/lib/threads/owners";

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Sign-in was cancelled. Please try again.",
  unable_to_create_user: "Couldn't create your account. Please try again.",
  unable_to_link_account: "Couldn't link that sign-in method. Please try again.",
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

  const { activeOrg, memberships } = await resolveActiveOrg(session.user.id);

  const [threads, projects] = await Promise.all([
    listAgentThreads(activeOrg.id),
    listVisibleProjects({ orgId: activeOrg.id, viewerUserId: session.user.id }),
  ]);
  const ownerNames = await resolveThreadOwnerNames(threads, session);

  return (
    <WorkspaceEmpty
      user={session.user}
      orgs={toOrgSwitcherItems(memberships)}
      activeOrgId={activeOrg.id}
      threads={threads}
      projects={projects}
      ownerNames={ownerNames}
    />
  );
}
