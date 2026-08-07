"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

export type ChatHelpOption = {
  label: string;
  href: string;
};

/** “Get help from chat” with a Claude / ChatGPT picker. */
export function ChatHelpMenu({
  options,
  label = "Get help from chat",
}: {
  options: ChatHelpOption[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (options.length === 0) return null;

  return (
    <div ref={rootRef} className="relative inline-block text-sm">
      <p className="text-muted">
        Need help?{" "}
        <button
          type="button"
          className="inline-flex items-center gap-1 font-medium text-zinc-600 transition hover:text-zinc-900"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={menuId}
          onClick={() => setOpen((v) => !v)}
        >
          {label}
          <ChevronDown
            className={`size-3.5 transition ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </p>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute left-0 z-10 mt-2 min-w-[11rem] overflow-hidden rounded-md border border-zinc-200 bg-white py-1 shadow-sm"
        >
          {options.map((option) => (
            <a
              key={option.href}
              role="menuitem"
              href={option.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block px-3 py-2 text-sm text-foreground transition hover:bg-zinc-50"
              onClick={() => setOpen(false)}
            >
              {option.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
