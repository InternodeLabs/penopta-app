/**
 * Integration setup copy — edit this file to change instructions and URLs.
 * Both Claude and ChatGPT use the same pasteable instructions (skill URL +
 * bearer key + endpoint); only the step-by-step setup copy differs. Claude
 * pastes them into a Routine; ChatGPT pastes them into a scheduled task.
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

function maskKey(key: string): string {
  return "*".repeat(Math.min(Math.max(key.length, 12), 40));
}

/** Append the user's minted key to the skill URL as `key=…`. */
export function skillUrlWithKey(
  key: string,
  appUrl: string = getPublicAppUrl(),
): string {
  const url = new URL(getPenoptaSkillUrl(appUrl));
  url.searchParams.set("key", key);
  return url.toString();
}

/** Same as `skillUrlWithKey`, but `key` is replaced with asterisks for display. */
export function skillUrlWithMaskedKey(
  key: string,
  appUrl: string = getPublicAppUrl(),
): string {
  const url = new URL(getPenoptaSkillUrl(appUrl));
  url.searchParams.set("key", maskKey(key));
  return url.toString();
}

/** Pasteable sync instructions (skill + bearer token + curl). */
export function syncRoutineInstructions(
  key: string,
  appUrl: string = getPublicAppUrl(),
): string {
  const base = appUrl.replace(/\/+$/, "");
  const skillUrl = getPenoptaSkillUrl(base);
  const endpoint = `${base}/api/v1/agent-sync`;
  return [
    `Use this skill ${skillUrl} to review my recent conversations. It describes the format we expect in json.`,
    "",
    "Endpoint: POST",
    `Use this as the bearer token: ${key}`,
    "",
    "Example as cURL:",
    "",
    `curl -X POST ${endpoint} \\`,
    `  -H "Authorization: Bearer ${key}" \\`,
    `  -H "Content-Type: application/json" \\`,
    "  -d @payload.json",
  ].join("\n");
}

/** Same instructions with the key redacted for on-screen display. */
export function syncRoutineInstructionsMasked(
  key: string,
  appUrl: string = getPublicAppUrl(),
): string {
  return syncRoutineInstructions(maskKey(key), appUrl);
}

/** Prefilled Claude chat that walks the user through Penopta routine setup. */
export function claudeInstallHelpHref(): string {
  const prompt = [
    "Walk me through setting up a Penopta sync routine in Claude.",
    "I want to create a routine named \"Penopta Local Sync\" (local) or \"Penopta Cloud Sync\" (cloud).",
    "I'll paste Penopta instructions (skill URL, bearer token, and endpoint) into the Instructions field, and I want the schedule set to Hourly.",
    "Claude's UI may have changed — show me the current steps to create this routine and point out where each setting lives.",
  ].join(" ");

  return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
}

/** Prefilled ChatGPT chat that walks the user through a Penopta scheduled task. */
export function chatgptInstallHelpHref(): string {
  const prompt = [
    "Walk me through setting up a Penopta sync as a ChatGPT scheduled task.",
    'I want to create a scheduled task named "Penopta Sync".',
    "I'll paste Penopta instructions (skill URL, bearer token, and endpoint) into the task description, set it to run in a new chat, and set the schedule to repeat Hourly.",
    "ChatGPT's UI may have changed — show me the current steps to open Scheduled tasks, create one manually, and point out where each setting lives.",
  ].join(" ");

  return `https://chatgpt.com/?q=${encodeURIComponent(prompt)}`;
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
        "Mint a personal key, then create a Claude routine that runs hourly and paste the instructions into its Instructions field.",
      steps: [
        "Mint your personal key (re-mint or invalidate anytime).",
        "Copy the Instructions below — they include the skill, your bearer token, and the sync endpoint.",
        "In Claude, go to Routines and create a new routine.",
        'Name it "Penopta Local Sync" for a local routine, or "Penopta Cloud Sync" for a cloud one.',
        "Paste the Instructions into the routine’s Instructions field.",
        "Set the schedule to Hourly, then create the routine.",
      ],
      notes: [],
      troubleHelp: {
        text: "Use Claude's own chat for up-to-date setup instructions:",
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
        "Mint a personal key, then create a ChatGPT scheduled task that runs hourly and paste the instructions into its description.",
      steps: [
        "Mint your personal key (re-mint or invalidate anytime).",
        "Copy the Instructions below — they include the skill, your bearer token, and the sync endpoint.",
        "In ChatGPT, open Scheduled tasks, click Create, and choose “Set up manually”.",
        'Name the task "Penopta Sync".',
        "Paste the Instructions into the “Describe what ChatGPT should do” field.",
        "Under Details, set Runs in to “New chat”.",
        "Under Frequency, set Repeat to Hourly, then save the task.",
      ],
      notes: [],
      troubleHelp: {
        text: "Use ChatGPT's own chat for up-to-date setup instructions:",
        linkLabel: "Ask ChatGPT for guidance",
        href: chatgptInstallHelpHref(),
      },
    },
  ];
}

export function getIntegrationProvider(
  id: string,
): IntegrationProvider | undefined {
  return listIntegrationProviders().find((p) => p.id === id);
}
