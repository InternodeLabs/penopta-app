import { formatDistanceToNow } from "date-fns";
import { CheckCircle2, Download } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { IntegrationsShell } from "@/components/IntegrationsShell";
import PenoptaMark from "@/components/icons/PenoptaMark";
import { getSession } from "@/lib/auth/server";
import { loginStartHref } from "@/lib/auth/urls";
import {
  getPenoptaSyncDownloadUrl,
  getPenoptaSyncInstallStatus,
  macosIntegration,
} from "@/lib/integrations/macos";
import { listIntegrationProviders } from "@/lib/integrations/providers";
import { resolveActiveOrg } from "@/lib/orgs/data";

function renderStepText(step: string) {
  return step.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default async function MacosIntegrationPage() {
  const session = await getSession();
  if (!session) {
    redirect(loginStartHref("/integrations/macos"));
  }

  const providers = listIntegrationProviders();
  const { activeOrg } = await resolveActiveOrg(session.user.id);
  const status = await getPenoptaSyncInstallStatus(activeOrg.id);
  const downloadUrl = getPenoptaSyncDownloadUrl();

  return (
    <IntegrationsShell providers={providers} activeProviderId="macos">
      <main className="mx-auto max-w-2xl px-8 py-10 sm:px-12">
        <Link
          href="/integrations"
          className="text-sm font-medium text-muted transition hover:text-foreground"
        >
          ← Integrations
        </Link>

        <div className="mt-6 flex items-center gap-3">
          <span
            aria-hidden
            className={`grid h-10 w-10 place-items-center rounded-full text-white ${macosIntegration.iconBg}`}
          >
            <PenoptaMark className="size-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {macosIntegration.setupTitle}
            </h1>
            <p className="text-sm text-muted">{macosIntegration.byline}</p>
          </div>
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          {macosIntegration.intro}
        </p>

        {status.installed && status.lastSyncedAt ? (
          <section className="mt-8 max-w-2xl">
            <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="size-4 shrink-0" aria-hidden />
              <span>
                Installed — last sync
                {status.lastAgentName ? ` (${status.lastAgentName})` : ""}{" "}
                {formatDistanceToNow(status.lastSyncedAt, { addSuffix: true })}
                .
              </span>
            </div>
          </section>
        ) : null}

        <section className="mt-8 max-w-2xl space-y-4">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
              Why the macOS app
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {macosIntegration.description}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">
              Steps
            </h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-foreground">
              {macosIntegration.steps.map((step) => (
                <li key={step}>{renderStepText(step)}</li>
              ))}
            </ol>
          </div>

          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90"
          >
            <Download className="size-4" aria-hidden />
            {status.installed ? "Download again" : "Download for macOS"}
          </a>
        </section>

        {macosIntegration.notes.length ? (
          <section className="mt-8 max-w-2xl">
            <ul className="space-y-1 text-xs text-muted">
              {macosIntegration.notes.map((note) => (
                <li key={note}>• {note}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </IntegrationsShell>
  );
}
