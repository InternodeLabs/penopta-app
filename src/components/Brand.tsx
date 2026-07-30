import Link from "next/link";

/** Full Penopta wordmark (icon + black brand name) — header branding. */
export function BrandLogo({
  className,
}: {
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG wordmark; next/image adds nothing for vectors
    <img
      src="/brand/logo-full-black.svg"
      alt="Penopta"
      width={598}
      height={152}
 
 
      className={`h-6 w-auto ${className ?? ""}`}
    />
  );
}

/** Standalone icon mark for interstitial / compact contexts. */
export function BrandIcon({
  className,
}: {
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- SVG mark; next/image adds nothing for vectors
    <img
      src="/brand/icon.svg"
      alt=""
      aria-hidden
      width={380}
      height={380}
      className={`h-11 w-11 ${className ?? ""}`}
    />
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
