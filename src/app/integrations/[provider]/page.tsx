import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CopyField } from "@/components/CopyField";
import { IntegrationsShell } from "@/components/IntegrationsShell";
import { KeyActions } from "@/components/KeyActions";
import { getSession } from "@/lib/auth/server";
import { loginStartHref } from "@/lib/auth/urls";
import {
  getIntegrationProvider,
  getPublicAppUrl,
  listIntegrationProviders,
  syncRoutineInstructions,
  syncRoutineInstructionsMasked,
} from "@/lib/integrations/providers";
import { getActiveApiKey } from "@/lib/keys/data";
import { resolveActiveOrg } from "@/lib/orgs/data";

/** Render step copy with simple `**bold**` emphasis. */
function renderStepText(step: string) {
  return step.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    ),
  );
}

export default async function IntegrationSetupPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider: providerId } = await params;
  const session = await getSession();
  if (!session) {
    redirect(loginStartHref(`/integrations/${providerId}`));
  }

  const providers = listIntegrationProviders();
  const provider = getIntegrationProvider(providerId);
  if (!provider) notFound();

  const ProviderIcon = provider.icon;
  const { activeOrg } = await resolveActiveOrg(session.user.id);
  const activeKey = await getActiveApiKey(session.user.id, activeOrg.id);
  const appUrl = getPublicAppUrl();
  const target =
    provider.id === "chatgpt" ? "ChatGPT scheduled task" : "Claude routine";
  const instructions = activeKey
    ? syncRoutineInstructions(activeKey.key, appUrl)
    : null;
  const instructionsDisplay = activeKey
    ? syncRoutineInstructionsMasked(activeKey.key, appUrl)
    : null;

  return (
    <IntegrationsShell providers={providers} activeProviderId={provider.id}>
      <main className="px-8 py-10 sm:px-12">
        <Link
          href="/integrations"
          className="text-sm font-medium text-muted transition hover:text-foreground"
        >
          ← Integrations
        </Link>

        <div className="mt-6 flex items-center gap-3">
          <span
            aria-hidden
            className={`grid h-10 w-10 place-items-center rounded-full text-white ${provider.iconBg}`}
          >
            <ProviderIcon className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {provider.setupTitle}
            </h1>
            <p className="text-sm text-muted">{provider.byline}</p>
          </div>
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {provider.intro}
        </p>

        <section className="mt-8 max-w-2xl">
          <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
            Steps
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground">
            {provider.steps.map((step) => (
              <li key={step}>{renderStepText(step)}</li>
            ))}
          </ol>
        </section>

        <section className="mt-8 max-w-2xl space-y-4">

          {activeKey && instructions && instructionsDisplay ? (
            <>
              <p className="text-sm text-muted">
                Active until{" "}
                <span className="font-medium text-foreground">
                  {activeKey.expiresAt.toLocaleString()}
                </span>{" "}
                (
                {formatDistanceToNow(activeKey.expiresAt, {
                  addSuffix: true,
                })}
                ). Re-mint to rotate, or invalidate to revoke immediately.
              </p>
              <CopyField
                label="Instructions"
                value={instructions}
                displayValue={instructionsDisplay}
                multiline
                rows={1}
                hint={`Paste into your ${target}. Includes your key — do not share.`}
              />
              <KeyActions mode="manage" />
              
              {provider.tryNowHref ? (
                <div className="mt-8 text-sm text-muted">
                  Want to try it out before you add it to a schedule,{" "}
                  <a
                    href={provider.tryNowHref(instructions)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-zinc-600 no-underline decoration-muted transition hover:text-zinc-900"
                  >
                    run it now
                  </a>
                </div>
              ) : null}
              
            </>
          ) : (
            <>
              <p className="text-sm text-muted">
                {`Mint a key to unlock pasteable instructions for your ${target}. You can re-mint or invalidate it anytime.`}
              </p>
              <KeyActions mode="mint" />
            </>
          )}
        </section>

        {provider.notes?.length ? (
          <section className="mt-8 max-w-2xl">
            <ul className="space-y-1 text-xs text-muted">
              {provider.notes.map((note) => (
                <li key={note}>• {note}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {provider.troubleHelp ? (
          <p className="mt-3 max-w-2xl text-sm text-muted">
            {provider.troubleHelp.text}{" "}
            <a
              href={provider.troubleHelp.href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-zinc-600 no-underline decoration-muted transition hover:text-zinc-900"
            >
              {provider.troubleHelp.linkLabel}
            </a>
          </p>
        ) : null}
      </main>
    </IntegrationsShell>
  );
}
