import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, ChevronDown, Lock } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AvailableProjectsPanel } from "@/components/AvailableProjectsPanel";
import { CopyField } from "@/components/CopyField";
import { IntegrationsShell } from "@/components/IntegrationsShell";
import { getSession } from "@/lib/auth/server";
import { loginStartHref } from "@/lib/auth/urls";
import { asProviderProjectProvider } from "@/lib/integrations/provider-projects";
import { listAvailableProviderProjects } from "@/lib/integrations/provider-projects-data";
import {
  getIntegrationProvider,
  getPublicAppUrl,
  listIntegrationProviders,
  mcpConnectorUrl,
  syncRoutineInstructions,
  VERIFY_CHAT_COMMAND,
} from "@/lib/integrations/providers";
import { readSyncSkill } from "@/lib/integrations/skill";
import { getLatestMcpVerification } from "@/lib/oauth/tokens";
import { resolveActiveOrg } from "@/lib/orgs/data";

/** Render step copy with `**bold**` and `__underline__`. */
function renderStepText(step: string) {
  return step.split(/(\*\*[^*]+\*\*|__[^_]+__)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("__") && part.endsWith("__")) {
      return (
        <span key={i} className="underline underline-offset-4">
          {part.slice(2, -2)}
        </span>
      );
    }
    return part;
  });
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

  const { activeOrg } = await resolveActiveOrg(session.user.id);
  const availableProjects = await listAvailableProviderProjects(
    activeOrg.id,
    asProviderProjectProvider(provider.id),
  );

  const ProviderIcon = provider.icon;
  const mcpVerification = await getLatestMcpVerification(session.user.id);
  const mcpVerified = Boolean(mcpVerification);
  const appUrl = getPublicAppUrl();
  const target =
    provider.id === "chatgpt"
      ? "ChatGPT scheduled task"
      : "Claude scheduled task";
  const skillBody = await readSyncSkill();
  const instructions = syncRoutineInstructions(skillBody);
  const mcpUrl = mcpConnectorUrl(appUrl);

  const hasAvailableProjects = availableProjects.length > 0;

  /** Shown expanded before verification, and behind a disclosure after. */
  const mcpSetupInstructions = (
    <>
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
          Chat with Penopta in {provider.name} (MCP)
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Add Penopta as an MCP server in {provider.name}. It signs in with
          Penopta (OAuth) and can then pull your project and thread context on
          demand while you chat. No key to paste.
        </p>
      </div>
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground">
        {provider.mcpSteps.map((step) => (
          <li key={step}>{renderStepText(step)}</li>
        ))}
      </ol>
      <CopyField
        label="MCP server URL"
        value={mcpUrl}
        hint="Paste this into the URL field, then save and approve the Penopta sign-in prompt."
      />
    </>
  );

  /** Shown expanded until projects exist, then behind a disclosure. */
  const syncSetupInstructions = (
    <>
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
          Sync your conversations to Penopta automatically
        </h2>
        <p className="mt-2 mb-3 max-w-2xl text-sm leading-relaxed text-muted">
          Optional: also push a periodic snapshot of your conversations into
          Penopta on a schedule.
        </p>
        <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
          Steps
        </h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground">
          {provider.steps.map((step) => (
            <li key={step}>{renderStepText(step)}</li>
          ))}
        </ol>
      </div>
      <CopyField
        label="Copy & Paste these instructions"
        value={instructions}
        multiline
        rows={1}
        hint={`Paste into your ${target}. Delivery runs through the Penopta MCP connector — no key or token included.`}
      />
      {provider.troubleHelp ? (
        <p className="text-sm text-muted">
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
    </>
  );

  return (
    <IntegrationsShell providers={providers} activeProviderId={provider.id}>
      <main className="px-8 py-10 sm:px-12 mx-auto max-w-2xl">
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

        {mcpVerified && mcpVerification ? (
          <section className="mt-8 max-w-2xl">
            <details className="group rounded-md bg-emerald-50 px-3 py-2 text-emerald-700">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm [&::-webkit-details-marker]:hidden">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                <span>
                  MCP connection verified
                  {mcpVerification.agent
                    ? ` via ${mcpVerification.agent}`
                    : ""}{" "}
                  {formatDistanceToNow(mcpVerification.verifiedAt, {
                    addSuffix: true,
                  })}
                  .
                </span>
                <ChevronDown
                  aria-hidden
                  className="ml-auto size-4 shrink-0 transition group-open:rotate-180"
                />
                <span className="sr-only">Show setup instructions</span>
              </summary>
              <div className="mt-3 space-y-4 border-t border-emerald-200/70 pt-3 text-foreground">
                {mcpSetupInstructions}
              </div>
            </details>
          </section>
        ) : (
          <section className="mt-8 max-w-2xl space-y-4">
            {mcpSetupInstructions}
          </section>
        )}

        {!mcpVerified ? (
          <section className="mt-8 max-w-2xl rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 px-5 py-6">
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-muted" aria-hidden />
              <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
                Verify the MCP connection
              </h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              To sync context for your agents, you need to verify the MCP
              connection in {provider.name}. Once verified, we can reach
              Penopta, the scheduled-sync setup appears here.
            </p>
            <div className="mt-4">
              <CopyField
                label={`Run this command in ${provider.name} chat`}
                value={VERIFY_CHAT_COMMAND}
                action={
                  provider.verifyHref
                    ? { label: "Run", href: provider.verifyHref }
                    : undefined
                }
                reloadAction={{ label: "Reload when run" }}
                hint={`Run opens ${provider.name} with the command prefilled. Reload this page once it confirms.`}
              />
            </div>
            {provider.mcpTroubleHelp ? (
              <p className="mt-4 text-sm text-muted">
                {provider.mcpTroubleHelp.text}{" "}
                <a
                  href={provider.mcpTroubleHelp.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-zinc-600 no-underline decoration-muted transition hover:text-zinc-900"
                >
                  {provider.mcpTroubleHelp.linkLabel}
                </a>
              </p>
            ) : null}
          </section>
        ) : hasAvailableProjects ? (
          <>
            <section className="mt-8 max-w-2xl">
              <details className="group rounded-md bg-emerald-50 px-3 py-2 text-emerald-700">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-sm [&::-webkit-details-marker]:hidden">
                  <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                  <span>
                    Conversation sync is set up — expand to edit instructions.
                  </span>
                  <ChevronDown
                    aria-hidden
                    className="ml-auto size-4 shrink-0 transition group-open:rotate-180"
                  />
                  <span className="sr-only">Show sync setup instructions</span>
                </summary>
                <div className="mt-3 space-y-4 border-t border-emerald-200/70 pt-3 text-foreground">
                  {syncSetupInstructions}
                </div>
              </details>
            </section>
          </>
        ) : (
          <>
            <section className="mt-8 max-w-2xl space-y-4">
              {syncSetupInstructions}
            </section>
          </>
        )}

        {provider.notes?.length ? (
          <section className="mt-8 max-w-2xl">
            <ul className="space-y-1 text-xs text-muted">
              {provider.notes.map((note) => (
                <li key={note}>• {note}</li>
              ))}
            </ul>
          </section>
        ) : null}
        <AvailableProjectsPanel
          providerId={provider.id}
          projects={availableProjects}
        />
      </main>
    </IntegrationsShell>
  );
}
