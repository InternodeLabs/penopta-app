import { macosIntegration } from "@/lib/integrations/macos";
import type { IntegrationProvider } from "@/lib/integrations/providers";

/** Sidebar / index entry shared by MCP providers and the macOS app. */
export type IntegrationNavItem = {
  id: string;
  name: string;
  href: string;
};

export function listIntegrationNav(
  providers: IntegrationProvider[],
): IntegrationNavItem[] {
  return [
    ...providers.map((p) => ({
      id: p.id,
      name: p.name,
      href: `/integrations/${p.id}`,
    })),
    {
      id: macosIntegration.id,
      name: macosIntegration.name,
      href: `/integrations/${macosIntegration.id}`,
    },
  ];
}
