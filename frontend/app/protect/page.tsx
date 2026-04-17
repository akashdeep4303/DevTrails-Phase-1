"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Head from "next/head";
import Header from "@/components/Header";

// ─── Types ────────────────────────────────────────────────────────────────────
type PremiumBreakdown = Record<string, unknown>;
interface WeeklyPremiumResponse {
  worker_id: string;
  weekly_premium_inr: number;
  recommended_coverage_hours_per_day: number;
  safe_zone_discount_inr: number;
  model_name: string;
  breakdown: PremiumBreakdown;
}
type Tier = "instant" | "provisional" | "escrow";
interface ZeroTouchClaim {
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
  initiated_by?: string;
}
type BehaviorProfile = "genuine" | "spoofer" | "syndicate";
interface DisruptionSummary {
  disruption_score?: number;
  triggered?: boolean;
  reasons?: string[];
  weather?: { predicted_rain_prob?: number; predicted_severity?: string };
  water?: { water_logging_risk?: number; safe_zone?: boolean };
  order?: { income_loss_prob?: number; likely_reason?: string };
}

const CONSENT_KEY = "vigil_dpdp_consent";

function parseFloatSafe(v: string, fallback: number) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}
function parseIntSafe(v: string, fallback: number) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}
function apiErrorMessage(res: Response, data: unknown): string {
  if (typeof data === "object" && data !== null && "detail" in data) {
    const d = (data as { detail?: unknown }).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) return JSON.stringify(d);
  }
  return `Request failed (${res.status})`;
}
function networkMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "Request failed";
  if (
    msg === "Failed to fetch" ||
    msg.includes("NetworkError") ||
    msg === "Backend unavailable"
  )
    return "Backend unavailable. From the project root run: npm run dev (or npm run dev:clean).";
  return msg;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Chip({
  label,
  color,
}: {
  label: string;
  color: "sky" | "emerald" | "amber" | "rose" | "violet";
}) {
  const cls = {
    sky: "bg-sky-100 text-sky-800",
    emerald: "bg-sky-100 text-sky-800",
    amber: "bg-blue-100 text-blue-800",
    rose: "bg-blue-100 text-blue-800",
    violet: "bg-sky-100 text-sky-800",
  }[color];
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-bold ${cls}`}
    >
      {label}
    </span>
  );
}

function PremiumGrid({ breakdown }: { breakdown: PremiumBreakdown }) {
  const cells = [
    ["Risk score", breakdown?.risk_score],
    ["Rain prob", breakdown?.forecast_predicted_rain_prob],
    ["Water logging", breakdown?.water_logging_risk],
    ["Road closure", breakdown?.road_closure_prob],
  ];
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {cells.map(([k, v]) => (
        <div
          key={String(k)}
          className="rounded-xl bg-slate-50 border border-slate-100 p-2.5"
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {k as string}
          </p>
          <p className="mt-0.5 font-['Syne',sans-serif] text-base font-bold text-slate-800">
            {String(v ?? "—")}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProtectPage() {
  const heroCardImage = "/backdrops/protect-clouds.png";

  const computeFallbackPremium = (
    workerIdValue: string,
    coverageHours: number
  ): WeeklyPremiumResponse => {
    const hours = Math.max(
      1,
      Math.min(12, Number.isFinite(coverageHours) ? coverageHours : 3)
    );
    const base = 42;
    const hourly = 11;
    const discount = 2;
    const weekly = Math.max(20, Math.round(base + hours * hourly - discount));
    return {
      worker_id: workerIdValue || "demo_protect",
      weekly_premium_inr: weekly,
      recommended_coverage_hours_per_day: hours,
      safe_zone_discount_inr: discount,
      model_name: "fallback-model",
      breakdown: {
        risk_score: Math.min(100, 35 + hours * 6),
        forecast_predicted_rain_prob: 0.61,
        water_logging_risk: 0.58,
        road_closure_prob: 0.33,
      },
    };
  };

  const getDpdpHeaders = (): Record<string, string> => {
    const ok =
      typeof window !== "undefined" &&
      localStorage.getItem(CONSENT_KEY) === "accepted";
    return ok ? { "x-vigil-consent": "accepted" } : {};
  };

  const [consentOk, setConsentOk] = useState(true);
  useEffect(() => {
    const read = () =>
      setConsentOk(
        typeof window !== "undefined" &&
          localStorage.getItem(CONSENT_KEY) === "accepted"
      );
    read();
    window.addEventListener("focus", read);
    return () => window.removeEventListener("focus", read);
  }, []);

  const [workerId, setWorkerId] = useState("demo_protect");
  const [name, setName] = useState("Demo Worker");
  const [upiHandle, setUpiHandle] = useState("");
  const [lat, setLat] = useState(12.0);
  const [lon, setLon] = useState(77.2);
  const [autoOptIn, setAutoOptIn] = useState(true);
  const [coveragePref, setCoveragePref] = useState(3);

  const [policyId, setPolicyId] = useState<string | null>(null);
  const [policySummary, setPolicySummary] = useState<{
    weekly_premium_inr: number;
    coverage_hours_per_day: number;
  } | null>(null);
  const [premium, setPremium] = useState<WeeklyPremiumResponse | null>(null);
  const [premiumLoading, setPremiumLoading] = useState(false);
  const [premiumError, setPremiumError] = useState<string | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [behaviorProfile, setBehaviorProfile] =
    useState<BehaviorProfile>("genuine");
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [triggerOutputs, setTriggerOutputs] = useState<
    { name: string; triggered: boolean; value?: unknown }[] | null
  >(null);
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null);
  const [lastDisruption, setLastDisruption] =
    useState<DisruptionSummary | null>(null);
  const [activeClaim, setActiveClaim] = useState<ZeroTouchClaim | null>(null);

  const busy = registerLoading || triggerLoading;

  const flowSteps = [
    { label: "Policy", done: !!policyId },
    { label: "Premium", done: !!(premium || policySummary) },
    {
      label: "Shield",
      done:
        !!activeClaim ||
        (triggerOutputs !== null && triggerOutputs.length > 0) ||
        !!lastDisruption,
    },
  ];
  const flowPct =
    (flowSteps.filter((s) => s.done).length / flowSteps.length) * 100;

  const applyPreset = (which: "high_disruption" | "bengaluru") => {
    if (which === "high_disruption") {
      setWorkerId("demo_protect");
      setLat(12.0);
      setLon(77.2);
    } else {
      setWorkerId("demo_blr");
      setLat(12.97);
      setLon(77.59);
    }
    setCoveragePref(3);
    setPolicyId(null);
    setPolicySummary(null);
    setPremium(null);
    setActiveClaim(null);
    setLastDisruption(null);
    setTriggerMessage(null);
    setTriggerOutputs(null);
    setSectionError(null);
  };

  const refreshPremium = async () => {
    if (!workerId.trim()) return;
    setPremiumLoading(true);
    setPremiumError(null);
    try {
      const res = await fetch("/api/premium/weekly", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDpdpHeaders(),
        },
        body: JSON.stringify({
          worker_id: workerId.trim(),
          coverage_hours_per_day_pref: coveragePref,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(apiErrorMessage(res, data));
      setPremium(data as WeeklyPremiumResponse);
    } catch (e) {
      setPremium(
        computeFallbackPremium(workerId.trim() || "demo_protect", coveragePref)
      );
      setPremiumError("Using local premium estimate (backend unavailable).");
    } finally {
      setPremiumLoading(false);
    }
  };

  const registerAndCreatePolicy = async () => {
    if (!workerId.trim()) throw new Error("Enter a Worker ID.");
    const latN = Number.isFinite(lat) ? lat : 12.0;
    const lonN = Number.isFinite(lon) ? lon : 77.2;
    const cov =
      Number.isFinite(coveragePref) && coveragePref >= 1 ? coveragePref : 3;
    setSectionError(null);
    setPremiumError(null);
    setPremium(null);
    setPolicyId(null);
    setPolicySummary(null);
    setLastDisruption(null);
    setTriggerMessage(null);
    setTriggerOutputs(null);
    setActiveClaim(null);
    const headers = {
      "Content-Type": "application/json",
      ...getDpdpHeaders(),
    };

    const regRes = await fetch("/api/workers/register", {
      method: "POST",
      headers,
      body: JSON.stringify({
        worker_id: workerId.trim(),
        name: name.trim() || "Worker",
        upi_handle: upiHandle.trim(),
        lat: latN,
        lon: lonN,
        auto_claim_opt_in: autoOptIn,
      }),
    });
    const regData = await regRes.json().catch(() => ({}));
    if (!regRes.ok) throw new Error(apiErrorMessage(regRes, regData));

    const polRes = await fetch("/api/policies/create", {
      method: "POST",
      headers,
      body: JSON.stringify({
        worker_id: workerId.trim(),
        coverage_hours_per_day_pref: cov,
        auto_claim_opt_in: autoOptIn,
        upi_handle: upiHandle.trim(),
      }),
    });
    const polData = await polRes.json().catch(() => ({}));
    if (!polRes.ok) throw new Error(apiErrorMessage(polRes, polData));

    setPolicyId(polData.policy_id as string);
    setPolicySummary({
      weekly_premium_inr: polData.weekly_premium_inr as number,
      coverage_hours_per_day: polData.coverage_hours_per_day as number,
    });
    setPremium({
      worker_id: workerId.trim(),
      weekly_premium_inr: polData.weekly_premium_inr as number,
      recommended_coverage_hours_per_day: polData.coverage_hours_per_day as number,
      safe_zone_discount_inr: polData.safe_zone_discount_inr as number,
      model_name: (polData.recommended_by as string) || "model",
      breakdown: (polData.premium_breakdown as PremiumBreakdown) || {},
    });
  };

  const runDisruptionTriggers = async () => {
    if (!policyId) return;
    setTriggerLoading(true);
    setActiveClaim(null);
    setSectionError(null);
    setTriggerMessage(null);
    setTriggerOutputs(null);
    setLastDisruption(null);
    try {
      const res = await fetch("/api/triggers/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getDpdpHeaders(),
        },
        body: JSON.stringify({
          worker_id: workerId.trim(),
          behavior_profile: behaviorProfile,
          policy_id: policyId,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!res.ok) throw new Error(apiErrorMessage(res, data));
      setTriggerMessage((data.message as string) || null);
      setTriggerOutputs(
        (data.trigger_outputs as typeof triggerOutputs) || null
      );
      if (data.disruption && typeof data.disruption === "object")
        setLastDisruption(data.disruption as DisruptionSummary);
      const claim = data.claim as ZeroTouchClaim | null | undefined;
      if (claim?.claim_id) setActiveClaim(claim);
      if (data.policy && typeof data.policy === "object") {
        const p = data.policy as Record<string, unknown>;
        setPolicySummary({
          weekly_premium_inr: p.weekly_premium_inr as number,
          coverage_hours_per_day: p.coverage_hours_per_day as number,
        });
      }
    } catch (e) {
      setSectionError(networkMessage(e));
    } finally {
      setTriggerLoading(false);
    }
  };

  // Claim polling
  useEffect(() => {
    if (!activeClaim || activeClaim.tier === "instant") return;
    const id = activeClaim.claim_id;
    let cancelled = false;
    const interval = setInterval(async () => {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/claims/${id}`, {
          headers: { ...getDpdpHeaders() },
        });
        if (!res.ok) return;
        const status = await res.json();
        setActiveClaim((prev) =>
          prev
            ? {
                ...prev,
                payout_status:
                  status.payout_status ?? prev.payout_status,
                remaining_amount:
                  typeof status.remaining_amount === "number"
                    ? status.remaining_amount
                    : prev.remaining_amount,
                payout_eta_seconds:
                  typeof status.payout_eta_seconds === "number"
                    ? status.payout_eta_seconds
                    : prev.payout_eta_seconds,
              }
            : prev
        );
      } catch {
        /* ignore */
      }
    }, 2000);
    const stop = window.setTimeout(() => {
      cancelled = true;
      clearInterval(interval);
    }, 45000);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.clearTimeout(stop);
    };
  }, [activeClaim?.claim_id, activeClaim?.tier]);

  const tierColor = (t?: Tier) =>
    t === "instant" ? "emerald" : t === "provisional" ? "amber" : "rose";

  return (
    <>
      {/* ── Google Fonts — using <link> to avoid SSR hydration mismatch ── */}
      <Head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap"
        />
      </Head>

      <div className="relative min-h-screen bg-slate-50 font-['DM_Sans',sans-serif]">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/backdrops/protect-clouds.png')" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/45 via-slate-50/60 to-slate-100/70" />
        <div className="relative z-10">
          <Header />
        </div>
        <main className="relative z-10 mx-auto max-w-4xl px-5 py-10 md:py-14">

          {/* ── HERO ── */}
          <div className="relative mb-8 overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#0c1a35_0%,#0f2d55_45%,#07234a_100%)] p-8 md:p-10 shadow-[0_24px_80px_-12px_rgba(14,165,233,0.45)]">
            {/* grid */}
            <div
  className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-30"
  style={{
    backgroundImage: "url('/backdrops/ish-consul-mt6YD0kH4Bw-unsplash.jpg')"
  }}
/>
            {/* orbs */}
            <div className="pointer-events-none absolute -top-20 -right-16 h-80 w-80 rounded-full bg-sky-500 opacity-30 blur-[60px]" />
            <div className="pointer-events-none absolute -bottom-10 left-16 h-48 w-48 rounded-full bg-sky-400 opacity-25 blur-[60px]" />

            <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              {/* left */}
              <div className="flex-1">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/15 px-4 py-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
                  <span className="font-['Syne'] text-[10px] font-700 uppercase tracking-[.1em] text-sky-300">
                    Coverage Cockpit · Live
                  </span>
                </div>

                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[18px] bg-gradient-to-br from-sky-400 to-sky-700 shadow-[0_8px_24px_rgba(14,165,233,0.5)]">
                  <svg
                    className="h-8 w-8 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  >
                    <path d="M12 3L4 7v5c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V7l-8-4z" />
                    <path d="M9 12l2 2 4-4" strokeLinecap="round" />
                  </svg>
                </div>

                <h1 className="font-['Syne'] text-4xl font-[800] leading-[1.05] text-sky-50 md:text-5xl">
                  Protect your
                  <br />
                  <span className="text-sky-400">worker</span>
                </h1>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-sky-200/80">
                  Enroll workers, price risk in real-time, run disruption
                  simulations, and let zero-touch claims fire automatically.
                </p>
              </div>

              {/* stats */}
              <div className="flex flex-col gap-3 lg:min-w-[220px]">
                
                {[
                  {
                    icon: "🛡️",
                    label: "Coverage mode",
                    value: "Zero-Touch",
                    bg: "bg-sky-500/20",
                  },
                  {
                    icon: "⚡",
                    label: "Claim speed",
                    value: "Instant / 24h",
                    bg: "bg-sky-500/20",
                  },
                  {
                    icon: "🌧️",
                    label: "Risk model",
                    value: "Hyper-local ML",
                    bg: "bg-blue-500/20",
                  },
                ].map(({ icon, label, value, bg }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-sm"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-[10px] text-lg ${bg}`}
                    >
                      {icon}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-300">
                        {label}
                      </p>
                      <p className="font-['Syne'] text-base font-[700] text-sky-50">
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── DPDP warning ── */}
          {!consentOk && (
            <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
              <strong>DPDP consent required.</strong> Accept the privacy banner
              at the bottom of the screen, then retry.
            </div>
          )}

          {/* ── FLOW ── */}
<div className="mb-6 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl p-6 shadow-[0_10px_40px_rgba(2,132,199,0.15)]">

  {/* Header */}
  <div className="mb-4 flex items-center justify-between">
    <span className="text-[11px] font-bold uppercase tracking-[.15em] text-slate-700">
      Flow Progress
    </span>

    <span className="text-2xl font-extrabold text-slate-900">
      {Math.round(flowPct)}%
    </span>
  </div>

  {/* Progress Bar */}
  <div className="relative mb-6 h-2 rounded-full bg-white/30 overflow-hidden">
    <div
      className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-500 to-blue-600 
      transition-all duration-700"
      style={{ width: `${flowPct}%` }}
    />
  </div>

  {/* Steps */}
  <ol className="flex items-center justify-between relative">
    {flowSteps.map((s, i) => (
      <li key={s.label} className="relative flex flex-1 flex-col items-center">

        {/* Line */}
        {i < flowSteps.length - 1 && (
          <div
            className={`absolute top-4 left-[50%] w-full h-[2px] -z-10 transition-all duration-500 ${
              s.done ? "bg-sky-500" : "bg-white/30"
            }`}
          />
        )}

        {/* Step Circle */}
        <div
          className={`relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-500 ${
            s.done
              ? "bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-lg scale-110"
              : "border border-white/30 bg-white/20 text-slate-700"
          }`}
        >
          {s.done ? "✓" : i + 1}
        </div>

        {/* Label */}
        <span
          className={`mt-3 text-[11px] font-semibold text-center ${
            s.done ? "text-slate-900" : "text-slate-600"
          }`}
        >
          {s.label}
        </span>
      </li>
    ))}
  </ol>
</div>

          {/* ── PRESETS ── */}
          <div className="mb-6 flex flex-wrap gap-3">
            {[
              {
                key: "high_disruption" as const,
                title: "High Disruption Zone",
                desc: "12.0°N · 77.2°E — reliably triggers auto-claim",
                badge: "HOT",
                badgeCls: "bg-red-100 text-red-700",
              },
              {
                key: "bengaluru" as const,
                title: "Bengaluru Preset",
                desc: "12.97°N · 77.59°E — calmer zone for comparison",
                badge: "CALM",
                badgeCls: "bg-blue-100 text-blue-700",
              },
            ].map(({ key, title, desc, badge, badgeCls }) => (
              <button
                key={key}
                type="button"
                disabled={busy}
                onClick={() => applyPreset(key)}
                className="group flex flex-1 min-w-[200px] items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md disabled:opacity-50"
              >
                <div className="flex-1">
                  <p className="font-['Syne'] text-sm font-[700] text-slate-800">
                    {title}
                  </p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-[700] uppercase tracking-wide ${badgeCls}`}
                >
                  {badge}
                </span>
              </button>
            ))}
          </div>

          {/* ── TWO-COL CARDS ── */}
          <div className="mb-5 grid gap-5 lg:grid-cols-2">

            {/* REGISTRATION */}
            <div className="relative overflow-hidden rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm 
before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:rounded-t-[22px] before:bg-gradient-to-r before:from-sky-300 before:to-sky-600">

  {/* 🔥 Background Image */}
  <div
    className="pointer-events-none absolute inset-0 bg-cover bg-center "
    style={{ backgroundImage: "url('/backdrops/rosebox-BFdSCxmqvYc-unsplash.jpg')" }}
  />

  {/* 🔥 Glass Overlay for readability */}
  <div className="pointer-events-none absolute inset-0 bg-white/40 " />

  {/* 🔥 Content */}
  <div className="relative z-10">

    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-gradient-to-br from-sky-100 to-sky-200">
        <svg
          className="h-5 w-5 text-sky-700"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
        </svg>
      </div>
      <div>
        <p className="text-[10px] font-[700] uppercase tracking-[.12em] text-black/50">
          Step 01
        </p>
        <p className="font-['Syne'] text-base font-[700] text-black">
          Registration + Policy
        </p>
      </div>
    </div>

    <div className="space-y-3">
      {[
        { label: "Worker ID", id: "wid", val: workerId, set: setWorkerId },
        { label: "Name", id: "wname", val: name, set: setName },
        {
          label: "UPI handle (payout)",
          id: "upi",
          val: upiHandle,
          set: setUpiHandle,
          ph: "name@bank",
        },
      ].map(({ label, id, val, set, ph }) => (
        <div key={id}>
          <label className="mb-1 block text-[11px] font-[500] uppercase tracking-wide text-black">
            {label}
          </label>
          <input
            value={val}
            placeholder={ph}
            onChange={(e) => set(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm text-black outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
        </div>
      ))}

      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: "Latitude",
            val: lat,
            set: (v: string) => setLat(parseFloatSafe(v, lat)),
          },
          {
            label: "Longitude",
            val: lon,
            set: (v: string) => setLon(parseFloatSafe(v, lon)),
          },
        ].map(({ label, val, set }) => (
          <div key={label}>
            <label className="mb-1 block text-[11px] font-[500] uppercase tracking-wide text-black">
              {label}
            </label>
            <input
              type="number"
              step="0.01"
              value={val}
              onChange={(e) => set(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm text-black outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>
        ))}
      </div>

      <div>
        <label className="mb-1 block text-[11px] font-[500] uppercase tracking-wide text-black">
          Coverage hours / day
        </label>
        <input
          type="number"
          min={1}
          max={12}
          step={1}
          value={coveragePref}
          onChange={(e) =>
            setCoveragePref(
              Math.min(
                12,
                Math.max(1, parseIntSafe(e.target.value, coveragePref))
              )
            )
          }
          className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 text-sm text-black outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
        />
      </div>

      <label className="flex cursor-pointer items-center gap-2.5">
        <div
          onClick={() => setAutoOptIn(!autoOptIn)}
          className={`flex h-5 w-5 items-center justify-center rounded-[5px] border-2 transition-all ${
            autoOptIn
              ? "border-sky-500 bg-sky-500"
              : "border-slate-300 bg-white"
          }`}
        >
          {autoOptIn && (
            <svg
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M2 5l2 2 4-4" />
            </svg>
          )}
        </div>
        <span className="text-sm text-black">
          Auto-file claims on disruption (zero-touch)
        </span>
      </label>
    </div>

    <button
      onClick={async () => {
        setRegisterLoading(true);
        setSectionError(null);
        try {
          await registerAndCreatePolicy();
        } catch (e) {
          const fallbackPremium = computeFallbackPremium(
            workerId.trim() || "demo_protect",
            coveragePref
          );
          const fallbackPolicyId = `POL-${Date.now()}`;
          setPolicyId(fallbackPolicyId);
          setPolicySummary({
            weekly_premium_inr: fallbackPremium.weekly_premium_inr,
            coverage_hours_per_day:
              fallbackPremium.recommended_coverage_hours_per_day,
          });
          setPremium(fallbackPremium);
          setSectionError(
            "Backend registration failed. Switched to local demo mode; you can continue flows."
          );
        } finally {
          setRegisterLoading(false);
        }
      }}
      disabled={busy}
      className="mt-4 w-full rounded-xl bg-gradient-to-r from-sky-400 to-sky-700 py-3 font-['Syne'] text-sm font-[700] text-white shadow-[0_6px_20px_rgba(14,165,233,.35)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(14,165,233,.45)] active:translate-y-0 disabled:opacity-50 disabled:transform-none"
    >
      {registerLoading ? "Creating…" : "Register + Create Policy"}
    </button>

    {sectionError && !policyId && (
      <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
        {sectionError}
      </p>
    )}

    {policyId && policySummary && (
      <div className="mt-4 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 p-4">
        <p className="mb-1 text-[10px] font-[700] uppercase tracking-wider text-slate-400">
          Active policy
        </p>
        <p className="mb-2 font-mono text-xs text-sky-700 break-all">
          {policyId}
        </p>
        <div className="flex flex-wrap gap-2">
          <Chip
            label={`₹${policySummary.weekly_premium_inr}/week`}
            color="emerald"
          />
          <Chip
            label={`${policySummary.coverage_hours_per_day}h/day`}
            color="sky"
          />
        </div>
      </div>
    )}

  </div>
</div>

            {/* PREMIUM */}
            <div className="relative overflow-hidden rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:rounded-t-[22px] before:bg-gradient-to-r before:from-sky-300 before:to-sky-600">

  {/* 🔥 Background Image */}
  <div
    className="pointer-events-none absolute inset-0 bg-cover bg-center "
    style={{ backgroundImage: "url('/backdrops/ravi-sharma-Jbu3ShwVVyE-unsplash.jpg')" }}
  />

  {/* 🔥 Glass Overlay for readability */}
  <div className="pointer-events-none absolute inset-0 bg-white/40 " />

  {/* 🔥 Content */}
  <div className="relative z-10">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-gradient-to-br from-sky-100 to-blue-200">
                  <svg
                    className="h-5 w-5 text-sky-700"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-[700] uppercase tracking-[.12em] text-black">
                    Step 02
                  </p>
                  <p className="font-['Syne'] text-base font-[700] text-black">
                    Dynamic Weekly Premium
                  </p>
                </div>
              </div>

              <p className="mb-4 text-sm leading-relaxed text-black">
                Hyper-local risk scoring with safe-zone ₹2 discount when
                applicable.
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={refreshPremium}
                  disabled={!workerId.trim() || registerLoading}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 font-['Syne'] text-sm font-[600] text-black transition hover:border-sky-300 hover:bg-sky-50 disabled:opacity-50"
                >
                  {premiumLoading ? "Calculating…" : "Recalculate Premium"}
                </button>
                {policyId && (
                  <button
                    onClick={async () => {
                      setPremiumLoading(true);
                      setPremiumError(null);
                      try {
                        const res = await fetch(
                          `/api/policies/${policyId}/recalculate`,
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              ...getDpdpHeaders(),
                            },
                            body: JSON.stringify({
                              coverage_hours_per_day_pref: coveragePref,
                            }),
                          }
                        );
                        const b = await res.json().catch(() => ({}));
                        if (!res.ok) throw new Error(apiErrorMessage(res, b));
                        const bd = b as Record<string, unknown>;
                        setPolicySummary({
                          weekly_premium_inr: bd.weekly_premium_inr as number,
                          coverage_hours_per_day:
                            bd.coverage_hours_per_day as number,
                        });
                        await refreshPremium();
                      } catch (e) {
                        setPremiumError(networkMessage(e));
                      } finally {
                        setPremiumLoading(false);
                      }
                    }}
                    disabled={premiumLoading || registerLoading}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 font-['Syne'] text-sm font-[600] text-black transition hover:border-slate-300 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Sync policy premium
                  </button>
                )}
              </div>

              {premiumError && (
                <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                  {premiumError}
                </p>
              )}

              {premium ? (
                <div className="mt-4 rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 p-4">
                  <div className="flex flex-wrap gap-2">
                    <Chip
                      label={`₹${premium.weekly_premium_inr}/week`}
                      color="emerald"
                    />
                    <Chip
                      label={`Safe-zone: ₹${premium.safe_zone_discount_inr}`}
                      color="sky"
                    />
                    <Chip
                      label={premium.model_name || "heuristic"}
                      color="violet"
                    />
                  </div>
                  <p className="mt-3 text-sm text-black">
                    Recommended:{" "}
                    <span className="font-mono font-bold text-black">
                      {premium.recommended_coverage_hours_per_day}h/day
                    </span>
                  </p>
                  <PremiumGrid breakdown={premium.breakdown} />
                </div>
              ) : (
                <p className="mt-4 text-sm text-black">
                  Create a policy first, or recalculate after registering.
                </p>
              )}
  </div>
            </div>
          </div>

          {/* ── TRIGGERS ── */}
          <div className="relative overflow-hidden rounded-[22px] border border-slate-200 bg-white p-6 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:rounded-t-[22px] before:bg-gradient-to-r before:from-sky-400 before:to-blue-600">

  {/* 🔥 Background Image */}
  <div
    className="pointer-events-none absolute inset-0 bg-cover bg-center "
    style={{ backgroundImage: "url('/backdrops/dillon-wanner-5v7hTzv3itw-unsplash.jpg')" }}
  />

  {/* 🔥 Glass Overlay for readability */}
  <div className="pointer-events-none absolute inset-0 bg-white/40 " />

  {/* 🔥 Content */}
  <div className="relative z-10">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-gradient-to-br from-sky-100 to-blue-100">
                <svg
                  className="h-5 w-5 text-sky-700"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
              </div>
              <div>
                <p className="text-[10px] font-[700] uppercase tracking-[.12em] text-black">
                  Step 03
                </p>
                <p className="font-['Syne'] text-base font-[700] text-black">
                  Triggers + Zero-Touch Claim
                </p>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-black">Trust profile</span>
                <select
                  value={behaviorProfile}
                  onChange={(e) =>
                    setBehaviorProfile(e.target.value as BehaviorProfile)
                  }
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-black outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                >
                  <option value="genuine">Genuine worker</option>
                  <option value="spoofer">Home spoofer</option>
                  <option value="syndicate">Syndicate</option>
                </select>
              </div>
              <button
                onClick={runDisruptionTriggers}
                disabled={!policyId || busy}
                className="flex-1 min-w-[180px] rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-2.5 px-5 font-['Syne'] text-sm font-[700] text-white shadow-[0_6px_20px_rgba(14,165,233,.3)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(14,165,233,.4)] disabled:opacity-50 disabled:transform-none"
              >
                {triggerLoading ? "Running…" : "Run disruption check"}
              </button>
            </div>
            <p className="mb-4 text-xs text-black">
              Mocks weather, water-logging, and order-loss APIs. Score above
              threshold fires a claim automatically.
            </p>

            {sectionError && policyId && (
              <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
                {sectionError}
              </p>
            )}
            {triggerMessage && (
              <p className="mb-3 text-sm text-black">{triggerMessage}</p>
            )}

            {triggerOutputs && triggerOutputs.length > 0 && (
              <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="mb-3 text-[10px] font-[700] uppercase tracking-wider text-black">
                  Trigger signals
                </p>
                <div className="space-y-2">
                  {triggerOutputs.map((t, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-b-0 last:pb-0"
                    >
                      <span className="text-sm text-black">{t.name}</span>
                      <Chip
                        label={t.triggered ? "Yes" : "No"}
                        color={t.triggered ? "emerald" : "sky"}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lastDisruption &&
              typeof lastDisruption.disruption_score === "number" && (
                <div className="mb-4 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-blue-50 p-4">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-['Syne'] text-3xl font-[800] text-sky-700">
                      {lastDisruption.disruption_score}
                    </span>
                    <span className="text-sm text-sky-500">
                      disruption score
                    </span>
                  </div>
                  {lastDisruption.reasons?.length ? (
                    <p className="text-xs text-sky-600">
                      Reasons: {lastDisruption.reasons.join(", ")}
                    </p>
                  ) : null}
                  {!lastDisruption.triggered && (
                    <p className="mt-2 text-xs text-blue-800 bg-blue-50 rounded-xl px-3 py-2">
                      Threshold not met — try the{" "}
                      <strong>High Disruption</strong> preset, or adjust
                      lat/lon.
                    </p>
                  )}
                </div>
              )}

            {activeClaim && (
              <div className="overflow-hidden rounded-2xl border-2 border-sky-200 shadow-[0_8px_32px_rgba(14,165,233,.12)]">
                <div className="flex items-center gap-3 bg-gradient-to-r from-sky-800 to-blue-700 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
                    <svg
                      className="h-5 w-5 text-sky-300"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    >
                      <path d="M12 3L4 7v5c0 5 3.5 9.5 8 11 4.5-1.5 8-6 8-11V7l-8-4z" />
                      <path d="M9 12l2 2 4-4" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-['Syne'] font-[700] text-sky-50">
                      {activeClaim.tier.charAt(0).toUpperCase() +
                        activeClaim.tier.slice(1)}{" "}
                      claim filed
                    </p>
                    <p className="font-mono text-xs text-sky-300">
                      {activeClaim.claim_id}
                    </p>
                  </div>
                </div>
                <div className="bg-sky-50 p-4">
                  <p className="mb-3 text-sm leading-relaxed text-sky-900">
                    {activeClaim.payout_message}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Chip
                      label={activeClaim.tier}
                      color={tierColor(activeClaim.tier)}
                    />
                    <Chip
                      label={`Trust ${activeClaim.trust_score}`}
                      color="sky"
                    />
                    <Chip label={activeClaim.payout_status} color="sky" />
                    {activeClaim.weather_verified && (
                      <Chip
                        label={activeClaim.weather_condition}
                        color="emerald"
                      />
                    )}
                    {activeClaim.remaining_amount > 0 && (
                      <Chip
                        label={`Remaining ₹${activeClaim.remaining_amount}`}
                        color="amber"
                      />
                    )}
                    {activeClaim.payout_eta_seconds > 0 && (
                      <Chip
                        label={`ETA ~${activeClaim.payout_eta_seconds}s`}
                        color="violet"
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
  </div>
          </div>

          {/* ── Footer link ── */}
          <div className="mt-5 flex justify-end">
            <Link
              href="/protect/claims"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-['Syne'] text-sm font-[600] text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700"
            >
              View all claims →
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}