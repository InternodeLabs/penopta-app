/**
 * Integration setup copy — edit this file to change instructions and URLs.
 * Both Claude and ChatGPT use the same pasteable instructions (the sync skill
 * inlined; delivery happens through the authenticated Penopta MCP connector, so
 * there's no key or endpoint). Only the step-by-step setup copy differs: Claude
 * pastes them into a Routine; ChatGPT pastes them into a scheduled task.
 */

import type { ComponentType } from "react";

import Anthropic from "@/components/icons/Anthropic";
import OpenAI from "@/components/icons/OpenAI";

export type IntegrationProviderId = "claude" | "chatgpt";

export type CopyField = {
  /** Short label above the field */
  label: string;
  /** Value shown in the copy box (may be a URL or snippet) */
  value: string;
  /** Optional hint under the field */
  hint?: string;
};

export type IntegrationTroubleHelp = {
  /** Helper copy shown before the link */
  text: string;
  /** Link label */
  linkLabel: string;
  /** Destination (e.g. Claude new chat with prefilled prompt) */
  href: string;
};

export type IntegrationProvider = {
  id: IntegrationProviderId;
  name: string;
  byline: string;
  description: string;
  iconBg: string;
  /** Brand glyph rendered inside the colored circle. */
  icon: ComponentType<{ className?: string }>;
  /** Page title on the setup screen */
  setupTitle: string;
  /** Intro paragraph under the title */
  intro: string;
  /** Steps to add Penopta as a live MCP connector */
  mcpSteps: string[];
  /** Numbered steps for the optional scheduled sync */
  steps: string[];
  /** Extra notes at the bottom */
  notes?: string[];
  /** Optional “having trouble?” helper shown at the end of the MCP section */
  mcpTroubleHelp?: IntegrationTroubleHelp;
  /** Opens a new chat in the provider with the verify command prefilled */
  verifyHref?: string;
  /** Optional “having trouble?” helper with an external guided link */
  troubleHelp?: IntegrationTroubleHelp;
  /**
   * Build a “try it now” chat URL that prefills the pasteable sync instructions
   * for a one-off run.
   */
  tryNowHref?: (instructions: string) => string;
};

/**
 * Public origin of this Penopta app (agent-sync endpoint host).
 * Prefers APP_URL, then Vercel host, then local default.
 */
export function getPublicAppUrl(): string {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/\/+$/, "")}`;

  return "http://localhost:3200";
}

/** Hourly sync skill markdown served by this app. */
export function getPenoptaSkillUrl(appUrl: string = getPublicAppUrl()): string {
  return `${appUrl.replace(/\/+$/, "")}/api/v1/sync-skill.md`;
}

/**
 * Remote MCP server URL. This is not a secret — ChatGPT/Claude connect to it as
 * a custom connector and authenticate via OAuth (sign in with Penopta). No key
 * is embedded.
 */
export function mcpConnectorUrl(appUrl: string = getPublicAppUrl()): string {
  return `${appUrl.replace(/\/+$/, "")}/api/mcp`;
}

/**
 * Pasteable sync instructions with the full skill inlined. Delivery is via the
 * authenticated Penopta MCP tool (`sync_threads`) — there is no key, token, or
 * endpoint to configure. The skill is embedded directly rather than linked so
 * the agent doesn't need to fetch a remote URL (some agents refuse remote
 * reads), and inlining keeps the routine fully transparent about what it does.
 */
export function syncRoutineInstructions(skillBody: string): string {
  return [
    "Follow the Penopta sync skill below to review conversations that belong to my projects (skip standalone chats and projects whose names start with P: or Private:) and deliver them to Penopta by calling the Penopta MCP tool `sync_threads`. Your identity and target org come from the authenticated Penopta connector, so there is no key, token, or endpoint to configure — leave all credential fields out.",
    "",
    "----- BEGIN PENOPTA SYNC SKILL -----",
    "",
    skillBody.trim(),
    "",
    "----- END PENOPTA SYNC SKILL -----",
  ].join("\n");
}

/**
 * The one-liner we ask users to send in provider chat so the connector calls
 * `verify_penopta`, which is what unlocks the sync setup on the setup page.
 */
export const VERIFY_CHAT_COMMAND =
  "Run verify_penopta tool";

/** Open Claude with the verify command prefilled. */
export function claudeVerifyHref(): string {
  return `https://claude.ai/new?q=${encodeURIComponent(VERIFY_CHAT_COMMAND)}`;
}

