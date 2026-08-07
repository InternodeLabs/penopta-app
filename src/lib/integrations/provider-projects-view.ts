import type { ProviderProjectProvider } from "@/lib/integrations/provider-projects";

/** Who first registered a catalog project. */
export type ProviderProjectSource = "penopta_sync" | "skill";

export const PROVIDER_PROJECT_SOURCE_LABEL: Record<
  ProviderProjectSource,
  string
> = {
  penopta_sync: "Penopta Sync",
  skill: "Scheduled skill",
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
