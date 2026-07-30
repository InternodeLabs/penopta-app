import type { SourceActivityItem } from "@/lib/db/schema";

function formatTime(ts: string | null): string | null {
  if (!ts) return null;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

function roleLabel(role: string): string {
  const r = role.trim().toLowerCase();
  if (r === "user" || r === "human") return "You";
  if (r === "assistant" || r === "ai" || r === "agent") return "Agent";
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function isMine(role: string): boolean {
  const r = role.trim().toLowerCase();
  return r === "user" || r === "human";
}

/** Renders a thread's captured source activity as a chat conversation. */
export function ThreadConversation({
  activity,
}: {
  activity: SourceActivityItem[];
}) {
  if (activity.length === 0) {
    return (
      <p className="text-sm text-muted">
        No conversation was captured for this thread.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {activity.map((item, i) => {
        const mine = isMine(item.role);
        const time = formatTime(item.timestamp);
        return (
          <div
            key={i}
            className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
          >
            <div className="mb-1 flex items-center gap-2 px-1 text-[11px] text-muted">
              <span className="font-medium">{roleLabel(item.role)}</span>
              {time ? <span>{time}</span> : null}
              {!item.isExact ? (
                <span
                  title="Reconstructed from summary, not an exact transcript"
                  className="rounded bg-skeleton px-1 py-0.5 text-[10px] uppercase tracking-wide"
                >
                  paraphrased
                </span>
              ) : null}
            </div>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                mine
                  ? "bg-accent text-accent-foreground"
                  : "border border-border bg-surface text-foreground"
              }`}
            >
              {item.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}
