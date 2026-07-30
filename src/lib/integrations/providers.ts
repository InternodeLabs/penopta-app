/**
 * Integration setup copy — edit this file to change instructions and URLs.
 * No DB yet; pages render this content as-is.
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
  /** Copyable values (URLs, tokens placeholders, etc.) */
  copyFields: CopyField[];
  /** Extra notes at the bottom */
  notes?: string[];
};

/** Skillbase skill agents install to work with Penopta. */
export const PENOPTA_SKILL_URL =
  "https://app.skillbase.club/skills/6aabc487-6ff3-43b4-8aa7-dd41ed8f85bc?raw=1";

export function listIntegrationProviders(): IntegrationProvider[] {
  const skillField: CopyField = {
    label: "Skill URL",
    value: PENOPTA_SKILL_URL,
    hint: "Paste this into your agent so it can install the Penopta skill.",
  };

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
        "Copy the skill URL below and give it to Claude so it can install the Penopta skill.",
      steps: [
        "Copy the skill URL below.",
        "In Claude, open the agent / project you want to connect.",
        "Paste the URL and ask Claude to install or load the skill.",
        "Confirm the skill is available, then return to Penopta.",
      ],
      copyFields: [skillField],
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
        "Copy the skill URL below and give it to ChatGPT so it can install the Penopta skill.",
      steps: [
        "Copy the skill URL below.",
        "In ChatGPT, open the GPT or chat you want to connect.",
        "Paste the URL and ask ChatGPT to install or load the skill.",
        "Confirm the skill is available, then return to Penopta.",
      ],
      copyFields: [skillField],
    },
  ];
}

export function getIntegrationProvider(
  id: string,
): IntegrationProvider | undefined {
  return listIntegrationProviders().find((p) => p.id === id);
}
