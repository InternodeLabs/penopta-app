import type { ProviderProjectProvider } from "@/lib/integrations/provider-projects";

/** Display label for a catalog provider. */
export function providerDisplayName(provider: ProviderProjectProvider): string {
  switch (provider) {
    case "chatgpt":
      return "ChatGPT";
    case "claude":
      return "Claude";
    case "cursor":
      return "Cursor";
  }
}

/**
 * Friendly source-project label for a thread's `projectContext`, resolving
 * catalog external ids to names when possible. Null when unset.
 */
export function resolveSourceProjectLabel(
  projectContext: string | null | undefined,
  catalog: Array<{ name: string; projectId: string }> = [],
): string | null {
  const raw = projectContext?.trim();
  if (!raw) return null;
  const match = catalog.find((p) => p.name === raw || p.projectId === raw);
  return match?.name ?? raw;
}

/** Who first registered a catalog project. */
export type ProviderProjectSource = "penopta_sync" | "skill";

export const PROVIDER_PROJECT_SOURCE_LABEL: Record<
  ProviderProjectSource,
  string
> = {
  penopta_sync: "MacOS app",
  skill: "Skill",
};

/** Public catalog row shape for integrations UI (no DB types). */
export type AvailableProviderProject = {
  id: string;
  provider: ProviderProjectProvider;
  projectId: string;
  name: string;
  createdAt: string | null;
  source: ProviderProjectSource | null;
  tracked: boolean;
};
