import Link from "next/link";
import { redirect } from "next/navigation";

import { IntegrationsShell } from "@/components/IntegrationsShell";
import { getSession } from "@/lib/auth/server";
import { loginStartHref } from "@/lib/auth/urls";
import { listIntegrationProviders } from "@/lib/integrations/providers";

export default async function IntegrationsPage() {
  const session = await getSession();
  if (!session) redirect(loginStartHref("/integrations"));

  const providers = listIntegrationProviders();

  return (
    <IntegrationsShell providers={providers}>
      <main className="px-8 py-10 sm:px-12">
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="mt-1 text-sm text-muted">Add a new integration</p>

        <div className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
          {providers.map((provider) => {
            const Icon = provider.icon;
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
                <div>
                  <p className="font-semibold text-foreground">
                    {provider.name}
                  </p>
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
                Connect
              </Link>
            </div>
            );
          })}
        </div>
      </main>
    </IntegrationsShell>
  );
}