/** Open ChatGPT with the verify command prefilled. */
export function chatgptVerifyHref(): string {
  return `https://chatgpt.com/?q=${encodeURIComponent(VERIFY_CHAT_COMMAND)}`;
}

/** Prefilled Claude chat that walks the user through Penopta routine setup. */
export function claudeInstallHelpHref(): string {
  const prompt = [
    "Walk me through setting up a Penopta sync routine in Claude.",
    "I want to create a routine named \"Penopta Local Sync\" (local) or \"Penopta Cloud Sync\" (cloud).",
    "I'll paste the Penopta sync instructions (a skill that delivers via the Penopta MCP connector — no key or endpoint) into the Instructions field, and I want the schedule set to Hourly.",
    "After creating it, I need to run the routine once and choose \"Always allow\" when Penopta tools ask for permission, so later hourly runs finish without waiting for approval.",
    "Claude's UI may have changed — show me the current steps to create this routine, run it once, and set those permissions, and point out where each setting lives.",
  ].join(" ");

  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
}

/** Prefilled ChatGPT chat that walks the user through a Penopta scheduled task. */
export function chatgptInstallHelpHref(): string {
  const prompt = [
    "Walk me through setting up a Penopta sync as a ChatGPT scheduled task.",
    'I want to create a scheduled task named "Penopta Sync".',
    "I'll paste the Penopta sync instructions (a skill that delivers via the Penopta MCP server — no key or endpoint) into the task description, set it to run in a new chat, and set the schedule to repeat Hourly.",
    "After creating it, I need to run the scheduled task once and choose \"Always allow\" when Penopta tools ask for permission, so later hourly runs finish without waiting for approval.",
    "ChatGPT's UI may have changed — show me the current steps to open Scheduled tasks, create one manually, run it once, and point out where each setting lives.",
  ].join(" ");

  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
}

/** Prefilled Claude chat that walks the user through adding the Penopta MCP connector. */
export function claudeMcpHelpHref(): string {
  const prompt = [
    "Walk me through adding Penopta as a custom MCP connector in Claude.",
    "I want to add a remote MCP server named \"Penopta\" and paste in its remote MCP server URL, then approve the Penopta sign-in (OAuth) prompt.",
    "Claude's UI may have changed — show me the current steps to open Settings > Connectors, add a custom connector, and point out where each setting lives.",
  ].join(" ");

  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
}

/** Prefilled ChatGPT chat that walks the user through adding the Penopta MCP server. */
export function chatgptMcpHelpHref(): string {
  const prompt = [
    "Walk me through adding Penopta as an MCP server in ChatGPT.",
    "I want to add a Streamable HTTP MCP server named \"Penopta\" and paste in its MCP server URL, then approve the Penopta sign-in (OAuth) prompt.",
    "ChatGPT's UI may have changed — show me the current steps to open Settings > Plugins > MCPs, add a server, and point out where each setting lives.",
  ].join(" ");

  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
}

/** Open Claude with the sync instructions prefilled so the user can try a one-off run. */
export function claudeTryNowHref(instructions: string): string {
  return `https://claude.ai/new?q=${encodeURIComponent(instructions)}`;
}

/** Open ChatGPT with the sync instructions prefilled so the user can try a one-off run. */
export function chatgptTryNowHref(instructions: string): string {
  return `https://chatgpt.com/?q=${encodeURIComponent(instructions)}`;
}

