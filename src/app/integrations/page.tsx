import Link from "next/link";
import { redirect } from "next/navigation";

import Apple from "@/components/icons/Apple";
import { IntegrationsShell } from "@/components/IntegrationsShell";
import { getSession } from "@/lib/auth/server";
import { loginStartHref } from "@/lib/auth/urls";
import {
  getPenoptaSyncInstallStatus,
  macosIntegration,
} from "@/lib/integrations/macos";
import { listIntegrationProviders } from "@/lib/integrations/providers";
import { resolveActiveOrg } from "@/lib/orgs/data";
import { listSyncedAgentNames } from "@/lib/threads/data";

export default async function IntegrationsPage() {
  const session = await getSession();
  if (!session) redirect(loginStartHref("/integrations"));

  const providers = listIntegrationProviders();
  const { activeOrg } = await resolveActiveOrg(session.user.id);
  const [syncedAgents, macStatus] = await Promise.all([
    listSyncedAgentNames(activeOrg.id),
    getPenoptaSyncInstallStatus(activeOrg.id),
  ]);
  const connectedIds = new Set(
    syncedAgents.map((name) => {
      const n = name.trim().toLowerCase();
      if (n === "claude-code" || n === "anthropic") return "claude";
      if (n === "openai") return "chatgpt";
      return n;
    }),
  );

  return (
    <IntegrationsShell providers={providers}>
      <main className="px-8 py-10 sm:px-12 mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-1 text-sm text-muted">Add a new integration</p>

        <div className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
          {providers.map((provider) => {
            const Icon = provider.icon;
            const connected = connectedIds.has(provider.id);
            return (
              <div
                key={provider.id}
                className="flex flex-col rounded-xl border border-border bg-surface p-5"
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={`grid h-9 w-9 place-items-center rounded-full text-white ${provider.iconBg}`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">
                        {provider.name}
                      </p>
                      {connected ? (
                        <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                          Connected
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted">{provider.byline}</p>
                  </div>
                </div>
                <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">
                  {provider.description}
                </p>
                <Link
                  href={`/integrations/${provider.id}`}
                  className="mt-5 flex h-10 w-full items-center justify-center rounded-lg border border-border text-sm font-medium text-foreground transition hover:bg-background"
                >
                  {connected ? "Manage" : "Connect"}
                </Link>
              </div>
            );
          })}

          <div className="flex flex-col rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className={`grid h-9 w-9 place-items-center rounded-full text-white ${macosIntegration.iconBg}`}
              >
                <Apple className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">
                    {macosIntegration.name}
                  </p>
                  {macStatus.installed ? (
                    <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-emerald-700">
                      Installed
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-muted">{macosIntegration.byline}</p>
              </div>
            </div>
            <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">
              {macosIntegration.description}
            </p>
            <Link
              href={`/integrations/${macosIntegration.id}`}
              className="mt-5 flex h-10 w-full items-center justify-center rounded-lg border border-border text-sm font-medium text-foreground transition hover:bg-background"
            >
              {macStatus.installed ? "Manage" : "Install"}
            </Link>
          </div>
        </div>
      </main>
    </IntegrationsShell>
  );
}
