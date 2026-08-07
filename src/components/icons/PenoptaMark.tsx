/** Penopta mark for integration cards (matches public/brand/icon.svg). */
export default function PenoptaMark({ className }: { className?: string }) {
  return (
    <svg
      className={["size-4", className].filter(Boolean).join(" ")}
      viewBox="0 0 380 380"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <ellipse cx="190.004" cy="190.5" rx="58" ry="57.5" fill="currentColor" />
      <rect
        x="157.728"
        y="36.6632"
        width="171.018"
        height="51.8493"
        rx="15"
        transform="rotate(135 157.728 36.6632)"
        fill="currentColor"
      />
      <rect
        x="379.677"
        y="258.612"
        width="171.018"
        height="51.8493"
        rx="15"
        transform="rotate(135 379.677 258.612)"
        fill="currentColor"
      />
      <rect
        x="342.877"
        y="157.961"
        width="171.018"
        height="51.8493"
        rx="15"
        transform="rotate(-135 342.877 157.961)"
        fill="currentColor"
      />
      <rect
        x="120.928"
        y="379.911"
        width="171.018"
        height="51.8493"
        rx="15"
        transform="rotate(-135 120.928 379.911)"
        fill="currentColor"
      />
    </svg>
  );
}
