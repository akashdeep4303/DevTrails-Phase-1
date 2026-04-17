"use client";

import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import PageBackdrop from "@/components/PageBackdrop";
import { Card, CardHeader, CardContent } from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import Badge from "@/components/Badge";

type Tier = "instant" | "provisional" | "escrow";

interface ClaimResult {
  claim_id: string;
  trust_score: number;
  tier: Tier;
  payout_amount: number;
  payout_status: string;
  payout_ref: string;
  remaining_amount: number;
  payout_eta_seconds: number;
  payout_message: string;
  weather_verified: boolean;
  weather_condition: string;
  breakdown: Record<string, number>;
  syndicate_suspicion_index: number;
}

const PRESETS = {
  genuine: {
    label: "Genuine Worker",
    desc: "In storm, active delivery",
    trustScore: 87,
    iconColor: "#2563eb",
    iconBg: "#eff6ff",
    trustColor: "#166534",
    trustBg: "#dcfce7",
    signals: {
      lat: 12.97,
      lon: 77.59,
      accelerometer_variance: 0.15,
      gyroscope_rotation_events: 12,
      step_count_delta: 45,
      cell_tower_handoff_count: 3,
      wifi_home_ssid_detected: false,
      signal_strength_variance: 0.12,
      app_foreground: true,
      battery_drain_rate: 0.08,
      screen_interaction_count: 15,
      has_active_order: true,
      last_order_minutes_ago: 8,
    },
    signalBars: {
      motion: { value: 0.15, label: "0.15", pct: 75, color: "#22c55e" },
      steps: { value: 45, label: "45", pct: 60, color: "#22c55e" },
      cellHandoffs: { value: 3, label: "3", pct: 60, color: "#3b82f6" },
      battery: { value: 0.08, label: "8%/h", pct: 50, color: "#3b82f6" },
      screen: { value: 15, label: "15", pct: 75, color: "#8b5cf6" },
      order: { value: 1, label: "Yes", pct: 100, color: "#22c55e" },
    },
  },
  spoofer: {
    label: "Home Spoofer",
    desc: "At home with spoof app",
    trustScore: 28,
    iconColor: "#d97706",
    iconBg: "#fff7ed",
    trustColor: "#92400e",
    trustBg: "#fff7ed",
    signals: {
      lat: 12.97,
      lon: 77.59,
      accelerometer_variance: 0.002,
      gyroscope_rotation_events: 0,
      step_count_delta: 0,
      cell_tower_handoff_count: 0,
      wifi_home_ssid_detected: true,
      signal_strength_variance: 0.02,
      app_foreground: false,
      battery_drain_rate: 0.01,
      screen_interaction_count: 2,
      has_active_order: false,
      last_order_minutes_ago: 180,
    },
    signalBars: {
      motion: { value: 0.002, label: "0.002", pct: 2, color: "#f59e0b" },
      steps: { value: 0, label: "0", pct: 0, color: "#ef4444" },
      cellHandoffs: { value: 0, label: "0", pct: 0, color: "#ef4444" },
      battery: { value: 0.01, label: "1%/h", pct: 5, color: "#ef4444" },
      screen: { value: 2, label: "2", pct: 10, color: "#f59e0b" },
      order: { value: 0, label: "No", pct: 0, color: "#ef4444" },
    },
  },
  syndicate: {
    label: "Syndicate Actor",
    desc: "Coordinated mass trigger",
    trustScore: 11,
    iconColor: "#dc2626",
    iconBg: "#fef2f2",
    trustColor: "#991b1b",
    trustBg: "#fef2f2",
    signals: {
      lat: 12.97,
      lon: 77.59,
      accelerometer_variance: 0.003,
      gyroscope_rotation_events: 0,
      step_count_delta: 0,
      cell_tower_handoff_count: 0,
      wifi_home_ssid_detected: true,
      signal_strength_variance: 0.01,
      app_foreground: false,
      battery_drain_rate: 0.005,
      screen_interaction_count: 0,
      has_active_order: false,
      last_order_minutes_ago: 240,
    },
    signalBars: {
      motion: { value: 0.003, label: "0.003", pct: 1, color: "#ef4444" },
      steps: { value: 0, label: "0", pct: 0, color: "#ef4444" },
      cellHandoffs: { value: 0, label: "0", pct: 0, color: "#ef4444" },
      battery: { value: 0.005, label: "0.5%/h", pct: 2, color: "#ef4444" },
      screen: { value: 0, label: "0", pct: 0, color: "#ef4444" },
      order: { value: 0, label: "No", pct: 0, color: "#ef4444" },
    },
  },
};

