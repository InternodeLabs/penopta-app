import Link from "next/link";

import type { AgentThreadRow } from "@/lib/db/schema";

/** Start a new activity notice when a thread is quiet for this long. */
const ACTIVITY_GAP_MS = 5 * 60 * 1000;

export type ProjectActivityLine = {
  key: string;
  timeLabel: string;
  threadId: string;
  threadTitle: string;
  sortAt: number;
};

/** Compact time like `10PM` or `10:32PM`. */
function formatCompactTime(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(d);
  const hour = parts.find((p) => p.type === "hour")?.value ?? "";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "";
  const period = (
    parts.find((p) => p.type === "dayPeriod")?.value ?? ""
  ).toUpperCase();
  if (minute === "00") return `${hour}${period}`;
  return `${hour}:${minute}${period}`;
}

/**
 * Collapse each thread's source activity into burst notices: emit a line for
 * the first timed event, then again only after a quiet gap of ≥5 minutes.
 */
export function buildProjectActivityFeed(
  threads: AgentThreadRow[],
): ProjectActivityLine[] {
  const lines: ProjectActivityLine[] = [];

  for (const thread of threads) {
    const title = thread.title || "Untitled thread";
    const timed = thread.sourceActivity
      .map((item, index) => {
        if (!item.timestamp) return null;
        const parsed = new Date(item.timestamp);
        if (Number.isNaN(parsed.getTime())) return null;
        return { index, at: parsed.getTime() };
      })
      .filter((row): row is { index: number; at: number } => row !== null)
      .sort((a, b) => a.at - b.at);

    let lastBurstAt = -Infinity;
    for (const row of timed) {
      if (row.at - lastBurstAt < ACTIVITY_GAP_MS) continue;
      lastBurstAt = row.at;
      lines.push({
        key: `${thread.id}-${row.index}-${row.at}`,
        timeLabel: formatCompactTime(new Date(row.at)),
        threadId: thread.id,
        threadTitle: title,
        sortAt: row.at,
      });
    }
  }

  return lines.sort((a, b) => a.sortAt - b.sortAt);
}

/** Muted activity notice lines for the project main pane (not a thread view). */
export function ProjectActivityFeed({
  lines,
}: {
  lines: ProjectActivityLine[];
}) {
  if (lines.length === 0) return null;

  return (
    <ul className="mx-auto w-full max-w-3xl space-y-1.5">
      {lines.map((line) => (
        <li key={line.key} className="text-sm leading-relaxed text-muted">
          <span className="inline-block w-16 tabular-nums">{line.timeLabel}</span>{" "}
          <Link
            href={`/threads/${line.threadId}`}
            className="transition hover:text-foreground"
            title={line.threadTitle}
          >
            <b>{line.threadTitle}</b>
          </Link>{" "}
          posted activity
        </li>
      ))}
    </ul>
  );
}
