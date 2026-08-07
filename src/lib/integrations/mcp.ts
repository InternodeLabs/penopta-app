/**
 * MCP integration page copy + catalog of Penopta MCP tools.
 * Keep tool names/descriptions aligned with `src/lib/mcp/server.ts`.
 */

import type { ComponentType } from "react";

import Apple from "@/components/icons/Apple";
import { macosIntegration } from "@/lib/integrations/macos";
import {
  listIntegrationProviders,
  type IntegrationProvider,
} from "@/lib/integrations/providers";

export type McpToolCategory =
  | "connection"
  | "read"
  | "sync"
  | "chatgpt-compat";

export type McpToolInfo = {
  name: string;
  title: string;
  category: McpToolCategory;
  /** Short plain-language explanation for the integrations page. */
  summary: string;
  /** When an agent would typically call this. */
  whenToUse: string;
};

export const mcpIntegration = {
  id: "mcp" as const,
  name: "MCPs",
  byline: "Penopta connector tools",
  description:
    "Commands your agents can call after you add Penopta as an MCP server in Claude, ChatGPT, or another client.",
  setupTitle: "Penopta MCP tools",
  intro:
    "Once Penopta is connected as an MCP server, agents can verify the link, read project and thread context, discover and sync provider projects, and push a single chat on demand. Identity and org come from the OAuth connection — no API key to paste.",
  iconBg: "bg-zinc-800",
};

export const MCP_TOOL_CATEGORY_LABELS: Record<McpToolCategory, string> = {
  connection: "Connection",
  read: "Read & search",
  sync: "Sync & track",
  "chatgpt-compat": "ChatGPT search / fetch",
};

/** Setup destinations shown above the tool list. */
export type McpSetupLink = {
  id: string;
  label: string;
  href: string;
  byline: string;
  iconBg: string;
  icon: ComponentType<{ className?: string }>;
};

function setupLabelForProvider(provider: IntegrationProvider): string {
  if (provider.id === "claude") return "Integrate Claude";
  if (provider.id === "chatgpt") return "Integrate OpenAI";
  return `Integrate ${provider.name}`;
}

export function listMcpSetupLinks(): McpSetupLink[] {
  const providers = listIntegrationProviders();
  return [
    ...providers.map((provider) => ({
      id: provider.id,
      label: setupLabelForProvider(provider),
      href: `/integrations/${provider.id}`,
      byline: provider.byline,
      iconBg: provider.iconBg,
      icon: provider.icon,
    })),
    {
      id: macosIntegration.id,
      label: macosIntegration.name,
      href: `/integrations/${macosIntegration.id}`,
      byline: macosIntegration.byline,
      iconBg: macosIntegration.iconBg,
      icon: Apple,
    },
  ];
}

export function listMcpTools(): McpToolInfo[] {
  return [
    {
      name: "verify_penopta",
      title: "Verify Penopta connection",
      category: "connection",
      summary:
        "Confirms the MCP connector is installed, signed in, and talking to the right Penopta user and org.",
      whenToUse:
        "When you ask whether Penopta is set up correctly, or during first-time connector setup.",
    },
    {
      name: "list_projects",
      title: "List projects",
      category: "read",
      summary:
        "Lists Penopta projects you can see, with ids, slugs, and summaries.",
      whenToUse:
        "To find which project a question is about before pulling deeper context.",
    },
    {
      name: "get_project_context",
      title: "Get project context",
      category: "read",
      summary:
        "Returns a project plus condensed context from its linked threads — objectives, status, next actions, and open questions.",
      whenToUse:
        "To ground an answer in what has actually happened on a project.",
    },
    {
      name: "search_threads",
      title: "Search threads",
      category: "read",
      summary:
        "Searches conversation threads by keywords, optionally limited to one project.",
      whenToUse:
        "When you need matching threads and snippets, then follow up with get_thread for full detail.",
    },
    {
      name: "get_thread",
      title: "Get thread",
      category: "read",
      summary:
        "Returns full detail for one thread: working state, decisions, artifacts, open questions, and the activity log.",
      whenToUse: "After search_threads (or when you already know the thread id).",
    },
    {
      name: "known_projects",
      title: "Known provider projects",
      category: "sync",
      summary:
        "Lists ChatGPT or Claude projects already in Penopta’s available catalog (metadata only — no transcripts).",
      whenToUse:
        "During sync discovery, before registering unknown projects with make_projects_available.",
    },
    {
      name: "make_projects_available",
      title: "Make provider projects available",
      category: "sync",
      summary:
        "Registers unknown provider projects in the catalog (id, name, optional created time). Does not change tracking. Skips P: / Private: names.",
      whenToUse:
        "When discovery finds projects Penopta does not know about yet.",
    },
    {
      name: "tracked_projects",
      title: "Tracked provider projects",
      category: "sync",
      summary:
        "Returns the provider projects you opted to track for transcript sync.",
      whenToUse:
        "Before a sync run — only threads from these projects should be delivered.",
    },
    {
      name: "penopta_sync_now",
      title: "Sync now",
      category: "sync",
      summary:
        "Starts an immediate sync window in the current chat (does not wait for the hourly schedule). Returns the window, tracked projects, and steps to run; delivery still uses sync_threads.",
      whenToUse:
        "When you ask to sync now, refresh Penopta, or run sync outside the schedule.",
    },
    {
      name: "sync_threads",
      title: "Sync threads",
      category: "sync",
      summary:
        "Delivers a windowed batch of thread context to Penopta. Identity and org come from the authenticated connector — no API key. Idempotent by runId.",
      whenToUse:
        "The write path for hourly (and sync-now) runs after collecting threads from tracked projects.",
    },
    {
      name: "penopta_track_thread",
      title: "Track thread",
      category: "sync",
      summary:
        "Pushes a single conversation into Penopta for later search, project context, and handoffs — including standalone chats outside tracked projects.",
      whenToUse:
        "When you ask to track, save, or sync this chat live. Not used by the hourly bulk skill.",
    },
    {
      name: "search",
      title: "Search",
      category: "chatgpt-compat",
      summary:
        "ChatGPT-connector-shaped search over Penopta threads. Returns result ids for fetch.",
      whenToUse:
        "Used by ChatGPT’s expected search/fetch connector pair; same idea as search_threads.",
    },
    {
      name: "fetch",
      title: "Fetch",
      category: "chatgpt-compat",
      summary:
        "Fetches the full text of one Penopta thread by an id returned from search.",
      whenToUse:
        "The companion to search for ChatGPT connectors; similar to get_thread.",
    },
  ];
}

export function listMcpToolsByCategory(): {
  category: McpToolCategory;
  label: string;
  tools: McpToolInfo[];
}[] {
  const tools = listMcpTools();
  const order: McpToolCategory[] = [
    "connection",
    "read",
    "sync",
    "chatgpt-compat",
  ];
  return order.map((category) => ({
    category,
    label: MCP_TOOL_CATEGORY_LABELS[category],
    tools: tools.filter((t) => t.category === category),
  }));
}
