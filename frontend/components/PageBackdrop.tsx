"use client";

export type PageBackdropVariant =
  | "admin"
  | "weather"
  | "timeline"
  | "shield"
  | "ambient"
  | "circuit"
  | "pillars"
  | "drift";

/** Low-opacity backdrop art; tuned per variant so busy pages stay readable */
const THEME_ART_OPACITY: Record<PageBackdropVariant, number> = {
  admin: 0.075,
  weather: 0.045,
  timeline: 0.085,
  shield: 0.08,
  ambient: 0.09,
  circuit: 0.085,
  pillars: 0.082,
  drift: 0.095,
};

const RAIN = Array.from({ length: 32 }, (_, i) => ({
  left: `${(i * 3.1 + (i % 4) * 1.7) % 94}%`,
  delay: `${(i * 0.11) % 2.6}s`,
  duration: `${0.55 + (i % 8) * 0.07}s`,
}));

export default function PageBackdrop({ variant }: { variant: PageBackdropVariant }) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div
        className="atm-theme-art"
        style={{
          backgroundImage: `url(/backdrops/${variant}.svg)`,
          opacity: THEME_ART_OPACITY[variant],
        }}
      />
      {variant === "admin" && (
        <>
          <div className="atm-admin-grid" />
          <div className="atm-admin-glow" />
          <span className="atm-admin-node atm-admin-node--1" />
          <span className="atm-admin-node atm-admin-node--2" />
          <span className="atm-admin-node atm-admin-node--3" />
          <span className="atm-admin-node atm-admin-node--4" />
          <div className="atm-admin-scan" />
        </>
      )}
      {variant === "weather" && (
        <>
          <div className="atm-weather-base" />
          <div className="atm-weather-cloud-horizon" />
          <div className="atm-weather-cloud atm-weather-cloud--1" />
          <div className="atm-weather-cloud atm-weather-cloud--2" />
          <div className="atm-weather-cloud atm-weather-cloud--3" />
          <div className="atm-weather-cloud atm-weather-cloud--4" />
          <div className="atm-weather-cloud atm-weather-cloud--5" />
          <div className="atm-weather-cloud-group atm-weather-cloud-group--a">
            <span className="atm-weather-puff" />
            <span className="atm-weather-puff" />
            <span className="atm-weather-puff" />
            <span className="atm-weather-puff" />
          </div>
          <div className="atm-weather-cloud-group atm-weather-cloud-group--b">
            <span className="atm-weather-puff" />
            <span className="atm-weather-puff" />
            <span className="atm-weather-puff" />
            <span className="atm-weather-puff" />
          </div>
          <div className="atm-weather-lightning" />
          {RAIN.map((p, i) => (
            <span
              key={i}
              className="atm-rain-drop"
              style={{
                left: p.left,
                animationDelay: p.delay,
                animationDuration: p.duration,
              }}
            />
          ))}
        </>
      )}
      {variant === "timeline" && (
        <>
          <div className="atm-timeline-stream" />
          <div className="atm-timeline-rail" />
          <div className="atm-timeline-glow" />
        </>
      )}
      {variant === "shield" && (
        <>
          <div className="atm-shield-bloom" />
          <div className="atm-shield-ring atm-shield-ring--1" />
          <div className="atm-shield-ring atm-shield-ring--2" />
          <div className="atm-shield-ring atm-shield-ring--3" />
        </>
      )}
      {variant === "ambient" && (
        <>
          <div className="atm-ambient-base" />
          <div className="atm-blob atm-blob--a" />
          <div className="atm-blob atm-blob--b" />
          <div className="atm-blob atm-blob--c" />
        </>
      )}
      {variant === "circuit" && (
        <>
          <div className="atm-circuit-grid" />
          <div className="atm-circuit-glow" />
          <div className="atm-circuit-line atm-circuit-line--1" />
          <div className="atm-circuit-line atm-circuit-line--2" />
          <div className="atm-circuit-line atm-circuit-line--3" />
        </>
      )}
      {variant === "pillars" && (
        <>
          <div className="atm-pillar-mesh" />
          <div className="atm-pillar atm-pillar--1" />
          <div className="atm-pillar atm-pillar--2" />
          <div className="atm-pillar atm-pillar--3" />
        </>
      )}
      {variant === "drift" && (
        <>
          <div className="atm-drift-bg" />
          <div className="atm-drift-orb atm-drift-orb--1" />
          <div className="atm-drift-orb atm-drift-orb--2" />
          <div className="atm-drift-orb atm-drift-orb--3" />
        </>
      )}
    </div>
  );
}
