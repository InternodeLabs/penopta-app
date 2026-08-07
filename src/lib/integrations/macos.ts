import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { agentSyncRuns } from "@/lib/db/schema";
import type { ProviderProjectProvider } from "@/lib/integrations/provider-projects";
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
  name: "MacOS",
  byline: "Penopta Sync",
  description:
    "The macOS app lets you sync the threads you choose that are unavailable to skills or mcp agents.",
  setupTitle: "Install Penopta Sync",
  intro:
    "Penopta Sync is a menu-bar app for Mac. It reads local Claude Code and Codex sessions you choose, then uploads them to your Penopta org with the same private-prefix skip rules (P: / Private:).",
  iconBg: "bg-black",
  steps: [
    "Download **Penopta Sync** for macOS (a zip), then unzip it.",
    "In Finder, **Right-click** (or Control-click) **Penopta Sync.app** → **Open**. Don’t double-click the first time — macOS blocks unsigned downloads that way.",
    "If macOS still says it can’t be opened, go to **System Settings → Privacy & Security**, scroll to the message about Penopta Sync, and click **Open Anyway**. Confirm with **Open** when asked.",
    "Sign in with Penopta from the menu-bar panel (use the same account as this workspace).",
    "Grant folder access for **Claude Code** and/or **Codex**, then press **Sync**.",
    "Return here — once a sync lands, this integration shows as installed.",
  ],
  notes: [
    "This app is not from the Mac App Store, so Gatekeeper may warn once. After you Open / Open Anyway, normal launches work.",
    "Point the app at this Penopta URL if you are not on production: " +
      getPublicAppUrl() +
      " (Connection settings in the gear).",
    "Sessions titled or living under projects prefixed with P: or Private: are never uploaded.",
  ],
};

const MACOS_INSTALL_HELP_PROMPT = [
  "Walk me through installing and setting up Penopta Sync on macOS.",
  "Penopta Sync is a menu-bar app (not from the Mac App Store) that syncs local Claude Code and Codex sessions into Penopta.",
  "I will download a zip, unzip it, then open Penopta Sync.app.",
  "Because it is unsigned/not notarized yet, macOS Gatekeeper may block it: I should Right-click → Open the first time, and if still blocked go to System Settings → Privacy & Security → Open Anyway.",
  "Then I sign in with the same Penopta account as the web app, grant folder access for Claude Code and/or Codex, and press Sync.",
  "macOS UI labels may have changed — show me the current steps and where each setting lives.",
].join(" ");

/** Prefill Claude with macOS Penopta Sync install help. */
export function claudeMacosInstallHelpHref(): string {
  return `https://claude.ai/new?q=${encodeURIComponent(MACOS_INSTALL_HELP_PROMPT)}`;
}

/** Prefill ChatGPT with macOS Penopta Sync install help. */
export function chatgptMacosInstallHelpHref(): string {
  return `https://chatgpt.com/?q=${encodeURIComponent(MACOS_INSTALL_HELP_PROMPT)}`;
}

/** Agent names the macOS app uses for each integrations provider. */
export function macSyncAgentNamesForProvider(
  provider: ProviderProjectProvider,
): string[] {
  switch (provider) {
    case "claude":
      return ["claude-code", "claude"];
    case "chatgpt":
      // Codex CLI is the local OpenAI agent the mac app syncs today.
      return ["chatgpt", "codex", "openai"];
  }
}

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

/**
 * Whether the macOS app has synced threads for this integrations provider
 * (e.g. Claude Code → Claude, Codex → ChatGPT).
 */
export async function getPenoptaSyncStatusForProvider(
  orgId: string,
  provider: ProviderProjectProvider,
): Promise<PenoptaSyncInstallStatus> {
  const names = macSyncAgentNamesForProvider(provider);
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
        inArray(agentSyncRuns.agentName, names),
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