/* ─── Rain canvas ─────────────────────────────────────────── */
function RainCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf: number;
    const drops: { x: number; y: number; len: number; speed: number; opacity: number }[] = [];
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    for (let i = 0; i < 60; i++) {
      drops.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        len: 12 + Math.random() * 20,
        speed: 3 + Math.random() * 4,
        opacity: 0.15 + Math.random() * 0.25,
      });
    }
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drops.forEach((d) => {
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 1, d.y + d.len);
        ctx.strokeStyle = `rgba(147,197,253,${d.opacity})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        d.y += d.speed;
        if (d.y > canvas.height) {
          d.y = -d.len;
          d.x = Math.random() * canvas.width;
        }
      });
      raf = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

/* ─── Signal bar row ──────────────────────────────────────── */
function SignalBar({
  label,
  displayValue,
  pct,
  color,
}: {
  label: string;
  displayValue: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
      <div className="flex justify-between items-center">
        <span className="text-[11px] text-slate-500 font-medium">{label}</span>
        <span className="text-[11px] font-mono text-slate-700">{displayValue}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

/* ─── Map pin preview ─────────────────────────────────────── */
function MapPreview({ lat, lon }: { lat: number; lon: number }) {
  return (
    <div className="relative mt-3 h-28 rounded-xl overflow-hidden border border-slate-200/80">
      {/* Dark map-like background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a2744] to-[#0f1a30]" />
      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <defs>
          <pattern id="mapGrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(100,150,255,0.08)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#mapGrid)" />
        <circle cx="50%" cy="50%" r="36" fill="none" stroke="rgba(59,130,246,0.12)" strokeWidth="1" />
        <circle cx="50%" cy="50%" r="20" fill="none" stroke="rgba(59,130,246,0.18)" strokeWidth="0.5" />
      </svg>
      {/* Pulsing pin */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div className="absolute -inset-[18px] rounded-full border border-sky-400/30 animate-ping" />
          <div className="absolute -inset-[10px] rounded-full border border-sky-400/20 animate-ping [animation-delay:0.4s]" />
          <div className="w-3 h-3 rounded-full bg-sky-500 border-2 border-white shadow-md shadow-sky-500/50" />
        </div>
      </div>
      <div className="absolute bottom-2 right-3 font-mono text-[10px] text-sky-400/50">
        {lat}°N {lon}°E
      </div>
      <div className="absolute top-2 left-3 text-[10px] text-white/80 font-medium">
        Bengaluru, Karnataka
      </div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────── */
export default function ClaimPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<keyof typeof PRESETS>("genuine");
  const [signals, setSignals] = useState(PRESETS.genuine.signals);
  const [upiHandle, setUpiHandle] = useState<string>("");

  const applyPreset = (p: keyof typeof PRESETS) => {
    setPreset(p);
    setSignals(PRESETS[p].signals);
  };

  const submit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const consentAccepted =
        typeof window !== "undefined" &&
        localStorage.getItem("vigil_dpdp_consent") === "accepted";
      const ingestRes = await fetch("/api/signals/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(consentAccepted ? { "x-vigil-consent": "accepted" } : {}),
        },
        body: JSON.stringify({
          worker_id: "worker_demo",
          upi_handle: upiHandle.trim() || "",
          signals,
        }),
      });
      const ingestData = await ingestRes.json().catch(() => ({}));
      if (!ingestRes.ok) {
        if (ingestRes.status === 403)
          throw new Error(ingestData.detail || "DPDP consent required");
        throw new Error(ingestData.detail || "Signal ingest failed");
      }
      const packetId = ingestData.packet_id;
      if (!packetId) throw new Error("Signal ingest failed (missing packet id)");

      const res = await fetch("/api/claims/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(consentAccepted ? { "x-vigil-consent": "accepted" } : {}),
        },
        body: JSON.stringify({
          worker_id: "worker_demo",
          signal_packet_id: packetId,
          lat: signals.lat,
          lon: signals.lon,
          upi_handle: upiHandle.trim() || "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403) throw new Error(data.detail || "DPDP consent required");
        if (res.status === 502 || res.status === 503)
          throw new Error("Backend unavailable");
        throw new Error(data.detail || "Request failed");
      }
      setResult(data as ClaimResult);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      const isBackendDown =
        msg === "Failed to fetch" ||
        msg.includes("NetworkError") ||
        msg === "Backend unavailable";
      setError(
        isBackendDown
          ? "Backend unavailable. Run: npm run dev (from project root)."
          : msg
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!result || result.tier === "instant") return;
    let interval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    const poll = async () => {
      if (cancelled) return;
      try {
        const consentAccepted =
          typeof window !== "undefined" &&
          localStorage.getItem("vigil_dpdp_consent") === "accepted";
        const res = await fetch(`/api/claims/${result.claim_id}`, {
          headers: {
            ...(consentAccepted ? { "x-vigil-consent": "accepted" } : {}),
          },
        });
        if (!res.ok) return;
        const status = await res.json();
        setResult((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            payout_status: status.payout_status ?? prev.payout_status,
            remaining_amount:
              typeof status.remaining_amount === "number"
                ? status.remaining_amount
                : prev.remaining_amount,
            payout_eta_seconds:
              typeof status.payout_eta_seconds === "number"
                ? status.payout_eta_seconds
                : prev.payout_eta_seconds,
            payout_amount:
              typeof status.payout_amount_now_sent === "number"
                ? status.payout_amount_now_sent
                : prev.payout_amount,
          };
        });
      } catch {
        // ignore
      }
    };
    interval = setInterval(poll, 2000);
    const stop = setTimeout(() => {
      if (interval) clearInterval(interval);
    }, 45000);
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      clearTimeout(stop);
    };
  }, [result?.claim_id, result?.tier]);

  const activeBars = PRESETS[preset].signalBars;

  return (
    <div className="relative min-h-screen page-shell-light">
      {/* ── BACKGROUND IMAGE ── */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/backdrops/craig-whitehead-SuJp8ZpkubI-unsplash.jpg')",
        }}
      />
      {/* Light overlay scrim */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-white/10" />

      <PageBackdrop variant="weather" />
      <div className="relative z-10 min-h-screen">
        <Header variant="minimal" />
        <main className="mx-auto max-w-2xl px-5 py-10 md:py-12 space-y-4">

          {/* ── Hero ───────────────────────────────────────── */}
          <div className="relative rounded-2xl overflow-hidden border border-sky-900/30 bg-gradient-to-br from-[#06172e] via-[#0c2050] to-[#06172e] p-6 md:p-7">
            <RainCanvas />

            {/* Subtle cloud shapes */}
            <div className="absolute top-4 left-8 w-32 h-6 rounded-full bg-white/5 blur-sm" />
            <div className="absolute top-10 right-16 w-20 h-4 rounded-full bg-white/5 blur-sm" />

            <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start">
              {/* Icon */}
              <div className="relative h-14 w-14 shrink-0 flex items-center justify-center rounded-2xl bg-sky-500/20 border border-sky-400/25 text-white">
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M12 3v2M12 19v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M3 12h2M19 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                    stroke="#7bb8ff" strokeWidth="1.5" strokeLinecap="round"
                  />
                  <circle cx="12" cy="12" r="4" stroke="#7bb8ff" strokeWidth="1.4" fill="rgba(123,184,255,0.1)" />
                </svg>
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-amber-950">°</span>
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/25 bg-sky-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-sky-300 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                  Vigil BTE · Weather corridor
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                  File a weather claim
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-sky-200/60 max-w-md">
                  Behavioral signals fused with live weather verification. Motion, network context,
                  and order history shape your real-time trust score.
                </p>

                {/* Live weather stats */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "Condition", value: "Heavy Rain", sub: "Bengaluru" },
                    { label: "Wind speed", value: "31 km/h", sub: "NE gusts" },
                    { label: "Visibility", value: "1.4 km", sub: "Poor" },
                    { label: "Data feed", value: "Live", sub: "34s ago", live: true },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl border border-sky-500/15 bg-white/5 px-3 py-2.5"
                    >
                      <p className="text-[10px] uppercase tracking-wider text-sky-400/60">{s.label}</p>
                      {s.live ? (
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                          <span className="text-sm font-semibold text-red-300">{s.value}</span>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm font-semibold text-sky-100">{s.value}</p>
                      )}
                      <p className="text-[10px] text-sky-400/40 mt-0.5">{s.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Scenario selector ──────────────────────────── */}
          <div className="rounded-2xl border border-slate-200/20 bg-white/30 shadow-xl overflow-hidden backdrop-blur-3xl">
            <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100/20">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Claim scenario</h2>
                <p className="text-xs text-slate-500 mt-0.5">Choose a behavioral archetype — signals update live</p>
              </div>
              <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-slate-100/40 text-slate-500 uppercase tracking-wider">
                {PRESETS[preset].label}
              </span>
            </div>
            <div className="p-4 grid grid-cols-3 gap-3">
              {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((p) => {
                const pd = PRESETS[p];
                const isActive = preset === p;
                return (
                  <button
                    key={p}
                    onClick={() => applyPreset(p)}
                    className={`relative text-left rounded-xl border p-3.5 transition-all duration-200 ${
                      isActive
                        ? "border-sky-400 bg-sky-50 ring-2 ring-sky-200/60 shadow-sm"
                        : "border-slate-200 bg-white hover:border-sky-200 hover:bg-sky-50/40"
                    }`}
                  >
                    {/* Archetype icon */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center mb-2.5"
                      style={{ background: pd.iconBg }}
                    >
                      {p === "genuine" && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="6" stroke={pd.iconColor} strokeWidth="1.3" />
                          <path d="M5 8l2 2 4-4" stroke={pd.iconColor} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                      {p === "spoofer" && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="6" stroke={pd.iconColor} strokeWidth="1.3" />
                          <path d="M8 4.5v3.5l2.5 1.5" stroke={pd.iconColor} strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                      )}
                      {p === "syndicate" && (
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <circle cx="8" cy="8" r="6" stroke={pd.iconColor} strokeWidth="1.3" />
                          <path d="M8 5v3.5M8 11h.01" stroke={pd.iconColor} strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-slate-900">{pd.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{pd.desc}</p>

                    {/* Trust score pill */}
                    <div
                      className="mt-2.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ background: pd.trustBg, color: pd.trustColor }}
                    >
                      Trust: {pd.trustScore}
                    </div>

                    {/* Active checkmark */}
                    {isActive && (
                      <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-sky-500 flex items-center justify-center">
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path d="M1.5 4.5l2 2L7.5 2.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Signal bars */}
            <div className="mx-4 mb-4 rounded-xl border border-slate-100/20 bg-slate-50/20 p-3 backdrop-blur-3xl shadow-md">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                Live signal preview
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <SignalBar label="Motion variance" displayValue={activeBars.motion.label} pct={activeBars.motion.pct} color={activeBars.motion.color} />
                <SignalBar label="Step count" displayValue={activeBars.steps.label} pct={activeBars.steps.pct} color={activeBars.steps.color} />
                <SignalBar label="Cell handoffs" displayValue={activeBars.cellHandoffs.label} pct={activeBars.cellHandoffs.pct} color={activeBars.cellHandoffs.color} />
                <SignalBar label="Battery drain" displayValue={activeBars.battery.label} pct={activeBars.battery.pct} color={activeBars.battery.color} />
                <SignalBar label="Screen events" displayValue={activeBars.screen.label} pct={activeBars.screen.pct} color={activeBars.screen.color} />
                <SignalBar label="Active order" displayValue={activeBars.order.label} pct={activeBars.order.pct} color={activeBars.order.color} />
              </div>
            </div>
          </div>

          {/* ── Location ───────────────────────────────────── */}
          <div className="rounded-2xl border border-slate-200/20 bg-white/30 shadow-xl overflow-hidden backdrop-blur-3xl">
            <div className="px-5 py-4 border-b border-slate-100/20">
              <h2 className="text-sm font-semibold text-slate-900">Location</h2>
              <p className="text-xs text-slate-500 mt-0.5">Coordinates captured at claim time</p>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Latitude"
                  type="number"
                  step="0.01"
                  value={signals.lat}
                  onChange={(e) =>
                    setSignals({ ...signals, lat: parseFloat(e.target.value) })
                  }
                />
                <Input
                  label="Longitude"
                  type="number"
                  step="0.01"
                  value={signals.lon}
                  onChange={(e) =>
                    setSignals({ ...signals, lon: parseFloat(e.target.value) })
                  }
                />
              </div>
              <MapPreview lat={signals.lat} lon={signals.lon} />
            </div>
          </div>

          {/* ── UPI handle ─────────────────────────────────── */}
          <div className="rounded-2xl border border-slate-200/20 bg-white/30 shadow-xl overflow-hidden backdrop-blur-3xl">
            <div className="px-5 py-4 border-b border-slate-100/20">
              <h2 className="text-sm font-semibold black">UPI handle</h2>
              <p className="text-xs text-black mt-0.5">Optional · used only with real Razorpay payouts</p>
            </div>
            <div className="p-4">
              <Input
                label="Your UPI ID"
                placeholder="name@bank"
                value={upiHandle}
                onChange={(e) => setUpiHandle(e.target.value)}
              />
              <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-black">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="1.5" y="4.5" width="9" height="7" rx="1.5" stroke="#000000" strokeWidth="1" />
                  <path d="M4 4.5V3a2 2 0 014 0v1.5" stroke="#000000" strokeWidth="1" />
                  <circle cx="6" cy="8" r="1" fill="#000000" />
                </svg>
                End-to-end encrypted · DPDP compliant · Never stored without consent
              </p>
            </div>
          </div>

          {/* ── Submit ─────────────────────────────────────── */}
          <button
            onClick={submit}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold text-white transition-all duration-200 shadow-md shadow-blue-500/20 ${
              loading
                ? "opacity-70 cursor-not-allowed bg-blue-500"
                : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:scale-[0.99]"
            }`}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Analysing signals…
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M7.5 1.5l2 4.5H14l-3.8 2.8 1.4 4.7L7.5 11l-4.1 2.5 1.4-4.7L1 6h4.5l2-4.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
                Submit claim
              </>
            )}
          </button>

          {/* ── Error ──────────────────────────────────────── */}
          {error && (
            <div className="animate-fade-in rounded-2xl border border-red-200/20 bg-red-50/30 p-4 backdrop-blur-3xl shadow-lg">
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          )}

          {/* ── Result ─────────────────────────────────────── */}
          {result && <ClaimResultCard result={result} />}
        </main>
      </div>
    </div>
  );
}

