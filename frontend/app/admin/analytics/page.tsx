"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { getDpdpHeaders } from "@/lib/consent";

type Insights = {
  total_claims: number;
  clusters: { size: number; window_seconds: number; workers: string[]; device_fingerprints?: string[] }[];
  staggered_triggers?: { workers: string[]; spacing_minutes: number }[];
  behavioral_baseline_flags?: { worker_id: string; claim_count: number; pattern: string }[];
  suspicious_fingerprints?: Record<string, number>;
  ssi_risk: number;
  graph?: { nodes: string[]; edges: { from: string; to: string; weight: number }[] };
};

type InsurerAnalytics = {
  window: { days: number; start: string; end: string };
  policies: { active_count: number; estimated_premiums_collected_inr: number; estimated_weekly_premiums_inr: number };
  claims: { count: number; payouts_inr: number; loss_ratio: number; lifetime_payouts_inr: number };
  forecast_outlook: { top_risky_workers: any[]; zone_hotspots?: any[] };
  monitoring?: {
    running?: boolean;
    enabled?: boolean;
    last_run_at?: string | null;
    last_success_at?: string | null;
    last_error?: string | null;
    iterations?: number;
    policies_scanned?: number;
    claims_triggered?: number;
    interval_seconds?: number;
    cooldown_minutes?: number;
  };
};

type BehavioralAnalysis = {
  aggregate: {
    workers: number;
    claims: number;
    avg_trust_score: number;
    low_trust_rate: number;
    instant_rate: number;
  };
  outliers: Array<{
    worker_id: string;
    claims: number;
    avg_trust_score: number;
    low_trust_rate: number;
    delta_vs_aggregate: { trust: number };
  }>;
};

type Claim = {
  claim_id: string;
  worker_id: string;
  trust_score: number;
  tier?: "instant" | "provisional" | "escrow";
};

