import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";

import {
  catalogProviderForAgent,
  ensureCatalogFromAgentThreads,
  listKnownProviderProjects,
  listTrackedProviderProjects,
  makeProviderProjectsAvailable,
} from "@/lib/integrations/provider-projects-data";
import { PROVIDER_PROJECT_PROVIDERS } from "@/lib/integrations/provider-projects";
import { getPublicAppUrl } from "@/lib/integrations/providers";
import {
  DuplicateRunError,
  ingestAgentSync,
  isPrivateProjectName,
  isPrivateThreadTitle,
  resolveThreadProjectName,
} from "@/lib/ingest/data";
import {
  agentSyncPayloadSchema,
  toTrackThreadSyncPayload,
  trackThreadPayloadSchema,
} from "@/lib/ingest/schema";
import type { ApiKeyOwner } from "@/lib/keys/data";
import {
  mcpGetProjectContext,
  mcpGetThread,
  mcpListProjects,
  mcpSearchThreads,
} from "@/lib/mcp/data";
import { markTokenVerified } from "@/lib/oauth/tokens";
import { getAgentThreadByExternalId } from "@/lib/threads/data";

const providerSchema = z.enum(PROVIDER_PROJECT_PROVIDERS);

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
  accessTokenHash?: string,
): void {
  server.registerTool(
    "verify_penopta",
    {
      title: "Verify Penopta connection",
      description:
        "Confirm that the Penopta MCP server is installed and reachable. Needs no " +
        "other tools first. A successful result means the connection is " +
        "authenticated and working; it echoes the connected user and org so you " +
        "can confirm you're pointed at the right account. Pass `agent` with your " +
        "own name (e.g. \"claude\", \"chatgpt\", \"cursor\") so the verification is " +
        "attributed to the right client. Call this when the user asks whether the " +
        "Penopta tool/connector is set up correctly.",
      inputSchema: z.object({
        agent: z
          .string()
          .min(1)
          .optional()
          .describe(
            'The agent/client running this check, e.g. "claude", "chatgpt", "cursor".',
          ),
      }),
    },
    async ({ agent }) => {
      if (accessTokenHash) {
        await markTokenVerified(accessTokenHash, agent ?? null);
      }
      return jsonResult({
        ok: true,
        server: "penopta",
        message: "Penopta MCP connection is installed and authenticated.",
        agent: agent ?? null,
        ownerUserId: owner.ownerUserId,
        orgId: owner.orgId,
        verifiedAt: new Date().toISOString(),
      });
    },
  );

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

  server.registerTool(
    "known_projects",
    {
      title: "Known provider projects",
      description:
        "List provider projects Penopta already has in its available catalog " +
        "for chatgpt or claude. Call this during sync discovery, then push only " +
        "unknown projects via make_projects_available. Returns metadata only " +
        "(projectId, name, createdAt, tracked, private) — no transcripts.",
      inputSchema: z.object({
        provider: providerSchema.describe(
          'Which provider catalog to read: "chatgpt" or "claude".',
        ),
      }),
    },
    async ({ provider }) =>
      jsonResult({
        provider,
        projects: await listKnownProviderProjects(owner.orgId, provider),
      }),
  );

  server.registerTool(
    "make_projects_available",
    {
      title: "Make provider projects available",
      description:
        "Register unknown provider projects in Penopta's available catalog. " +
        "Send metadata only: projectId (stable provider id), name, and optional " +
        "createdAt. Do not send transcripts. Upserts by projectId; does not " +
        "change tracking. Never include projects whose names start with p: or " +
        "private: (case-insensitive) — those are skipped and not stored.",
      inputSchema: z.object({
        provider: providerSchema.describe(
          'Which provider these projects come from: "chatgpt" or "claude".',
        ),
        projects: z
          .array(
            z.object({
              projectId: z
                .string()
                .min(1)
                .describe(
                  "Stable provider project id used later to list threads in the project.",
                ),
              name: z.string().min(1).describe("Display name of the project."),
              createdAt: z
                .string()
                .nullable()
                .optional()
                .describe("ISO-8601 created time if known, otherwise omit/null."),
            }),
          )
          .min(1)
          .describe("Unknown projects to add or refresh in the catalog."),
      }),
    },
    async ({ provider, projects }) => {
      const result = await makeProviderProjectsAvailable(
        owner.ownerUserId,
        owner.orgId,
        provider,
        projects.map((p) => ({ ...p, source: "skill" as const })),
      );
      return jsonResult({
        ok: true,
        provider,
        inserted: result.inserted,
        updated: result.updated,
        skippedPrivate: result.skippedPrivate,
        projects: result.projects,
      });
    },
  );

  server.registerTool(
    "tracked_projects",
    {
      title: "Tracked provider projects",
      description:
        "Return the provider projects the user opted to track for transcript " +
        "sync. Sync only threads that belong to these projects. Private-prefixed " +
        "projects are never included or stored.",
      inputSchema: z.object({
        provider: providerSchema.describe(
          'Which provider catalog to read: "chatgpt" or "claude".',
        ),
      }),
    },
    async ({ provider }) =>
      jsonResult({
        provider,
        projects: await listTrackedProviderProjects(owner.orgId, provider),
      }),
  );

  server.registerTool(
    "sync_threads",
    {
      title: "Sync threads",
      description:
        "Deliver a windowed thread-context sync to Penopta. Prefer this over the " +
        "curl/HTTP endpoint: identity and target org are taken from your " +
        "authenticated connection, so no API key or bearer token is needed and " +
        "none should be included in the payload. Send the same JSON described in " +
        "the sync skill (schemaVersion, runId, window, agent, captureCoverage, " +
        "threads, runSummary). Only include threads from projects returned by " +
        "tracked_projects. Runs are idempotent by runId. On success it " +
        "returns { ok: true, checkpoint }; save the checkpoint before the next " +
        "run and treat any error result as a failed delivery.",
      inputSchema: agentSyncPayloadSchema,
    },
    async (payload) => {
      if (
        payload.penopta_user_id &&
        payload.penopta_user_id !== owner.ownerUserId
      ) {
        return errorResult(
          "penopta_user_id does not match the authenticated user. Omit it — " +
            "identity is resolved from your connection.",
        );
      }
      try {
        const { run, threadsUpserted } = await ingestAgentSync(
          owner.ownerUserId,
          owner.orgId,
          payload,
        );
        const catalogProvider = catalogProviderForAgent({
          agentName: payload.agent.name,
          kind: payload.threads[0]?.kind,
        });
        if (catalogProvider) {
          await ensureCatalogFromAgentThreads(
            owner.ownerUserId,
            owner.orgId,
            catalogProvider,
          );
        }
        const checkpoint = run.windowEnd.toISOString();
        return jsonResult({
          ok: true,
          runId: run.runId,
          syncRunId: run.id,
          threadsUpserted,
          checkpoint,
          cursor: checkpoint,
        });
      } catch (err) {
        if (err instanceof DuplicateRunError) {
          const checkpoint = err.existing.windowEnd.toISOString();
          return jsonResult({
            ok: true,
            runId: err.existing.runId,
            syncRunId: err.existing.id,
            duplicate: true,
            checkpoint,
            cursor: checkpoint,
          });
        }
        console.error("mcp sync_threads", err);
        return errorResult("Failed to ingest sync payload.");
      }
    },
  );

  server.registerTool(
    "penopta_track_thread",
    {
      title: "Track thread",
      description:
        "Push a single conversation thread into Penopta for later use " +
        "(search, project context, handoffs). Call this when the user asks to " +
        "track, save, or sync this chat — including standalone chats outside " +
        "tracked projects. Build a concise workingState handoff and include " +
        "exact visible transcript turns in sourceActivity (isExact: true). " +
        "Use a stable provider threadId when known. Never send threads whose " +
        "title (or projectName) starts with P: or Private:. Identity comes " +
        "from your authenticated connection — no API key or penopta_user_id.",
      inputSchema: trackThreadPayloadSchema,
    },
    async (input) => {
      if (isPrivateThreadTitle(input.thread.title)) {
        return errorResult(
          "This thread title starts with P: or Private: and cannot be tracked.",
        );
      }
      const projectName = resolveThreadProjectName(input.thread);
      if (projectName && isPrivateProjectName(projectName)) {
        return errorResult(
          "This thread belongs to a private-prefixed project and cannot be tracked.",
        );
      }

      const payload = toTrackThreadSyncPayload(input);
      try {
        const { run, threadsUpserted } = await ingestAgentSync(
          owner.ownerUserId,
          owner.orgId,
          payload,
        );
        if (threadsUpserted === 0) {
          return errorResult(
            "Thread was not stored (private filters). Nothing was tracked.",
          );
        }

        const catalogProvider = catalogProviderForAgent({
          agentName: payload.agent.name,
          kind: input.thread.kind,
        });
        if (catalogProvider) {
          await ensureCatalogFromAgentThreads(
            owner.ownerUserId,
            owner.orgId,
            catalogProvider,
          );
        }

        const stored = await getAgentThreadByExternalId(
          owner.orgId,
          input.thread.threadId,
        );
        const internalId = stored?.id ?? null;
        return jsonResult({
          ok: true,
          tracked: true,
          runId: run.runId,
          syncRunId: run.id,
          externalThreadId: input.thread.threadId,
          threadId: internalId,
          title: input.thread.title,
          url: internalId ? threadUrl(internalId) : null,
        });
      } catch (err) {
        if (err instanceof DuplicateRunError) {
          const stored = await getAgentThreadByExternalId(
            owner.orgId,
            input.thread.threadId,
          );
          const internalId = stored?.id ?? null;
          return jsonResult({
            ok: true,
            tracked: true,
            duplicate: true,
            runId: err.existing.runId,
            syncRunId: err.existing.id,
            externalThreadId: input.thread.threadId,
            threadId: internalId,
            title: input.thread.title,
            url: internalId ? threadUrl(internalId) : null,
          });
        }
        console.error("mcp penopta_track_thread", err);
        return errorResult("Failed to track thread.");
      }
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
