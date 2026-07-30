import Link from "next/link";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/Brand";
import type { IntegrationProvider } from "@/lib/integrations/providers";

export function IntegrationsShell({
  children,
  providers,
  activeProviderId,
}: {
  children: ReactNode;
  providers: IntegrationProvider[];
  activeProviderId?: string;
}) {
  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-[#f4f4f5]">
        <div className="border-b border-border px-4 py-4">
          <BrandLogo className="text-base" />
        </div>

        <div className="px-3 pt-3">
          <Link
            href="/"
            className="flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition hover:bg-background"
          >
            ← Back
          </Link>
        </div>

        <div className="flex-1 px-4 pt-5">
          <p className="text-[11px] font-semibold tracking-wider text-muted uppercase">
            Integrations
          </p>
          <ul className="mt-2 space-y-0.5">
            <li>
              <Link
                href="/integrations"
                className={`block rounded-md px-2 py-1.5 text-sm transition ${
                  !activeProviderId
                    ? "bg-surface font-medium text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                }`}
              >
                All
              </Link>
            </li>
            {providers.map((provider) => (
              <li key={provider.id}>
                <Link
                  href={`/integrations/${provider.id}`}
                  className={`block rounded-md px-2 py-1.5 text-sm transition ${
                    activeProviderId === provider.id
                      ? "bg-surface font-medium text-foreground shadow-sm"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {provider.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
