import Link from "next/link";

type VigilLogoProps = {
  /** Pixel size of the mark (square) */
  size?: number;
  /** Show “VIGIL” wordmark next to the mark */
  showWordmark?: boolean;
  /** Wrap in link to home */
  href?: string | null;
  className?: string;
};

/**
 * VIGIL mark: shield + horizon line — suggests protection and “always watching”.
 * Gradient uses brand sky blues.
 */
export default function VigilLogo({
  size = 40,
  showWordmark = true,
  href = "/",
  className = "",
}: VigilLogoProps) {
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden
    >
      <defs>
        <linearGradient
          id="vigil-logo-grad"
          x1="8"
          y1="4"
          x2="40"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#7dd3fc" />
          <stop offset="0.45" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="vigil-logo-shine" x1="24" y1="6" x2="24" y2="24">
          <stop stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Soft outer glow (subtle) */}
      <path
        d="M24 3.5L42.5 12.2V26.8C42.5 34.2 37.8 40.9 30.5 43.8L24 46.5L17.5 43.8C10.2 40.9 5.5 34.2 5.5 26.8V12.2L24 3.5Z"
        fill="url(#vigil-logo-grad)"
      />
      <path
        d="M24 3.5L42.5 12.2V26.8C42.5 34.2 37.8 40.9 30.5 43.8L24 46.5L17.5 43.8C10.2 40.9 5.5 34.2 5.5 26.8V12.2L24 3.5Z"
        fill="url(#vigil-logo-shine)"
      />
      {/* Inner shield cut for depth */}
      <path
        d="M24 8L38 14.5V26.5C38 32.4 34.4 37.7 28.8 40L24 41.8L19.2 40C13.6 37.7 10 32.4 10 26.5V14.5L24 8Z"
        fill="none"
        stroke="white"
        strokeOpacity="0.22"
        strokeWidth="1.2"
      />
      {/* Stylized V — vigil / verified */}
      <path
        d="M18 20L24 32L30 20"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 34H32"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* Accent dot — focal point */}
      <circle cx="24" cy="16" r="2.2" fill="white" fillOpacity="0.95" />
    </svg>
  );

  const wordmark = showWordmark ? (
    <div className="flex flex-col leading-none">
      <span className="text-lg font-bold tracking-tight text-slate-900 md:text-xl">
        VIGIL
      </span>
      <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-sky-600/90">
        Verified cover
      </span>
    </div>
  ) : null;

  const inner = (
    <span className={`flex items-center gap-3 ${className}`}>
      {mark}
      {wordmark}
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group flex items-center gap-3 rounded-xl outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2"
      >
        {inner}
      </Link>
    );
  }

  return <span className={className}>{inner}</span>;
}
