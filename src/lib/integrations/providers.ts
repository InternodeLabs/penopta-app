/**
 * Integration setup copy — edit this file to change instructions and URLs.
 * Skill URL gains `key=…` after the user mints an API key.
 */

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
  icon: string;
  /** Page title on the setup screen */
  setupTitle: string;
  /** Intro paragraph under the title */
  intro: string;
  /** Numbered steps */
  steps: string[];
  /** Extra notes at the bottom */
  notes?: string[];
  /** Optional “having trouble?” helper with an external guided link */
  troubleHelp?: IntegrationTroubleHelp;
};

/** Skillbase skill agents install to work with Penopta. */
export const PENOPTA_SKILL_URL =
  "https://app.skillbase.club/skills/6aabc487-6ff3-43b4-8aa7-dd41ed8f85bc?raw=1";

/** Append the user's minted key to the skill URL as `key=…`. */
export function skillUrlWithKey(key: string): string {
  const url = new URL(PENOPTA_SKILL_URL);
  url.searchParams.set("key", key);
  return url.toString();
}

/** Same as `skillUrlWithKey`, but `key` is replaced with asterisks for display. */
export function skillUrlWithMaskedKey(key: string): string {
  const url = new URL(PENOPTA_SKILL_URL);
  url.searchParams.set("key", "*".repeat(Math.min(Math.max(key.length, 12), 40)));
  return url.toString();
}

/** Prefilled Claude chat that walks the user through Penopta routine setup. */
export function claudeInstallHelpHref(): string {
  const prompt = [
    "Walk me through setting up a Penopta sync routine in Claude.",
    "I want to create a routine named \"Penopta Local Sync\" (local) or \"Penopta Cloud Sync\" (cloud).",
    "I'll paste a Penopta skill URL into the Instructions field, and I want the schedule set to Hourly.",
    "Claude's UI may have changed — show me the current steps to create this routine and point out where each setting lives.",
  ].join(" ");

  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
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
      icon: "C",
      setupTitle: "Connect Claude",
      intro:
        "Mint a personal key, then create a Claude routine that runs hourly and paste the skill URL into its instructions.",
      steps: [
        "Mint your personal key (re-mint or invalidate anytime).",
        "Copy the skill URL — it includes your key.",
        "In Claude, go to Routines and create a new routine.",
        'Name it "Penopta Local Sync" for a local routine, or "Penopta Cloud Sync" for a cloud one.',
        "Paste the skill URL into the Instructions field.",
        "Set the schedule to Hourly, then create the routine.",
      ],
      notes: [
        
      ],
      troubleHelp: {
        text: "Claude UI can change. Use Claude's own chat for up-to-date setup instructions.",
        linkLabel: "Ask Claude for guidance",
        href: claudeInstallHelpHref(),
      },
    },
    {
      id: "chatgpt",
      name: "ChatGPT",
      byline: "by OpenAI",
      description:
        "Connect ChatGPT to leverage GPT-4 capabilities for intelligent agent interactions.",
      iconBg: "bg-[#10a37f]",
      icon: "G",
      setupTitle: "Connect ChatGPT",
      intro:
        "Mint a personal key, then copy the skill URL into ChatGPT so it can install the Penopta skill and post as you.",
      steps: [
        "Mint your personal key (re-mint or invalidate anytime).",
        "Copy the skill URL — it includes your key.",
        "In ChatGPT, open the GPT or chat you want to connect.",
        "Paste the URL and ask ChatGPT to install or load the skill.",
      ],
    },
  ];
}

export function getIntegrationProvider(
  id: string,
): IntegrationProvider | undefined {
  return listIntegrationProviders().find((p) => p.id === id);
}
