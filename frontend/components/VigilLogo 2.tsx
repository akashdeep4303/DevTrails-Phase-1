import Link from "next/link";

export type VigilLogoProps = {
  size?: number;
  showWordmark?: boolean;
  href?: string;
  className?: string;
  variant?: "dark" | "light" | "auto";
};

export default function VigilLogo({
  size = 44,
  showWordmark = false,
  href = "/",
  className = "",
  variant = "auto",
}: VigilLogoProps) {
  const s = Math.max(24, Math.round(size));
  const r = Math.round(s * 0.25);   // border-radius
  const cx = Math.round(s / 2);     // center x/y
  const shield = s * 0.62;          // shield icon viewport
  const sw = (shield / 24).toFixed(3); // scale factor

  // Unique gradient IDs to avoid collisions when multiple logos are on page
  const uid = "vp";

  return (
    <Link
      href={href}
      aria-label="Vigil Prime"
      className={[
        "group inline-flex items-center gap-3 rounded-xl outline-none",
        "focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2",
        className,
      ].join(" ")}
    >
      {/* ── Mark ── */}
      <span
        className="relative flex-shrink-0 inline-flex items-center justify-center overflow-hidden"
        style={{
          width: s,
          height: s,
          borderRadius: r,
        }}
        aria-hidden="true"
      >
        {/* Hover pulse around icon only */}
        <span
          className="absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ boxShadow: "0 0 18px 2px rgba(2,132,199,0.25)" }}
        />

        {/* SVG V-shield monogram */}
        <svg
          width={Math.round(shield)}
          height={Math.round(shield)}
          viewBox="0 0 24 24"
          fill="none"
          className="relative z-10 text-slate-900 drop-shadow-[0_1px_1px_rgba(15,23,42,0.15)]"
        >
          {/* Shield frame */}
          <path
            d="M12 2.5L19.8 6.9v6.5c0 5.5-3.3 9.7-7.8 11.1C7.5 23.1 4.2 18.9 4.2 13.4V6.9L12 2.5z"
            stroke="currentColor"
            strokeWidth={Number(sw) * 1.65}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* V monogram */}
          <path
            d="M7.8 8.7L12 16.8l4.2-8.1"
            stroke="currentColor"
            strokeWidth={Number(sw) * 2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Secure lock bar accent */}
          <path
            d="M9.3 11.8h5.4"
            stroke="rgba(30,41,59,0.85)"
            strokeWidth={Number(sw) * 1.15}
            strokeLinecap="round"
          />
          {/* Crown notch for premium security feel */}
          <path
            d="M12 5.6v1.7"
            stroke="rgba(30,41,59,0.9)"
            strokeWidth={Number(sw) * 1.1}
            strokeLinecap="round"
          />
        </svg>

        {/* Bottom reflection strip */}
        <span
          className="absolute bottom-0 left-[15%] right-[15%]"
          style={{
            height: "1px",
            background:
              "linear-gradient(90deg, transparent, rgba(186,230,253,0.4), transparent)",
          }}
        />
      </span>

      {/* ── Wordmark — inline single line ── */}
      {showWordmark && (
        <span
          className="hidden sm:inline-flex items-baseline gap-[0.18em] leading-none select-none"
        >
          <span
            className="font-black tracking-[0.06em] text-slate-950"
            style={{ fontSize: Math.round(s * 0.4) }}
          >
            VIGIL
          </span>
          <span
            className="font-extrabold tracking-tight"
            style={{
              fontSize: Math.round(s * 0.4),
              background:
                "linear-gradient(90deg, #0284c7 0%, #06b6d4 55%, #0369a1 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Secure
          </span>
        </span>
      )}
    </Link>
  );
}