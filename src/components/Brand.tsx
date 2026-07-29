import Link from "next/link";

/** Text wordmark until brand assets land. */
export function BrandLogo({
  className,
}: {
  className?: string;
}) {
  return (
    <span
      className={`font-semibold tracking-tight text-foreground ${className ?? ""}`}
    >
      Penopta
    </span>
  );
}

/** Compact mark for interstitial / icon contexts. */
export function BrandIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`grid h-11 w-11 place-items-center rounded-xl bg-accent text-sm font-bold text-accent-foreground ${className ?? ""}`}
    >
      P
    </span>
  );
}

/** Home link wrapping the wordmark — header branding. */
export function BrandHomeLink({
  className,
}: {
  className?: string;
}) {
  return (
    <Link
      href="/"
      aria-label="Penopta home"
      className={`inline-flex shrink-0 items-center ${className ?? ""}`}
    >
      <BrandLogo />
    </Link>
  );
}
