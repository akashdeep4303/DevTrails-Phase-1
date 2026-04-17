import type { ReactNode } from "react";

export type PageBackdropVariant =
  | "admin"
  | "weather"
  | "timeline"
  | "ambient"
  | "circuit"
  | "pillars"
  | "drift";

export type PageBackdropProps = {
  variant?: PageBackdropVariant;
  className?: string;
  children?: ReactNode;
};

const RAIN = [
  { left: "6%", dur: "5.8s", delay: "-1.6s", opacity: 0.5 },
  { left: "14%", dur: "6.6s", delay: "-3.2s", opacity: 0.4 },
  { left: "22%", dur: "5.1s", delay: "-0.4s", opacity: 0.55 },
  { left: "31%", dur: "6.9s", delay: "-4.1s", opacity: 0.35 },
  { left: "39%", dur: "5.4s", delay: "-2.4s", opacity: 0.5 },
  { left: "48%", dur: "6.2s", delay: "-5.3s", opacity: 0.4 },
  { left: "56%", dur: "5.6s", delay: "-1.1s", opacity: 0.55 },
  { left: "64%", dur: "7.1s", delay: "-3.7s", opacity: 0.35 },
  { left: "73%", dur: "5.3s", delay: "-2.9s", opacity: 0.5 },
  { left: "82%", dur: "6.4s", delay: "-0.8s", opacity: 0.4 },
  { left: "90%", dur: "5.9s", delay: "-4.8s", opacity: 0.55 },
];

export default function PageBackdrop({
  variant = "ambient",
  className = "",
  children,
}: PageBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className={[
        "pointer-events-none absolute inset-0 z-0 overflow-hidden",
        className,
      ].join(" ")}
    >
      {variant === "admin" && <AdminBackdrop />}
      {variant === "weather" && <WeatherBackdrop />}
      {variant === "timeline" && <TimelineBackdrop />}
      {variant === "ambient" && <AmbientBackdrop />}
      {variant === "circuit" && <CircuitBackdrop />}
      {variant === "pillars" && <PillarsBackdrop />}
      {variant === "drift" && <DriftBackdrop />}
      {children}
    </div>
  );
}

function AdminBackdrop() {
  return (
    <>
      <div className="atm-admin-grid" />
      <div className="atm-admin-glow" />
      <div className="atm-admin-node atm-admin-node--1" />
      <div className="atm-admin-node atm-admin-node--2" />
      <div className="atm-admin-node atm-admin-node--3" />
      <div className="atm-admin-node atm-admin-node--4" />
      <div className="atm-admin-scan" />
    </>
  );
}

function WeatherBackdrop() {
  return (
    <>
      <div className="atm-weather-base" />
      <div className="atm-weather-cloud-horizon" />
      <div className="atm-weather-cloud atm-weather-cloud--1" />
      <div className="atm-weather-cloud atm-weather-cloud--2" />
      <div className="atm-weather-cloud atm-weather-cloud--3" />
      <div className="atm-weather-cloud atm-weather-cloud--4" />
      <div className="atm-weather-cloud atm-weather-cloud--5" />
      <div className="atm-weather-cloud-group atm-weather-cloud-group--a">
        <div className="atm-weather-puff" />
        <div className="atm-weather-puff" />
        <div className="atm-weather-puff" />
        <div className="atm-weather-puff" />
      </div>
      <div className="atm-weather-cloud-group atm-weather-cloud-group--b">
        <div className="atm-weather-puff" />
        <div className="atm-weather-puff" />
        <div className="atm-weather-puff" />
        <div className="atm-weather-puff" />
      </div>
      <div className="atm-weather-lightning" />
      {RAIN.map((drop) => (
        <div
          key={`${drop.left}-${drop.delay}`}
          className="atm-rain-drop"
          style={{
            left: drop.left,
            animationDuration: drop.dur,
            animationDelay: drop.delay,
            opacity: drop.opacity,
          }}
        />
      ))}
    </>
  );
}

function TimelineBackdrop() {
  return (
    <>
      <div className="atm-timeline-stream" />
      <div className="atm-timeline-rail" />
      <div className="atm-timeline-glow" />
    </>
  );
}

function AmbientBackdrop() {
  return (
    <>
      <div className="atm-ambient-base" />
      <div className="atm-blob atm-blob--a" />
      <div className="atm-blob atm-blob--b" />
      <div className="atm-blob atm-blob--c" />
    </>
  );
}

function CircuitBackdrop() {
  return (
    <>
      <div className="atm-circuit-grid" />
      <div className="atm-circuit-glow" />
      <div className="atm-circuit-line atm-circuit-line--1" />
      <div className="atm-circuit-line atm-circuit-line--2" />
      <div className="atm-circuit-line atm-circuit-line--3" />
    </>
  );
}

function PillarsBackdrop() {
  return (
    <>
      <div className="atm-pillar-mesh" />
      <div className="atm-pillar atm-pillar--1" />
      <div className="atm-pillar atm-pillar--2" />
      <div className="atm-pillar atm-pillar--3" />
    </>
  );
}

function DriftBackdrop() {
  return (
    <>
      <div className="atm-drift-bg" />
      <div className="atm-drift-orb atm-drift-orb--1" />
      <div className="atm-drift-orb atm-drift-orb--2" />
      <div className="atm-drift-orb atm-drift-orb--3" />
    </>
  );
}
