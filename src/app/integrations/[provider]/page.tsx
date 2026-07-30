import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CopyField } from "@/components/CopyField";
import { IntegrationsShell } from "@/components/IntegrationsShell";
import { getSession } from "@/lib/auth/server";
import { loginStartHref } from "@/lib/auth/urls";
import {
  getIntegrationProvider,
  listIntegrationProviders,
} from "@/lib/integrations/providers";

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
            className={`grid h-10 w-10 place-items-center rounded-full text-sm font-bold text-white ${provider.iconBg}`}
          >
            {provider.icon}
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
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>

        <section className="mt-8 max-w-2xl space-y-5">
          <h2 className="text-sm font-semibold tracking-wide text-foreground uppercase">
            URLs to copy
          </h2>
          {provider.copyFields.map((field) => (
            <CopyField
              key={field.label}
              label={field.label}
              value={field.value}
              hint={field.hint}
            />
          ))}
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
      </main>
    </IntegrationsShell>
  );
}
