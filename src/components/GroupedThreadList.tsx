"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  groupThreadsByProjectAndAgent,
  type GroupableThread,
} from "@/lib/threads/group";

type SourceCatalogEntry = { name: string; projectId: string };

/** Where sidebar thread links should go (serializable — no function props). */
export type ThreadListLinkTarget =
  | { kind: "thread" }
  | { kind: "project"; projectId: string };

const INITIAL_VISIBLE = 4;

function agentGroupKey(projectLabel: string, agent: string): string {
  return `${projectLabel}:${agent}`;
}

function hrefForThread(
  target: ThreadListLinkTarget,
  threadId: string,
): string {
  if (target.kind === "project") {
    return `/projects/${target.projectId}?thread=${threadId}`;
  }
  return `/threads/${threadId}`;
}

/** Sidebar thread list grouped by source project, then agent. */
export function GroupedThreadList({
  threads,
  catalog = [],
  activeThreadId,
  linkTarget,
  ownerNames = {},
  showMeta = false,
  showOwner = false,
}: {
  threads: GroupableThread[];
  catalog?: SourceCatalogEntry[];
  activeThreadId?: string | null;
  linkTarget: ThreadListLinkTarget;
  ownerNames?: Record<string, string>;
  /** When true, show status (and optionally owner) under each thread title. */
  showMeta?: boolean;
  /** When true with showMeta, prefix the subtext with the thread owner name. */
  showOwner?: boolean;
}) {
  const groups = useMemo(
    () => groupThreadsByProjectAndAgent(threads, catalog),
    [threads, catalog],
  );

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  // Keep the active thread visible when it sits past the initial window.
  useEffect(() => {
    if (!activeThreadId) return;
    for (const group of groups) {
      for (const agentGroup of group.agents) {
        const index = agentGroup.threads.findIndex(
          (thread) => thread.id === activeThreadId,
        );
        if (index < INITIAL_VISIBLE) continue;
        const key = agentGroupKey(group.projectLabel, agentGroup.agent);
        setExpanded((prev) => {
          if (prev.has(key)) return prev;
          const next = new Set(prev);
          next.add(key);
          return next;
        });
      }
    }
  }, [activeThreadId, groups]);

  if (threads.length === 0) {
    return <p className="mt-2 text-sm text-muted">No threads yet</p>;
  }

  function toggleExpanded(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="-mx-1 mt-2 min-h-0 flex-1 space-y-3 overflow-y-auto">
      {groups.map((group) => (
        <div key={group.projectLabel}>
          <p
            className="truncate px-2 text-[11px] font-semibold tracking-wider text-muted uppercase"
            title={group.projectLabel}
          >
            {group.projectLabel}
          </p>

          <div className="mt-1 space-y-2">
            {group.agents.map((agentGroup) => {
              const key = agentGroupKey(group.projectLabel, agentGroup.agent);
              const isExpanded = expanded.has(key);
              const visible = isExpanded
                ? agentGroup.threads
                : agentGroup.threads.slice(0, INITIAL_VISIBLE);
              const hiddenCount = agentGroup.threads.length - visible.length;

              return (
                <div key={key}>
                  <p
                    className="truncate px-2 text-[11px] font-medium text-muted"
                    title={agentGroup.agent}
                  >
                    {agentGroup.agent}
                  </p>
                  <ul className="mt-0.5 space-y-0.5">
                    {visible.map((thread) => (
                      <ThreadRow
                        key={thread.id}
                        thread={thread}
                        active={thread.id === activeThreadId}
                        href={hrefForThread(linkTarget, thread.id)}
                        ownerNames={ownerNames}
                        showMeta={showMeta}
                        showOwner={showOwner}
                      />
                    ))}
                  </ul>
                  {hiddenCount > 0 ? (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(key)}
                      className="mt-0.5 w-full rounded-md px-2 py-1 text-left text-[11px] font-medium text-muted transition hover:bg-black/5 hover:text-foreground"
                    >
                      Load more ({hiddenCount})
                    </button>
                  ) : agentGroup.threads.length > INITIAL_VISIBLE ? (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(key)}
                      className="mt-0.5 w-full rounded-md px-2 py-1 text-left text-[11px] font-medium text-muted transition hover:bg-black/5 hover:text-foreground"
                    >
                      Show less
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ThreadRow({
  thread,
  active,
  href,
  ownerNames,
  showMeta,
  showOwner,
}: {
  thread: GroupableThread;
  active: boolean;
  href: string;
  ownerNames: Record<string, string>;
  showMeta: boolean;
  showOwner: boolean;
}) {
  const ownerName = ownerNames[thread.ownerUserId] ?? thread.ownerUserId;
  const meta = showOwner ? `${ownerName} · ${thread.status}` : thread.status;

  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`block rounded-md px-2 py-1.5 transition ${
          active ? "bg-black/10" : "hover:bg-black/5"
        }`}
      >
        <p className="truncate text-sm text-foreground" title={thread.title}>
          {thread.title || "Untitled thread"}
        </p>
        {showMeta ? (
          <p
            className="mt-0.5 truncate text-[11px] text-muted"
            title={showOwner ? ownerName : thread.status}
          >
            {meta}
          </p>
        ) : null}
      </Link>
    </li>
  );
}