export default function AnalyticsPage() {
  const [insights, setInsights] = useState<Insights | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [insurer, setInsurer] = useState<InsurerAnalytics | null>(null);
  const [behavior, setBehavior] = useState<BehavioralAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [controlLoading, setControlLoading] = useState(false);
  const [controlMsg, setControlMsg] = useState<string | null>(null);
  const [intervalInput, setIntervalInput] = useState("60");
  const [cooldownInput, setCooldownInput] = useState("30");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshSeconds, setRefreshSeconds] = useState("10");
  const [windowDays, setWindowDays] = useState("30");
  const [nextRefreshIn, setNextRefreshIn] = useState(0);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [visualAlert, setVisualAlert] = useState<null | "stale" | "critical">(null);
  const [visualAlertMsg, setVisualAlertMsg] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [consentReady, setConsentReady] = useState(false);
  const [nowTs, setNowTs] = useState(Date.now());
  const prevHeartbeatState = useRef<string>("unknown");

  const riskBadge = useMemo(() => {
    const r = insights?.ssi_risk ?? 0;
    if (r >= 0.7) return { color: "text-red-400", bg: "border-red-500/30 bg-red-500/15", label: "High risk", bar: "from-red-500 to-red-400" };
    if (r >= 0.35) return { color: "text-amber-400", bg: "border-amber-500/30 bg-amber-500/15", label: "Moderate", bar: "from-amber-500 to-amber-400" };
    return { color: "text-emerald-400", bg: "border-emerald-500/30 bg-emerald-500/15", label: "Low risk", bar: "from-emerald-500 to-emerald-400" };
  }, [insights?.ssi_risk]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setConsentReady(localStorage.getItem("vigil_dpdp_consent") === "accepted");
  }, []);

  const ensureConsentForDemo = useCallback(() => {
    if (typeof window === "undefined") return false;
    if (localStorage.getItem("vigil_dpdp_consent") !== "accepted") {
      localStorage.setItem("vigil_dpdp_consent", "accepted");
    }
    setConsentReady(true);
    return true;
  }, []);

  const load = useCallback(async (overrideWindowDays?: number) => {
    setLoading(true);
    setErr(null);
    try {
      const headers = getDpdpHeaders();
      const days = Math.max(7, (overrideWindowDays ?? Number(windowDays)) || 30);
      const [iRes, cRes, insRes, bRes] = await Promise.allSettled([
        fetch("/api/syndicate/insights", { headers }),
        fetch("/api/claims/recent?limit=25", { headers }),
        fetch(`/api/analytics/insurer?window_days=${days}`, { headers }),
        fetch(`/api/syndicate/behavioral-analysis?window_days=${days}`, { headers }),
      ]);
      const issues: string[] = [];
      const parseSettled = async (res: PromiseSettledResult<Response>, label: string) => {
        if (res.status === "rejected") {
          issues.push(`${label}: network error`);
          return null;
        }
        const data = await res.value.json().catch(() => ({}));
        if (!res.value.ok) {
          issues.push(`${label}: ${(data as any).detail || `HTTP ${res.value.status}`}`);
          return null;
        }
        return data;
      };

      const iData = await parseSettled(iRes, "Insights");
      const cData = await parseSettled(cRes, "Claims");
      const insData = await parseSettled(insRes, "Insurer analytics");
      const bData = await parseSettled(bRes, "Behavioral analysis");

      setInsights((iData as Insights) ?? null);
      setClaims((((cData as any) || {}).claims || []) as Claim[]);
      setInsurer((insData as InsurerAnalytics) ?? null);
      setBehavior((bData as BehavioralAnalysis) ?? null);

      const m = (insData as InsurerAnalytics | null)?.monitoring;
      if (m?.interval_seconds) setIntervalInput(String(m.interval_seconds));
      if (m?.cooldown_minutes) setCooldownInput(String(m.cooldown_minutes));
      setErr(issues.length ? issues.join(" | ") : null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load analytics");
      setInsights(null); setClaims([]); setInsurer(null); setBehavior(null);
    } finally {
      setLoading(false);
    }
  }, [windowDays]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => {
    if (!autoRefresh) return;
    const sec = Math.max(5, Number(refreshSeconds) || 10);
    setNextRefreshIn(sec);
    const countdown = window.setInterval(() => setNextRefreshIn((p) => (p <= 1 ? sec : p - 1)), 1000);
    const t = window.setInterval(() => { if (!controlLoading) { load(); setNextRefreshIn(sec); } }, sec * 1000);
    return () => { window.clearInterval(t); window.clearInterval(countdown); };
  }, [autoRefresh, refreshSeconds, load, controlLoading]);

  const updateMonitoring = async (payload: { running?: boolean; interval_seconds?: number; cooldown_minutes?: number }) => {
    setControlLoading(true); setControlMsg(null);
    try {
      const headers = getDpdpHeaders();
      const res = await fetch("/api/triggers/monitoring-control", {
        method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (data as any).ok === false) throw new Error((data as any).message || (data as any).detail || "Failed");
      setControlMsg("Monitoring config updated ✓");
      await load();
      return true;
    } catch (e) {
      setControlMsg(e instanceof Error ? e.message : "Failed");
      return false;
    } finally { setControlLoading(false); }
  };

  const heartbeatDeltaSec = useMemo(() => {
    const last = insurer?.monitoring?.last_run_at;
    if (!last) return null;
    const ts = new Date(last).getTime();
    return Number.isFinite(ts) ? Math.max(0, Math.floor((nowTs - ts) / 1000)) : null;
  }, [insurer?.monitoring?.last_run_at, nowTs]);

  const heartbeatHealth = useMemo(() => {
    const interval = Math.max(5, Number(insurer?.monitoring?.interval_seconds || 60));
    if (heartbeatDeltaSec === null) return { label: "unknown", color: "bg-slate-500", ring: "border-slate-500/30 bg-slate-500/15 text-slate-400" };
    if (heartbeatDeltaSec <= interval * 1.5) return { label: "healthy", color: "bg-emerald-400", ring: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400" };
    if (heartbeatDeltaSec <= interval * 3) return { label: "stale", color: "bg-amber-400", ring: "border-amber-500/30 bg-amber-500/15 text-amber-400" };
    return { label: "critical", color: "bg-red-400", ring: "border-red-500/30 bg-red-500/15 text-red-400" };
  }, [heartbeatDeltaSec, insurer?.monitoring?.interval_seconds]);

  const lastHeartbeatLabel = useMemo(() => {
    if (heartbeatDeltaSec === null) return "No heartbeat yet";
    if (heartbeatDeltaSec < 60) return `${heartbeatDeltaSec}s ago`;
    return `${Math.floor(heartbeatDeltaSec / 60)}m ${heartbeatDeltaSec % 60}s ago`;
  }, [heartbeatDeltaSec]);

  const playAlertTone = useCallback((mode: "stale" | "critical") => {
    if (!soundAlerts || typeof window === "undefined") return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = "sine"; osc.frequency.value = mode === "critical" ? 880 : 660; gain.gain.value = 0.0001;
      osc.connect(gain); gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + (mode === "critical" ? 0.45 : 0.25));
      osc.start(now); osc.stop(now + (mode === "critical" ? 0.5 : 0.3));
      window.setTimeout(() => void ctx.close(), 700);
    } catch {}
  }, [soundAlerts]);

  useEffect(() => {
    const cur = heartbeatHealth.label, prev = prevHeartbeatState.current;
    if (cur !== prev) {
      if (cur === "stale") { setVisualAlert("stale"); setVisualAlertMsg("Scheduler heartbeat is stale. Monitoring may be delayed."); playAlertTone("stale"); }
      else if (cur === "critical") { setVisualAlert("critical"); setVisualAlertMsg("Scheduler heartbeat is critical. Immediate attention required."); playAlertTone("critical"); }
      else if (cur === "healthy") { setVisualAlert(null); setVisualAlertMsg(null); }
      prevHeartbeatState.current = cur;
    }
  }, [heartbeatHealth.label, playAlertTone]);

  const downloadSnapshot = () => {
    const blob = new Blob([JSON.stringify({ generated_at: new Date().toISOString(), window_days: Number(windowDays) || 30, insurer, insights, behavior, claims: claims.slice(0, 25) }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `vigil-snapshot-${Date.now()}.json`; a.click();
  };

  const applyDemoMode = async () => {
    setDemoMode(true);
    try {
      ensureConsentForDemo();
      setWindowDays("7");
      setAutoRefresh(true);
      setRefreshSeconds("5");
      setSoundAlerts(true);
      const ok = await updateMonitoring({ interval_seconds: 15, cooldown_minutes: 5, running: true });
      if (ok) setControlMsg("Demo mode enabled ✓");
      else setControlMsg("Demo mode partially applied (scheduler control failed)");
      await load(7);
    }
    finally { setDemoMode(false); }
  };

  return (
    <div className="analytics-black relative min-h-screen overflow-hidden bg-slate-950">

      {/* ══════════════════════════════════════
          PAGE BACKGROUND — swap URL to your own photo
          Recommended: dark circuit / data-center / city aerial
      ══════════════════════════════════════ */}
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat opacity-200"
        style={{
          backgroundImage:
            "url('/backdrops/mark-tegethoff-NMLv5HQZnK4-unsplash.jpg')",
        }}
      />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-slate-950/92 via-slate-900/85 to-sky-950/90" />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

      {/* Ambient colour orbs */}
      <div className="pointer-events-none fixed left-0 top-1/4 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-sky-600/8 blur-[160px]" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-violet-600/7 blur-[130px]" />
      <div className="pointer-events-none fixed right-1/3 top-0 h-[400px] w-[400px] rounded-full bg-emerald-500/5 blur-[120px]" />

      <div className="relative z-10 min-h-screen">
        <Header />

        <main className="mx-auto max-w-6xl px-6 py-10 md:py-12">

          {/* ══════════════════════════════════════
              HERO BACKGROUND SECTION
          ══════════════════════════════════════ */}
          <div
            className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-10"
            style={{
              backgroundImage:
                "url('/backdrops/analytics-hero-bg.jpg')",
            }}
          />
          <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-white/70 via-white/60 to-white/50" />

          {/* ── Hero banner ── */}
          <div className="relative z-10 mb-8 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
            <div className="h-1 w-full bg-gradient-to-r from-sky-500 via-violet-500 to-emerald-400" />
            {/* Background Image */}
<div
  className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70"
  style={{
    backgroundImage: "url('/backdrops/aj-McsNra2VRQQ-unsplash.jpg')",
  }}
/>

{/* Optional dark overlay for readability */}
<div className="pointer-events-none absolute inset-0 bg-black/40" />
            <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between md:p-8">
              <div className="flex items-start gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300 drop-shadow-lg">Intelligence console</p>
                  </div>
                  <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white drop-shadow-2xl md:text-3xl" style={{ textShadow: '0 0 20px rgba(59, 130, 246, 0.8), 0 2px 10px rgba(0, 0, 0, 0.8)' }}>Analytics</h1>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-white drop-shadow-lg" style={{ textShadow: '0 0 15px rgba(59, 130, 246, 0.6), 0 2px 8px rgba(255, 255, 255, 0.8)' }}>
                    Scheduler health, risk hotspots, behavioral outliers, and live demo controls.
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/admin" className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white drop-shadow-md backdrop-blur-sm transition-all hover:border-sky-400/30 hover:text-sky-300" style={{ textShadow: '0 0 10px rgba(59, 130, 246, 0.5)' }}>
                  ← Admin
                </Link>
                <ActionBtn onClick={load} loading={loading} icon="↺">Refresh</ActionBtn>
                <ActionBtn onClick={downloadSnapshot} icon="↓">Export</ActionBtn>
                <ActionBtn onClick={applyDemoMode} loading={demoMode || controlLoading} accent highlight>Demo mode</ActionBtn>
              </div>
            </div>
          </div>

          {/* ── Window control ── */}
          <div className="mb-6 flex flex-wrap items-end gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md shadow-xl">
            <div className="flex items-center gap-2">
              <div className="h-4 w-0.5 rounded-full bg-sky-400" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-400 drop-shadow-lg" style={{ textShadow: '0 0 12px rgba(56, 189, 248, 0.7)' }}>Panel range</p>
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-black">Window (days)</label>
              <input
                type="number" min={7} max={180} value={windowDays}
                onChange={(e) => setWindowDays(e.target.value)}
                className="w-40 rounded-xl border border-white/10 bg-white/8 px-4 py-2 text-sm text-black outline-none transition-all focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            <ActionBtn onClick={load} loading={loading}>Apply window</ActionBtn>
            {!consentReady && (
              <span className="rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-black">
                Consent not found (Demo mode will auto-enable)
              </span>
            )}
          </div>

          {/* ── Error banner ── */}
          {err && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4 backdrop-blur-sm">
              <span className="mt-0.5 text-red-600">⚠</span>
              <p className="text-sm font-medium text-red-700">{err}</p>
            </div>
          )}

          {/* ── Heartbeat alert ── */}
          {visualAlert && (
            <div className={`mb-6 overflow-hidden rounded-2xl border backdrop-blur-sm ${visualAlert === "critical" ? "border-red-500/20 bg-red-500/10" : "border-amber-500/20 bg-amber-500/10"}`}>
              <div className={`h-0.5 w-full ${visualAlert === "critical" ? "bg-red-500" : "bg-amber-500"}`} />
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${visualAlert === "critical" ? "bg-red-500" : "bg-amber-500"}`} />
                    <span className={`relative inline-flex h-3 w-3 rounded-full ${visualAlert === "critical" ? "bg-red-500" : "bg-amber-500"}`} />
                  </span>
                  <p className={`text-sm font-semibold ${visualAlert === "critical" ? "text-red-700" : "text-amber-700"}`}>{visualAlertMsg}</p>
                </div>
                <button onClick={() => setVisualAlert(null)} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:text-white">
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* ── Loading state ── */}
          {loading ? (
            <div className="flex h-72 items-center justify-center">
              <div className="flex flex-col items-center gap-5">
                <div className="relative h-16 w-16">
                  <div className="absolute inset-0 animate-spin rounded-full border-2 border-violet-500/20 border-t-violet-400" />
                  <div className="absolute inset-2 animate-spin rounded-full border-2 border-sky-500/20 border-t-sky-400 [animation-direction:reverse] [animation-duration:0.7s]" />
                  <div className="absolute inset-4 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-400 [animation-duration:0.4s]" />
                </div>
                <p className="text-sm font-medium text-slate-200">Loading intelligence data…</p>
              </div>
            </div>
          ) : (
            <>
              {/* ══════════════════════════
                  INSURER KPI ROW
              ══════════════════════════ */}
              {insurer && (
                <div className="mb-6 grid gap-4 md:grid-cols-4">
                  <KpiTile label="Active policies" value={String(insurer.policies.active_count)} icon="🛡️" color="sky" />
                  <KpiTile label={`Premiums (${insurer.window.days}d)`} value={`₹${insurer.policies.estimated_premiums_collected_inr}`} icon="💰" color="emerald" />
                  <KpiTile label="Payouts (window)" value={`₹${insurer.claims.payouts_inr}`} sub={`${insurer.claims.count} claim(s)`} icon="⚡" color="violet" />
                  <div className="group relative overflow-hidden rounded-2xl border border-amber-500/20 bg-white/5 p-5 shadow-xl backdrop-blur-md transition-all hover:-translate-y-0.5">
                    <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-amber-500/10 blur-2xl" />
                    <div className="relative flex items-start justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-400">Loss ratio</p>
                      <span className="text-lg">📊</span>
                    </div>
                    <p className="relative mt-2 text-2xl font-bold tabular-nums black">
                      {(insurer.claims.loss_ratio * 100).toFixed(0)}%
                    </p>
                    {/* Loss ratio bar */}
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${insurer.claims.loss_ratio > 0.85 ? "bg-gradient-to-r from-red-500 to-red-400" : insurer.claims.loss_ratio > 0.55 ? "bg-gradient-to-r from-amber-500 to-amber-400" : "bg-gradient-to-r from-emerald-500 to-emerald-400"}`}
                        style={{ width: `${Math.min(100, insurer.claims.loss_ratio * 100)}%` }}
                      />
                    </div>
                    <p className={`mt-1.5 text-[10px] font-bold uppercase tracking-wider ${insurer.claims.loss_ratio > 0.85 ? "text-red-400" : insurer.claims.loss_ratio > 0.55 ? "text-amber-400" : "text-emerald-400"}`}>
                      {insurer.claims.loss_ratio > 0.85 ? "stress" : insurer.claims.loss_ratio > 0.55 ? "watch" : "healthy"}
                    </p>
                  </div>
                </div>
              )}

              {/* ══════════════════════════
                  SCHEDULER HEALTH ROW
              ══════════════════════════ */}
              {insurer?.monitoring && (
                <div className="mb-6 grid gap-4 md:grid-cols-4">
                  {/* Scheduler status */}
                  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-md">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300">Scheduler</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="relative flex h-3 w-3">
                        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${heartbeatHealth.color}`} />
                        <span className={`relative inline-flex h-3 w-3 rounded-full ${heartbeatHealth.color}`} />
                      </span>
                      <span className={`text-sm font-bold ${insurer.monitoring.running ? "text-emerald-600" : "text-red-600"}`}>
                        {insurer.monitoring.running ? "Running" : "Stopped"}
                      </span>
                    </div>
                    <div className={`mt-2 inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${heartbeatHealth.ring}`}>
                      {heartbeatHealth.label}
                    </div>
                    <p className="mt-2 text-[10px] text-slate-300">every ~{insurer.monitoring.interval_seconds ?? "?"}s</p>
                  </div>

                  <KpiTile label="Monitor runs" value={String(insurer.monitoring.iterations ?? 0)} icon="🔄" color="sky" />
                  <KpiTile label="Policies scanned" value={String(insurer.monitoring.policies_scanned ?? 0)} icon="🔍" color="violet" />
                  <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-md">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300">Auto claims fired</p>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-slate-100">{insurer.monitoring.claims_triggered ?? 0}</p>
                    {insurer.monitoring.last_error ? (
                      <p className="mt-2 text-[10px] font-medium text-red-400">err: {insurer.monitoring.last_error}</p>
                    ) : (
                      <p className="mt-2 text-[10px] text-slate-300">
                        last success: {insurer.monitoring.last_success_at ? new Date(insurer.monitoring.last_success_at).toLocaleTimeString() : "—"}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ══════════════════════════
                  MONITORING CONTROLS
              ══════════════════════════ */}
              {insurer?.monitoring && (
                <div className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
                  <div className="border-b border-white/8 px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-0.5 rounded-full bg-violet-400" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">Monitoring controls</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-300">Live controls: pause/resume scheduler and tune timing.</p>
                  </div>
                  <div className="p-6">
                    {/* Top info tiles */}
                    <div className="mb-5 grid gap-3 md:grid-cols-3">
                      {/* Heartbeat tile */}
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300">Last heartbeat</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="relative flex h-3 w-3">
                            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${heartbeatHealth.color}`} />
                            <span className={`relative inline-flex h-3 w-3 rounded-full ${heartbeatHealth.color}`} />
                          </span>
                          <p className="text-lg font-bold tabular-nums text-slate-100">{lastHeartbeatLabel}</p>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-300">Status: {heartbeatHealth.label}</p>
                      </div>

                      {/* Auto refresh tile */}
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300">Auto refresh</p>
                        <div className="mt-2 flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setAutoRefresh((v) => !v)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoRefresh ? "bg-sky-500" : "bg-white/10"}`}
                          >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${autoRefresh ? "translate-x-5" : "translate-x-1"}`} />
                          </button>
                          <span className="text-sm font-semibold text-slate-100">{autoRefresh ? "On" : "Off"}</span>
                        </div>
                        <p className="mt-1 text-[10px] text-slate-300">
                          {autoRefresh ? `next in ${nextRefreshIn}s` : "paused"}
                        </p>
                      </div>

                      {/* Refresh interval */}
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                        <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300">Refresh interval (sec)</label>
                        <input
                          type="number" min={5} value={refreshSeconds}
                          onChange={(e) => setRefreshSeconds(e.target.value)}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/20"
                        />
                      </div>
                    </div>

                    {/* Sound toggle + test */}
                    <div className="mb-5 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => setSoundAlerts((v) => !v)}
                          className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${soundAlerts ? "bg-sky-500" : "bg-white/10"}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${soundAlerts ? "translate-x-5" : "translate-x-1"}`} />
                        </button>
                        <span className="text-xs font-semibold text-slate-100">Sound alerts {soundAlerts ? "on" : "off"}</span>
                      </div>
                      <button
                        onClick={() => { setVisualAlert("critical"); setVisualAlertMsg("Test alert: critical heartbeat event."); playAlertTone("critical"); }}
                        className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 transition-all hover:bg-red-500/20"
                      >
                        Test alert
                      </button>
                    </div>

                    {/* Interval inputs */}
                    <div className="mb-4 grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300">Interval (seconds)</label>
                        <input type="number" min={10} value={intervalInput} onChange={(e) => setIntervalInput(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-white/8 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20" />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300">Cooldown (minutes)</label>
                        <input type="number" min={1} value={cooldownInput} onChange={(e) => setCooldownInput(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-white/8 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20" />
                      </div>
                      <div className="flex items-end">
                        <ActionBtn onClick={() => updateMonitoring({ interval_seconds: Number(intervalInput) || 60, cooldown_minutes: Number(cooldownInput) || 30 })} loading={controlLoading} accent>
                          Save timing
                        </ActionBtn>
                      </div>
                    </div>

                    {/* Quick presets */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "Demo fast (15s/5m)", payload: { interval_seconds: 15, cooldown_minutes: 5, running: true } },
                        { label: "Balanced (60s/30m)", payload: { interval_seconds: 60, cooldown_minutes: 30, running: true } },
                        { label: "Resume scheduler", payload: { running: true } },
                      ].map(({ label, payload }) => (
                        <button key={label} disabled={controlLoading} onClick={() => updateMonitoring(payload)}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-100 transition-all hover:border-sky-400/30 hover:bg-white/10 hover:text-white disabled:opacity-50">
                          {label}
                        </button>
                      ))}
                      <button disabled={controlLoading} onClick={() => updateMonitoring({ running: false })}
                        className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50">
                        Pause scheduler
                      </button>
                    </div>

                    {controlMsg && (
                      <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5">
                        <span className="text-emerald-400">✓</span>
                        <p className="text-xs font-medium text-emerald-300">{controlMsg}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ══════════════════════════
                  SYNDICATE INTEL ROW
              ══════════════════════════ */}
              <div className="mb-6 grid gap-4 md:grid-cols-4">
                <KpiTile label="Claims (window)" value={String(insights?.total_claims ?? 0)} icon="📋" color="sky" />
                <KpiTile label="Clusters" value={String(insights?.clusters?.length ?? 0)} icon="🕸️" color="violet" />
                <KpiTile label="Suspicious FPs" value={String(Object.keys(insights?.suspicious_fingerprints || {}).length)} icon="🔴" color="red" />
                {/* SSI Risk tile with arc */}
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-md">
                  <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-sky-500/10 blur-2xl" />
                  <p className="relative text-[10px] font-bold uppercase tracking-[0.15em] text-slate-300">SSI Risk</p>
                  <div className="relative mt-2 flex items-center gap-3">
                    {/* Mini arc SVG */}
                    <svg width="48" height="48" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="18" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                      <circle cx="24" cy="24" r="18" fill="none" stroke="url(#riskGrad)" strokeWidth="5" strokeLinecap="round"
                        strokeDasharray="113.1" strokeDashoffset={113.1 * (1 - (insights?.ssi_risk ?? 0))}
                        transform="rotate(-90 24 24)" />
                      <defs>
                        <linearGradient id="riskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div>
                      <p className="text-2xl font-bold tabular-nums text-slate-100">{((insights?.ssi_risk ?? 0) * 100).toFixed(0)}%</p>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${riskBadge.bg} ${riskBadge.color}`}>
                        {riskBadge.label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ══════════════════════════
                  FINGERPRINT GRAPH + RECENT CLAIMS
              ══════════════════════════ */}
              <div className="mb-6 grid gap-6 lg:grid-cols-2">
                {/* Fingerprint graph */}
                <GlassPanel title="Fingerprint graph" sub="Co-occurrence of device fingerprints in clusters." accent="violet">
                  {insights?.graph?.edges?.length ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/8">
                          {["From", "To", "Weight"].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-black">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {insights.graph.edges.slice(0, 12).map((e) => (
                          <tr key={`${e.from}-${e.to}`} className="border-b border-white/5 transition-colors hover:bg-white/5">
                            <td className="px-4 py-3 font-mono text-xs text-black">{e.from}</td>
                            <td className="px-4 py-3 font-mono text-xs text-black">{e.to}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${e.weight >= 2 ? "border-amber-500/30 bg-amber-500/15 text-amber-400" : "border-white/10 bg-white/8 text-black"}`}>
                                {e.weight}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : <EmptyState icon="🕸️" msg="No graph edges yet." />}
                </GlassPanel>

                {/* Recent claims */}
                <GlassPanel title="Recent claims" sub="Latest claim events and trust distribution." accent="sky">
                  {claims.length === 0 ? <EmptyState icon="📋" msg="No claims yet." /> : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/8">
                          {["Claim", "Worker", "Trust", "Tier"].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-black">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {claims.slice(0, 18).map((c) => (
                          <tr key={c.claim_id} className="border-b border-white/5 transition-colors hover:bg-white/5">
                            <td className="px-4 py-3 font-mono text-xs text-black">{c.claim_id}</td>
                            <td className="px-4 py-3 text-xs text-black">{c.worker_id}</td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <span className={`text-xs font-bold ${c.trust_score >= 70 ? "text-emerald-400" : c.trust_score >= 40 ? "text-amber-400" : "text-red-400"}`}>{c.trust_score}</span>
                                <div className="h-1 w-10 overflow-hidden rounded-full bg-white/10">
                                  <div className={`h-full rounded-full ${c.trust_score >= 70 ? "bg-emerald-400" : c.trust_score >= 40 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${c.trust_score}%` }} />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3"><TierPill tier={c.tier} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </GlassPanel>
              </div>

              {/* ══════════════════════════
                  ZONE HOTSPOTS + BEHAVIOR OUTLIERS
              ══════════════════════════ */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Zone hotspots */}
                <GlassPanel title="Zone hotspots" sub="Risk concentration by meso zone." accent="amber">
                  {insurer?.forecast_outlook?.zone_hotspots?.length ? (
                    <div className="space-y-3">
                      {insurer.forecast_outlook.zone_hotspots.slice(0, 8).map((z: any) => (
                        <div key={z.zone} className="group rounded-xl border border-white/8 bg-white/5 p-4 transition-all hover:border-amber-500/20 hover:bg-white/8">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-mono text-xs font-semibold text-black">{z.zone}</p>
                            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${Number(z.avg_risk_score) >= 0.65 ? "border-amber-500/30 bg-amber-500/15 text-amber-400" : "border-white/10 bg-white/8 text-black"}`}>
                              risk {Number(z.avg_risk_score).toFixed(2)}
                            </span>
                          </div>
                          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-amber-400 transition-all duration-700"
                              style={{ width: `${Math.min(100, Math.max(3, Number(z.avg_risk_score) * 100))}%` }} />
                          </div>
                          <p className="mt-1.5 text-[10px] text-black">{z.policies} active policy(s)</p>
                        </div>
                      ))}
                    </div>
                  ) : <EmptyState icon="🗺️" msg="No zone concentration data yet." />}
                </GlassPanel>

                {/* Behavior outliers */}
                <GlassPanel title="Behavior outliers" sub="Individual workers vs aggregate baseline." accent="emerald">
                  {behavior?.aggregate && (
                    <div className="mb-4 rounded-xl border border-white/8 bg-white/5 px-4 py-3 text-[11px] text-black">
                      workers {behavior.aggregate.workers} · claims {behavior.aggregate.claims} · avg trust{" "}
                      <span className="font-semibold text-black">{behavior.aggregate.avg_trust_score}</span> · low trust{" "}
                      <span className="font-semibold text-black">{(behavior.aggregate.low_trust_rate * 100).toFixed(0)}%</span>
                    </div>
                  )}
                  {behavior?.outliers?.length ? (
                    <div className="space-y-3">
                      {behavior.outliers.slice(0, 8).map((o) => (
                        <div key={o.worker_id} className="group rounded-xl border border-white/8 bg-white/5 p-4 transition-all hover:border-emerald-500/20 hover:bg-white/8">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-mono text-xs font-semibold text-black">{o.worker_id}</p>
                            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${o.low_trust_rate >= 0.66 ? "border-red-500/30 bg-red-500/15 text-red-400" : "border-amber-500/30 bg-amber-500/15 text-amber-400"}`}>
                              low trust {(o.low_trust_rate * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                            <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-red-400 transition-all duration-700"
                              style={{ width: `${Math.min(100, o.low_trust_rate * 100)}%` }} />
                          </div>
                          <p className="mt-1.5 text-[10px] text-black">
                            claims {o.claims} · avg trust {o.avg_trust_score} · delta {o.delta_vs_aggregate.trust}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : <EmptyState icon="👤" msg="No strong outliers in selected window." />}
                </GlassPanel>
              </div>

              <p className="mt-8 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-slate-300">
                Behavioral Trust Engine · Intelligence Console
              </p>
            </>
          )}
        </main>
      </div>
      <style jsx global>{`
        .analytics-black [class*="text-white"],
        .analytics-black [class*="text-slate-"] {
          color: #000000 !important;
          text-shadow: none !important;
        }
      `}</style>
    </div>
  );
}

/* ── Reusable components ── */

function KpiTile({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: string; color: string }) {
  const colors: Record<string, string> = {
    sky:    "border-sky-500/20 bg-sky-500/10 text-sky-400",
    emerald:"border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    violet: "border-violet-500/20 bg-violet-500/10 text-violet-400",
    red:    "border-red-500/20 bg-red-500/10 text-red-400",
  };
  const c = colors[color] ?? colors.sky;
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-md transition-all hover:-translate-y-0.5 hover:bg-white/8">
      <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-60 blur-2xl" style={{ background: `var(--tw-gradient-stops)` }} />
      <div className="relative flex items-start justify-between">
        <p className={`text-[10px] font-bold uppercase tracking-[0.15em] ${c.split(" ")[2]}`}>{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="relative mt-2 text-2xl font-bold tabular-nums text-slate-100">{value}</p>
      {sub && <p className="relative mt-1 text-[10px] text-slate-300">{sub}</p>}
    </div>
  );
}

function GlassPanel({ title, sub, accent, children }: { title: string; sub: string; accent: string; children: React.ReactNode }) {
  const accents: Record<string, string> = {
    sky: "bg-sky-400", violet: "bg-violet-400", amber: "bg-amber-400", emerald: "bg-emerald-400",
  };
  const textColors: Record<string, string> = {
    sky: "text-sky-400", violet: "text-violet-400", amber: "text-amber-400", emerald: "text-emerald-400",
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
      <div className="border-b border-white/8 px-6 py-5">
        <div className="flex items-center gap-2">
          <div className={`h-4 w-0.5 rounded-full ${accents[accent] ?? "bg-sky-400"}`} />
          <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${textColors[accent] ?? "text-sky-400"}`}>{title}</p>
        </div>
        <p className="mt-0.5 text-xs text-slate-300">{sub}</p>
      </div>
      <div className="overflow-x-auto p-4">{children}</div>
    </div>
  );
}

function EmptyState({ icon, msg }: { icon: string; msg: string }) {
  return (
    <div className="flex h-32 flex-col items-center justify-center gap-2">
      <span className="text-2xl">{icon}</span>
      <p className="text-xs text-slate-300">{msg}</p>
    </div>
  );
}

function TierPill({ tier }: { tier?: string }) {
  if (!tier) return <span className="text-xs text-slate-300">—</span>;
  const map: Record<string, string> = {
    instant:     "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
    provisional: "border-amber-500/30 bg-amber-500/15 text-amber-400",
    escrow:      "border-red-500/30 bg-red-500/15 text-red-400",
  };
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[tier] ?? "border-white/10 bg-white/8 text-slate-300"}`}>
      {tier}
    </span>
  );
}

function ActionBtn({ onClick, loading, accent, icon, children, highlight }: { onClick: () => void; loading?: boolean; accent?: boolean; icon?: string; children: React.ReactNode; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all disabled:opacity-60 ${
        accent
          ? highlight
            ? "bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 text-white font-bold shadow-2xl shadow-yellow-500/60 hover:shadow-yellow-500/80 animate-pulse"
            : "bg-gradient-to-r from-sky-500 to-violet-500 text-white shadow-lg shadow-sky-500/50 hover:from-sky-400 hover:to-violet-400 hover:shadow-sky-500/70"
          : "border border-sky-400/30 bg-white/5 text-white backdrop-blur-sm hover:border-sky-400/50 hover:bg-white/10 shadow-md shadow-sky-500/30 hover:shadow-sky-500/50"
      }`}
      style={accent && highlight ? { textShadow: '0 0 20px rgba(255, 193, 7, 0.9), 0 0 30px rgba(255, 87, 34, 0.7)' } : accent ? { textShadow: '0 0 15px rgba(59, 130, 246, 0.8)' } : { textShadow: '0 0 12px rgba(59, 130, 246, 0.6)' }}
    >
      {loading ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : icon ? <span>{icon}</span> : null}
      {children}
    </button>
  );
}
