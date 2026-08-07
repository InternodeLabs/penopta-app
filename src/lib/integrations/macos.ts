import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { agentSyncRuns } from "@/lib/db/schema";
import { PENOPTA_SYNC_AGENT_ID } from "@/lib/integrations/provider-projects-data";
import { getPublicAppUrl } from "@/lib/integrations/providers";

/**
 * Served from `public/downloads/Penopta-Sync.zip` in this repo.
 * Override with PENOPTA_SYNC_DOWNLOAD_URL (e.g. a GitHub Release asset) if needed.
 */
export function getPenoptaSyncDownloadUrl(): string {
  const explicit = process.env.PENOPTA_SYNC_DOWNLOAD_URL?.trim();
  if (explicit) return explicit;
  return `${getPublicAppUrl()}/downloads/Penopta-Sync.zip`;
}

export const macosIntegration = {
  id: "macos" as const,
  name: "macOS App",
  byline: "Penopta Sync",
  description:
    "The macOS app lets you sync the threads you choose that are unavailable to skills or mcp agents.",
  setupTitle: "Install Penopta Sync",
  intro:
    "Penopta Sync is a menu-bar app for Mac. It reads local Claude Code and Codex sessions you choose, then uploads them to your Penopta org with the same private-prefix skip rules (P: / Private:).",
  iconBg: "bg-[#FF8100]",
  steps: [
    "Download **Penopta Sync** for macOS (a zip), then unzip it.",
    "Open **Penopta Sync.app** (first time: Right-click → Open if macOS blocks it).",
    "Sign in with Penopta from the menu-bar panel (use the same account as this workspace).",
    "Grant folder access for **Claude Code** and/or **Codex**, then press **Sync**.",
    "Return here — once a sync lands, this integration shows as installed.",
  ],
  notes: [
    "Point the app at this Penopta URL if you are not on production: " +
      getPublicAppUrl() +
      " (Connection settings in the gear).",
    "Sessions titled or living under projects prefixed with P: or Private: are never uploaded.",
  ],
};

export type PenoptaSyncInstallStatus = {
  installed: boolean;
  lastSyncedAt: Date | null;
  lastAgentName: string | null;
};

/** True once this org has received at least one upload from the macOS app. */
export async function getPenoptaSyncInstallStatus(
  orgId: string,
): Promise<PenoptaSyncInstallStatus> {
  const [match] = await db
    .select({
      createdAt: agentSyncRuns.createdAt,
      agentName: agentSyncRuns.agentName,
    })
    .from(agentSyncRuns)
    .where(
      and(
        eq(agentSyncRuns.orgId, orgId),
        eq(agentSyncRuns.agentId, PENOPTA_SYNC_AGENT_ID),
      ),
    )
    .orderBy(desc(agentSyncRuns.createdAt))
    .limit(1);

  if (!match) {
    return { installed: false, lastSyncedAt: null, lastAgentName: null };
  }
  return {
    installed: true,
    lastSyncedAt: match.createdAt,
    lastAgentName: match.agentName,
  };
}
