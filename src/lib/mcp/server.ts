import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import { getPublicAppUrl } from "@/lib/integrations/providers";
import type { ApiKeyOwner } from "@/lib/keys/data";
import {
  mcpGetProjectContext,
  mcpGetThread,
  mcpListProjects,
  mcpSearchThreads,
} from "@/lib/mcp/data";

/** A tool result carrying JSON that the model can parse. */
function jsonResult(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

/** A tool result flagged as an error (e.g. not found). */
function errorResult(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true,
  };
}

/** Public URL for a thread, used as the citation link in `fetch`. */
function threadUrl(threadId: string): string {
  return `${getPublicAppUrl()}/threads/${threadId}`;
}

/**
 * Register Penopta's read tools on an MCP server, scoped to the org the API key
 * belongs to. Called per request with a freshly resolved key owner.
 */
export function buildPenoptaMcpServer(
  server: McpServer,
  owner: ApiKeyOwner,
): void {
  server.registerTool(
    "list_projects",
    {
      title: "List projects",
      description:
        "List the Penopta projects you can see, with their ids and summaries. " +
        "Start here to find the project a question is about, then call " +
        "get_project_context with the id or slug.",
      inputSchema: z.object({
        query: z
          .string()
          .optional()
          .describe("Optional text to filter projects by name, summary, or slug."),
      }),
    },
    async ({ query }) => jsonResult(await mcpListProjects(owner, query)),
  );

  server.registerTool(
    "get_project_context",
    {
      title: "Get project context",
      description:
        "Return a project plus condensed context from every conversation thread " +
        "linked to it (objectives, status summaries, next actions, open " +
        "questions). Use this to ground an answer in what has actually happened " +
        "on the project.",
      inputSchema: z.object({
        project: z
          .string()
          .describe("Project id (UUID) or slug, as returned by list_projects."),
      }),
    },
    async ({ project }) => {
      const context = await mcpGetProjectContext(owner, project);
      if (!context) return errorResult(`No visible project matching "${project}".`);
      return jsonResult(context);
    },
  );

  server.registerTool(
    "search_threads",
    {
      title: "Search threads",
      description:
        "Search conversation threads by keywords, optionally scoped to one " +
        "project. Returns matching threads with a snippet and their internal " +
        "thread ids; follow up with get_thread for full detail.",
      inputSchema: z.object({
        query: z.string().describe("Keywords to search for."),
        project: z
          .string()
          .optional()
          .describe("Optional project id or slug to limit the search to."),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Max results to return (default 20)."),
      }),
    },
    async ({ query, project, limit }) =>
      jsonResult(
        await mcpSearchThreads(owner, query, { projectRef: project, limit }),
      ),
  );

  server.registerTool(
    "get_thread",
    {
      title: "Get thread",
      description:
        "Return the full detail of a single thread by its internal id: working " +
        "state (decisions, completed work, artifacts, open questions) and the " +
        "full activity log.",
      inputSchema: z.object({
        thread_id: z
          .string()
          .describe("Internal thread id (the threadId field from other tools)."),
      }),
    },
    async ({ thread_id }) => {
      const thread = await mcpGetThread(owner, thread_id);
      if (!thread) return errorResult(`No thread found for id "${thread_id}".`);
      return jsonResult(thread);
    },
  );

  // ChatGPT connectors expect tools literally named `search` and `fetch`.
  server.registerTool(
    "search",
    {
      title: "Search",
      description:
        "Search Penopta threads for content relevant to the query. Returns a list " +
        "of results with ids that can be passed to fetch.",
      inputSchema: z.object({
        query: z.string().describe("The search query."),
      }),
    },
    async ({ query }) => {
      const matches = await mcpSearchThreads(owner, query, { limit: 20 });
      const results = matches.map((m) => ({
        id: m.threadId,
        title: m.title,
        url: threadUrl(m.threadId),
      }));
      return jsonResult({ results });
    },
  );

  server.registerTool(
    "fetch",
    {
      title: "Fetch",
      description:
        "Fetch the full text of a single Penopta thread by the id returned from " +
        "search.",
      inputSchema: z.object({
        id: z.string().describe("The thread id returned by search."),
      }),
    },
    async ({ id }) => {
      const thread = await mcpGetThread(owner, id);
      if (!thread) return errorResult(`No thread found for id "${id}".`);

      const lines: string[] = [];
      if (thread.statusSummary) lines.push(`Status: ${thread.statusSummary}`);
      if (thread.objective) lines.push(`Objective: ${thread.objective}`);
      if (thread.nextAction) lines.push(`Next action: ${thread.nextAction}`);
      if (thread.openQuestions.length)
        lines.push(`Open questions:\n- ${thread.openQuestions.join("\n- ")}`);
      lines.push("");
      lines.push("Conversation:");
      for (const a of thread.activity) {
        const when = a.timestamp ? `[${a.timestamp}] ` : "";
        lines.push(`${when}${a.role}: ${a.text}`);
      }

      return jsonResult({
        id: thread.threadId,
        title: thread.title,
        text: lines.join("\n"),
        url: threadUrl(thread.threadId),
        metadata: {
          kind: thread.kind,
          status: thread.status,
          agent: thread.agent,
          lastSyncedAt: thread.lastSyncedAt,
        },
      });
    },
  );
}
