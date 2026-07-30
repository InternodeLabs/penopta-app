import Image from "next/image";
import Link from "next/link";

/** Full Penopta wordmark (icon + black brand name) — header branding. */
export function BrandLogo({
  className,
}: {
  className?: string;
}) {
  return (
    <Image
      src="/brand/logo-full.png"
      alt="Penopta"
      width={1024}
      height={260}
      priority
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
    <Image
      src="/brand/icon.png"
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
