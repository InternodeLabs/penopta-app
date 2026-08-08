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