export function listIntegrationProviders(): IntegrationProvider[] {
  return [
    {
      id: "claude",
      name: "Claude",
      byline: "by Anthropic",
      description:
        "Connect Claude to power your agents with advanced reasoning and natural conversation.",
      iconBg: "bg-[#d97757]",
      icon: Anthropic,
      setupTitle: "Connect Claude",
      intro:
        "Add Penopta as an MCP connector for live context in chat, and/or optionally set up an hourly sync routine.",
      mcpSteps: [
        "In Claude, open **Settings** and select **Connectors** under Customize.",
        "Click **Add**, then choose **Add custom connector**.",
        'Enter a **Name** (e.g. "Penopta").',
        "Paste the MCP server URL below into **Remote MCP server URL**.",
        "Click **Add**, then approve the Penopta sign-in prompt when asked.",
      ],
      steps: [
        "**Copy the Instructions** below — they contain the full sync skill. Delivery runs through the Penopta MCP connector you added above, so there's no key or token to paste.",
        "In Claude, go to **Routines** and create a new routine.",
        'Name it **"Penopta Local Sync"** for a local routine, or **"Penopta Cloud Sync"** for a cloud one.',
        "Paste the Instructions into the routine’s **Instructions** field.",
        "Set the schedule to **Hourly**, then create the routine.",
        "**Run the routine once** from the Routines list. When Penopta tools ask for permission, choose **Always allow** — hourly runs are unattended, and anything left on “Needs approval” will stop the sync from finishing.",
      ],
      notes: [],
      verifyHref: claudeVerifyHref(),
      mcpTroubleHelp: {
        text: "Need help? Use chat for latest setup instructions:",
        linkLabel: "Ask Claude for guidance",
        href: claudeMcpHelpHref(),
      },
      troubleHelp: {
        text: "Need help? Use chat for latest setup instructions:",
        linkLabel: "Ask Claude for guidance",
        href: claudeInstallHelpHref(),
      },
      tryNowHref: claudeTryNowHref,
    },
    {
      id: "chatgpt",
      name: "ChatGPT",
      byline: "by OpenAI",
      description:
        "Connect ChatGPT to leverage GPT-4 capabilities for intelligent agent interactions.",
      iconBg: "bg-[#10a37f]",
      icon: OpenAI,
      setupTitle: "Connect ChatGPT",
      intro:
        "Add Penopta as an MCP server for live context in chat, or optionally set up an hourly scheduled sync.",
      mcpSteps: [
        "In ChatGPT, open **Settings** and select **Plugins** in the sidebar.",
        "Open the **MCPs** tab, then click **+ Add server**.",
        'Enter a **Name** (e.g. "Penopta").',
        "Choose **Streamable HTTP** as the type.",
        "Paste the MCP server URL below into the **URL** field.",
        "Click **Save**, then approve the Penopta sign-in prompt when asked.",
      ],
      steps: [
        "Copy the Instructions below — they contain the full sync skill. Delivery runs through the Penopta MCP server you added above, so there's no key or token to paste.",
        "In ChatGPT, open Scheduled tasks, click Create, and choose “Set up manually”.",
        'Name the task "Penopta Sync".',
        "Paste the Instructions into the “Describe what ChatGPT should do” field.",
        "Under Details, set Runs in to “New chat”.",
        "Under Frequency, set Repeat to Hourly, then save the task.",
        "**Run the scheduled task now** once. Penopta will ask for your permission on each step. Choose **Always allow**, __anything not approved will stop the sync from running in the future.__",
      ],
      notes: [],
      verifyHref: chatgptVerifyHref(),
      mcpTroubleHelp: {
        text: "Use ChatGPT's own chat for up-to-date setup instructions:",
        linkLabel: "Ask ChatGPT for guidance",
        href: chatgptMcpHelpHref(),
      },
      troubleHelp: {
        text: "Use ChatGPT's own chat for up-to-date setup instructions:",
        linkLabel: "Ask ChatGPT for guidance",
        href: chatgptInstallHelpHref(),
      },
      tryNowHref: chatgptTryNowHref,
    },
  ];
}

export function getIntegrationProvider(
  id: string,
): IntegrationProvider | undefined {
  return listIntegrationProviders().find((p) => p.id === id);
}