/* ─── Result card ─────────────────────────────────────────── */
function ClaimResultCard({ result }: { result: ClaimResult }) {
  const tierConfig = {
    instant: { label: "Instant Approval", color: "#22c55e", bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.3)" },
    provisional: { label: "Provisional Payout", color: "#f59e0b", bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.3)" },
    escrow: { label: "Escrow Hold", color: "#ef4444", bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.3)" },
  };
  const cfg = tierConfig[result.tier];

  const statusLabel: Record<string, string> = {
    approved_instant: "Payout sent",
    provisional_sent: "Provisional sent",
    completed: "Completed",
    escrow_held: "Escrow review",
    released_after_review: "Escrow released",
    rejected_after_review: "Review rejected",
    rejected_no_adverse_weather: "No adverse weather",
  };
  const statusVariant: Record<string, "success" | "warning" | "error" | "neutral"> = {
    approved_instant: "success",
    completed: "success",
    released_after_review: "success",
    provisional_sent: "warning",
    escrow_held: "warning",
    rejected_after_review: "error",
    rejected_no_adverse_weather: "error",
  };

  return (
    <div className="animate-fade-in rounded-2xl border border-slate-200/30 overflow-hidden shadow-xl bg-white/20 backdrop-blur-3xl">
      {/* Dark header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#022c6b] to-[#033587] p-5">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M0 0h1v1H0zm10 0h1v1h-1zm0 10h1v1h-1zM0 10h1v1H0z'/%3E%3C/g%3E%3C/svg%3E\")" }}
        />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[10px] text-sky-400/40 mb-1.5">{result.claim_id}</p>
            <h2 className="text-lg font-bold text-white">Claim result</h2>
            <div
              className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border"
              style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}
            >
              {cfg.label}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-sky-200/60 max-w-sm">
              {result.payout_message}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant[result.payout_status] ?? "neutral"}>
                {statusLabel[result.payout_status] ?? "Processing"}
              </Badge>
              {result.payout_eta_seconds > 0 &&
                (result.payout_status === "provisional_sent" || result.payout_status === "escrow_held") && (
                  <span className="text-xs text-sky-300/50">ETA: ~{result.payout_eta_seconds}s</span>
                )}
            </div>
            {result.remaining_amount > 0 && (
              <p className="mt-1.5 text-xs text-sky-300/50">Remaining: ₹{result.remaining_amount}</p>
            )}
            {result.payout_ref && (
              <p className="mt-1 font-mono text-[10px] text-sky-400/35">Ref: {result.payout_ref}</p>
            )}
            {result.weather_verified ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" stroke="#34d399" strokeWidth="1" />
                  <path d="M3.5 6l1.8 1.8L8.5 4" stroke="#34d399" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                Weather verified: {result.weather_condition}
              </p>
            ) : (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-400">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" stroke="#fbbf24" strokeWidth="1" />
                  <path d="M6 4v3M6 8.5h.01" stroke="#fbbf24" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                No adverse weather at location
              </p>
            )}
          </div>
          <TrustScoreCircle score={result.trust_score} />
        </div>
      </div>

      {/* Breakdown */}
      <div className="bg-white/30 p-5 backdrop-blur-xl">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-black mb-3">
          Signal breakdown
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(result.breakdown).map(([k, v]) => (
            <div key={k} className="rounded-xl bg-slate-50/40 border border-slate-100/30 px-3 py-2.5 backdrop-blur-xl">
              <p className="text-[10px] text-slate-500 mb-1.5">{k}</p>
              <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${v * 100}%`,
                    background: v >= 0.7 ? "#22c55e" : v >= 0.4 ? "#f59e0b" : "#ef4444",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 font-mono text-[11px] text-black">
          Syndicate suspicion index:{" "}
          <span className="text-black">{result.syndicate_suspicion_index.toFixed(2)}</span>
        </p>
      </div>
    </div>
  );
}

/* ─── Score ring ──────────────────────────────────────────── */
function TrustScoreCircle({ score }: { score: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? "#34d399" : score >= 40 ? "#fbbf24" : "#f87171";

  return (
    <div className="relative flex-shrink-0">
      <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[9px] text-white/40 uppercase tracking-widest">trust</span>
      </div>
    </div>
  );
}