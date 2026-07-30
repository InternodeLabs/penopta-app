import type { ApiKeyOwner } from "@/lib/keys/data";
import type { AgentThreadRow, ProjectRow } from "@/lib/db/schema";
import { getVisibleProject, listVisibleProjects } from "@/lib/projects/data";
import {
  getAgentThread,
  listAgentThreads,
  listProjectThreads,
} from "@/lib/threads/data";

/** Compact project shape returned to MCP clients. */
export type McpProject = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  visibility: ProjectRow["visibility"];
  updatedAt: string;
};

/** One thread condensed to what a model needs to reason about a project. */
export type McpThreadSummary = {
  /** Internal id — pass this to `get_thread` / `fetch`. */
  threadId: string;
  /** Stable id from the producing agent (chatgpt/claude). */
  externalThreadId: string;
  title: string;
  kind: string;
  status: string;
  agent: string;
  lastSyncedAt: string;
  objective: string | null;
  statusSummary: string | null;
  nextAction: string | null;
  openQuestions: string[];
};

/** Full thread detail including the working state and the activity log. */
export type McpThreadDetail = McpThreadSummary & {
  projectContext: string | null;
  decisions: string[];
  completedWork: string[];
  artifacts: string[];
  activity: {
    timestamp: string | null;
    role: string;
    text: string;
    /** false when the text is a paraphrase rather than a verbatim quote. */
    exact: boolean;
  }[];
};

function toProject(row: ProjectRow): McpProject {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    visibility: row.visibility,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toSummary(row: AgentThreadRow): McpThreadSummary {
  const ws = row.workingState;
  return {
    threadId: row.id,
    externalThreadId: row.threadId,
    title: row.title || "Untitled thread",
    kind: row.kind,
    status: row.status,
    agent: row.lastAgentName,
    lastSyncedAt: row.lastSyncedAt.toISOString(),
    objective: ws?.objective || null,
    statusSummary: ws?.statusSummary || null,
    nextAction: ws?.nextAction || null,
    openQuestions: ws?.openQuestions ?? [],
  };
}

function toDetail(row: AgentThreadRow): McpThreadDetail {
  const ws = row.workingState;
  return {
    ...toSummary(row),
    projectContext: row.projectContext,
    decisions: ws?.decisions ?? [],
    completedWork: ws?.completedWork ?? [],
    artifacts: ws?.artifacts ?? [],
    activity: row.sourceActivity.map((item) => ({
      timestamp: item.timestamp,
      role: item.role,
      text: item.text,
      exact: item.isExact,
    })),
  };
}

/** Projects the key owner can see in the key's org (optionally filtered). */
export async function mcpListProjects(
  owner: ApiKeyOwner,
  query?: string,
): Promise<McpProject[]> {
  const rows = await listVisibleProjects({
    orgId: owner.orgId,
    viewerUserId: owner.ownerUserId,
    query,
  });
  return rows.map(toProject);
}

export type McpProjectContext = {
  project: McpProject;
  threadCount: number;
  threads: McpThreadSummary[];
};

/**
 * A project plus condensed context from every thread linked to it. This is the
 * primary tool a model calls to "supplement" its answer with project history.
 */
export async function mcpGetProjectContext(
  owner: ApiKeyOwner,
  projectRef: string,
): Promise<McpProjectContext | null> {
  const project = await getVisibleProject(
    projectRef,
    owner.orgId,
    owner.ownerUserId,
  );
  if (!project) return null;

  const threads = await listProjectThreads(project.id);
  return {
    project: toProject(project),
    threadCount: threads.length,
    threads: threads.map(toSummary),
  };
}

/** Build a searchable haystack for a thread. */
function threadHaystack(row: AgentThreadRow): string {
  const ws = row.workingState;
  const parts = [
    row.title,
    row.projectContext ?? "",
    ws?.objective ?? "",
    ws?.statusSummary ?? "",
    ws?.nextAction ?? "",
    ...(ws?.decisions ?? []),
    ...(ws?.openQuestions ?? []),
    ...row.sourceActivity.map((a) => a.text),
  ];
  return parts.join("\n").toLowerCase();
}

/** First activity/summary line that mentions the query, for a preview. */
function threadSnippet(row: AgentThreadRow, needle: string): string {
  const lower = needle.toLowerCase();
  const hit = row.sourceActivity.find((a) =>
    a.text.toLowerCase().includes(lower),
  );
  const text = hit?.text ?? row.workingState?.statusSummary ?? row.title;
  return text.length > 280 ? `${text.slice(0, 277)}…` : text;
}

export type McpThreadMatch = McpThreadSummary & { snippet: string };

/**
 * Substring search across an org's threads, optionally scoped to one project.
 * Ranked by number of query-term hits, most recent first as a tiebreaker.
 */
export async function mcpSearchThreads(
  owner: ApiKeyOwner,
  query: string,
  opts: { projectRef?: string; limit?: number } = {},
): Promise<McpThreadMatch[]> {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  let rows: AgentThreadRow[];
  if (opts.projectRef) {
    const project = await getVisibleProject(
      opts.projectRef,
      owner.orgId,
      owner.ownerUserId,
    );
    if (!project) return [];
    rows = await listProjectThreads(project.id);
  } else {
    rows = await listAgentThreads(owner.orgId);
  }

  const scored = rows
    .map((row) => {
      const hay = threadHaystack(row);
      const score = terms.reduce(
        (acc, term) => (hay.includes(term) ? acc + 1 : acc),
        0,
      );
      return { row, score };
    })
    .filter((s) => (terms.length === 0 ? true : s.score > 0))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.row.lastSyncedAt.getTime() - a.row.lastSyncedAt.getTime();
    });

  const limit = opts.limit ?? 20;
  return scored.slice(0, limit).map(({ row }) => ({
    ...toSummary(row),
    snippet: threadSnippet(row, query),
  }));
}

/** Full detail for a single thread by its internal id, scoped to the org. */
export async function mcpGetThread(
  owner: ApiKeyOwner,
  threadId: string,
): Promise<McpThreadDetail | null> {
  const row = await getAgentThread(owner.orgId, threadId);
  return row ? toDetail(row) : null;
}
