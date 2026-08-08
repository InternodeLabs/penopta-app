import { resolveSourceProjectLabel } from "@/lib/integrations/provider-projects-view";
import type { SourceActivityItem } from "@/lib/db/schema";

/** Label for threads with no source project context. */
export const UNGROUPED_SOURCE_PROJECT_LABEL = "No source project";

export type GroupableThread = {
  id: string;
  title: string;
  lastAgentName: string;
  status: string;
  ownerUserId: string;
  projectContext?: string | null;
  threadUpdatedAt?: Date | string | null;
  lastSyncedAt?: Date | string | null;
  sourceActivity?: SourceActivityItem[];
};

export type ThreadAgentGroup = {
  agent: string;
  threads: GroupableThread[];
};

export type ThreadProjectGroup = {
  projectLabel: string;
  agents: ThreadAgentGroup[];
};

type SourceCatalogEntry = { name: string; projectId: string };

function toMillis(value: Date | string | null | undefined): number | null {
  if (value == null) return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Best-effort "most recent message" time: latest activity timestamp, then
 * provider threadUpdatedAt, then lastSyncedAt. Returns 0 when unknown.
 */
export function threadRecentMessageAt(thread: GroupableThread): number {
  let latestActivity: number | null = null;
  for (const item of thread.sourceActivity ?? []) {
    const ms = toMillis(item.timestamp);
    if (ms == null) continue;
    if (latestActivity == null || ms > latestActivity) latestActivity = ms;
  }
  return (
    latestActivity ??
    toMillis(thread.threadUpdatedAt) ??
    toMillis(thread.lastSyncedAt) ??
    0
  );
}

function byRecentDesc(a: number, b: number): number {
  return b - a;
}

/**
 * Group threads by source project, then by agent. Threads and groups are
 * ordered by most recent message (newest first).
 */
export function groupThreadsByProjectAndAgent(
  threads: GroupableThread[],
  catalog: SourceCatalogEntry[] = [],
): ThreadProjectGroup[] {
  const byProject = new Map<string, Map<string, GroupableThread[]>>();

  for (const thread of threads) {
    const projectLabel =
      resolveSourceProjectLabel(thread.projectContext, catalog) ??
      UNGROUPED_SOURCE_PROJECT_LABEL;
    const agent = thread.lastAgentName.trim() || "Unknown agent";

    let byAgent = byProject.get(projectLabel);
    if (!byAgent) {
      byAgent = new Map();
      byProject.set(projectLabel, byAgent);
    }
    const bucket = byAgent.get(agent);
    if (bucket) bucket.push(thread);
    else byAgent.set(agent, [thread]);
  }

  const groups: ThreadProjectGroup[] = Array.from(byProject.entries()).map(
    ([projectLabel, byAgent]) => {
      const agents: ThreadAgentGroup[] = Array.from(byAgent.entries()).map(
        ([agent, agentThreads]) => ({
          agent,
          threads: [...agentThreads].sort((a, b) =>
            byRecentDesc(threadRecentMessageAt(a), threadRecentMessageAt(b)),
          ),
        }),
      );

      agents.sort((a, b) => {
        const aRecent = Math.max(
          0,
          ...a.threads.map((t) => threadRecentMessageAt(t)),
        );
        const bRecent = Math.max(
          0,
          ...b.threads.map((t) => threadRecentMessageAt(t)),
        );
        return byRecentDesc(aRecent, bRecent);
      });

      return { projectLabel, agents };
    },
  );

  groups.sort((a, b) => {
    const aRecent = Math.max(
      0,
      ...a.agents.flatMap((g) => g.threads.map((t) => threadRecentMessageAt(t))),
    );
    const bRecent = Math.max(
      0,
      ...b.agents.flatMap((g) => g.threads.map((t) => threadRecentMessageAt(t))),
    );
    return byRecentDesc(aRecent, bRecent);
  });

  return groups;
}
