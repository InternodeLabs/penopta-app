"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function CopyField({
  label,
  value,
  hint,
  masked = false,
  displayValue,
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: string;
  hint?: string;
  /** Show bullets in the field; Copy still writes the clear value. */
  masked?: boolean;
  /** Optional display text (e.g. URL with key redacted). Copy still uses `value`. */
  displayValue?: string;
  /** Render as a multi-line text box (e.g. pasteable instructions). */
  multiline?: boolean;
  /** Number of rows for multi-line text box. */
  rows?: number;
}) {
  const [copied, setCopied] = useState(false);
  const display =
    displayValue ??
    (masked ? "*".repeat(Math.min(Math.max(value.length, 12), 40)) : value);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copied");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — select and copy manually");
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-foreground">{label}</p>
      <div className="flex items-stretch gap-2">
        {multiline ? (
          <textarea
            readOnly
            value={display}
            rows={rows}
            className="min-w-0 flex-1 resize-y rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-xs leading-relaxed text-foreground"
            title={
              masked || displayValue
                ? "Hidden — use Copy for the clear value"
                : undefined
            }
            onFocus={(e) => e.currentTarget.select()}
          />
        ) : (
          <code
            className="flex min-w-0 flex-1 items-center overflow-x-auto rounded-lg border border-border bg-background px-3 py-2.5 font-mono text-xs text-foreground"
            title={
              masked || displayValue
                ? "Hidden — use Copy for the clear value"
                : undefined
            }
          >
            {display}
          </code>
        )}
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-auto shrink-0 items-center gap-1.5 self-start rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-background"
        >
          {copied ? (
            <Check className="h-4 w-4" aria-hidden />
          ) : (
            <Copy className="h-4 w-4" aria-hidden />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {hint ? <p className="mt-1.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
