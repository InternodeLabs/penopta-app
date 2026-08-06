import type { IntegrationProviderId } from "@/lib/integrations/providers";

/** Providers that can discover projects into the available catalog. */
export const PROVIDER_PROJECT_PROVIDERS = ["chatgpt", "claude"] as const;

export type ProviderProjectProvider = (typeof PROVIDER_PROJECT_PROVIDERS)[number];

export function isProviderProjectProvider(
  value: string,
): value is ProviderProjectProvider {
  return (PROVIDER_PROJECT_PROVIDERS as readonly string[]).includes(value);
}

/**
 * Private projects are intentionally out of sync scope. Match on name prefix
 * only (`p:` or `private:`, case-insensitive) — same rule as the sync skill.
 */
export function isPrivateProviderProjectName(name: string): boolean {
  const n = name.trim().toLowerCase();
  return n.startsWith("p:") || n.startsWith("private:");
}

/** Narrow IntegrationProviderId to catalog providers (they are the same set). */
export function asProviderProjectProvider(
  id: IntegrationProviderId,
): ProviderProjectProvider {
  return id;
}
