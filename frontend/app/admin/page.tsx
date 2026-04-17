"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import Header from "@/components/Header";

interface Claim {
  claim_id: string;
  worker_id: string;
  claimed_at: string;
  lat: number;
  lon: number;
  trust_score: number;
  tier: string;
  device_fp?: string;
}

interface SyndicateInsights {
  total_claims: number;
  clusters: { size: number; window_seconds: number; workers: string[] }[];
  staggered_triggers?: { workers: string[]; spacing_minutes: number }[];
  behavioral_baseline_flags?: { worker_id: string; claim_count: number; pattern: string }[];
  suspicious_fingerprints: Record<string, number>;
  ssi_risk: number;
  device_fingerprints: Record<string, number>;
}

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
});

// ─── Shared primitives ───────────────────────────────────────────────────────

function Pill({ label, variant }: { label: string; variant: "instant" | "provisional" | "escrow" | "default" }) {
  const cls = {
    instant:     "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
    provisional: "border-amber-500/30  bg-amber-500/15  text-amber-300",
    escrow:      "border-rose-500/30   bg-rose-500/15   text-rose-300",
    default:     "border-white/10      bg-white/6       text-slate-400",
  }[variant];
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${cls}`}>
      {label}
    </span>
  );
}

function TrustBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-emerald-400" : score >= 40 ? "bg-amber-400" : "bg-rose-400";
  const text  = score >= 70 ? "text-emerald-300" : score >= 40 ? "text-amber-300" : "text-rose-300";
  return (
    <div className="flex items-center gap-2">
      <span className={`font-mono text-sm font-bold ${text}`}>{score}</span>
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function SectionBadge({ label, variant }: { label: string; variant: "amber" | "rose" | "cyan" }) {
  const cls = {
    amber: "border-amber-500/30 bg-amber-500/12 text-amber-300",
    rose:  "border-rose-500/30  bg-rose-500/12  text-rose-300",
    cyan:  "border-cyan-500/25  bg-cyan-500/10  text-cyan-300",
  }[variant];
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${cls}`}>
      {label}
    </span>
  );
}

function ClusterItem({
  index, size, windowSeconds, workers, color = "amber",
}: { index?: number; size?: number; windowSeconds?: number; workers: string[]; color?: "amber" | "rose" }) {
  const numCls = color === "rose"
    ? "border-rose-500/30 bg-rose-500/12 text-rose-300"
    : "border-amber-500/30 bg-amber-500/12 text-amber-300";
  return (
    <div className="mb-2 flex items-start gap-3 rounded-xl border border-white/6 bg-white/[0.03] px-3.5 py-3 last:mb-0">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border font-mono text-[11px] font-bold ${numCls}`}>
        {index !== undefined ? index + 1 : "~"}
      </div>
      <div>
        {size !== undefined && (
          <p className={`text-xs font-bold ${color === "rose" ? "text-rose-300" : "text-amber-300"}`}>
            {size} claims{windowSeconds !== undefined ? ` · ${windowSeconds}s window` : ""}
          </p>
        )}
        <p className="mt-0.5 font-mono text-[11px] leading-relaxed text-slate-500">
          {workers.slice(0, 6).join(" · ")}
          {workers.length > 6 && ` +${workers.length - 6} more`}
        </p>
      </div>
    </div>
  );
}

function SectionCard({
  title, sub, badge, children,
}: { title: string; sub: string; badge: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-4 overflow-hidden rounded-[18px] border border-slate-200/30 bg-slate-50/40 backdrop-blur-3xl shadow-xl">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200/30 px-5 py-4">
        <div>
          <p className="text-sm font-bold text-slate-900">{title}</p>
          <p className="mt-0.5 text-xs text-slate-600">{sub}</p>
        </div>
        {badge}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [claims, setClaims]     = useState<Claim[]>([]);
  const [insights, setInsights] = useState<SyndicateInsights | null>(null);
  const [loading, setLoading]   = useState(true);
  const [clock, setClock]       = useState(() => new Date());
  const [clockReady, setClockReady] = useState(false);

  const clusterAlert = useMemo(() => (insights?.clusters?.length ?? 0) > 0, [insights?.clusters?.length]);

  useEffect(() => {
    setClockReady(true);
    const t = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const consentAccepted = typeof window !== "undefined" && localStorage.getItem("vigil_dpdp_consent") === "accepted";
        const headers = consentAccepted ? { "x-vigil-consent": "accepted" } : undefined;
        const [cRes, iRes] = await Promise.all([
          fetch("/api/claims/recent",      headers ? { headers } : {}),
          fetch("/api/syndicate/insights", headers ? { headers } : {}),
        ]);
        const cData = await cRes.json();
        const iData = await iRes.json();
        setClaims(cData.claims || []);
        setInsights(iData);
      } catch {
        setClaims([]); setInsights(null);
      } finally {
        setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const nowLabel = clock.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const suspFPs = Object.entries(insights?.suspicious_fingerprints ?? {}).filter(([, v]) => v > 1);

  return (
    <>
      <div className={`${spaceGrotesk.className} admin-glow relative min-h-screen bg-white text-white`}>

        {/* ── BACKGROUND IMAGE ── */}
        {/*
          PUT YOUR BACKGROUND IMAGE HERE:
          Replace the backgroundImage URL below with your image:
            backgroundImage: "url('/backdrops/your-image.jpg')"
        */}
        <div
          className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/backdrops/Gemini_Generated_Image_8ysdn78ysdn78ysd.png')",
          }}
        />
        {/* Light overlay scrim */}
        
        

        {/* ── CONTENT ── */}
        <div className="relative z-10 min-h-screen">
          <Header />

          <main className="mx-auto max-w-6xl px-6 py-10 md:py-12">

            {/* ── HEADER HERO ── */}
            <div className="syndicate-hero relative mb-8 overflow-hidden rounded-[20px] border border-white/30 bg-transparent p-6 md:p-8 shadow-2xl">
              {/* Background image */}
              <div
                className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat "
                style={{
                  backgroundImage: "url('/backdrops/ish-consul-mt6YD0kH4Bw-unsplash.jpg')",
                }}
              />
              {/* Gradient overlay - more transparent for deeper glass effect */}
              <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-slate-50/60 via-slate-50/50 to-white/10" />
              {/* Additional glass layer */}
              <div className="pointer-events-none absolute inset-0 z-0 " />

              {/* Top gradient bar */}
              <div className="absolute inset-x-0 top-0 z-20 h-[2px] bg-gradient-to-r from-cyan-600 via-violet-600 to-amber-600" />

              <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] border border-cyan-600/20 bg-cyan-100">
                    <svg className="h-7 w-7 text-cyan-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 5v2M12 17v2M5 12h2M17 12h2M6.34 6.34l1.42 1.42M16.24 16.24l1.42 1.42M6.34 17.66l1.42-1.42M16.24 7.76l1.42-1.42" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-cyan-700">Intelligence console</p>
                    <h1 className="mt-1 font-['Space_Grotesk'] text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                      Syndicate detection
                    </h1>
                    <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-slate-600">
                      Graph-style monitoring: temporal clusters, device fingerprints, and risk signals — refreshed automatically.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 lg:flex-col lg:items-end">
                  {/* Live pill */}
                  <div className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold ${clusterAlert ? "border-amber-600/30 bg-amber-100 text-amber-700" : "border-cyan-600/30 bg-cyan-100 text-cyan-700"}`}>
                    <span className="relative flex h-2 w-2">
                      <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${clusterAlert ? "bg-amber-600" : "bg-emerald-600"}`} />
                      <span className={`relative inline-flex h-2 w-2 rounded-full ${clusterAlert ? "bg-amber-600" : "bg-emerald-600"}`} />
                    </span>
                    Live · panel every 5s
                  </div>

                  {clockReady && (
                    <span className={`${jetBrainsMono.className} text-sm tabular-nums text-slate-500`}>{nowLabel}</span>
                  )}

                  {clusterAlert && (
                    <span className="rounded-full border border-amber-600/30 bg-amber-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">
                      Cluster activity detected
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── LOADING ── */}
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative h-12 w-12">
                    <div className="absolute inset-0 animate-spin rounded-full border-2 border-cyan-500/20 border-t-cyan-400" />
                    <div className="absolute inset-2 animate-spin rounded-full border-2 border-violet-500/20 border-t-violet-400 [animation-direction:reverse] [animation-duration:0.6s]" />
                  </div>
                  <p className="text-sm text-slate-600">Loading insights…</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">

                {/* ── METRIC TILES ── */}
                {insights && (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[
                      {
                        label: "Total Claims (30m)", value: insights.total_claims,
                        color: "text-cyan-300", glow: "rgba(6,182,212,.15)", alert: false,
                      },
                      {
                        label: "Clusters Detected", value: insights.clusters?.length ?? 0,
                        color: insights.clusters?.length ? "text-amber-300" : "text-amber-300",
                        glow: "rgba(245,158,11,.15)",
                        alert: (insights.clusters?.length ?? 0) > 0,
                        alertCls: "border-amber-500/25 bg-amber-500/6",
                        sub: (insights.clusters?.length ?? 0) > 0 ? "⚠ Coordination risk" : "All clear",
                      },
                      {
                        label: "Suspicious FPs",
                        value: Object.keys(insights.suspicious_fingerprints ?? {}).length,
                        color: "text-rose-300", glow: "rgba(244,63,94,.15)",
                        alert: Object.keys(insights.suspicious_fingerprints ?? {}).length > 0,
                        alertCls: "border-rose-500/25 bg-rose-500/6",
                        sub: Object.keys(insights.suspicious_fingerprints ?? {}).length > 0 ? "Shared devices" : "No shared devices",
                      },
                      {
                        label: "SSI Risk",
                        value: `${Math.round((insights.ssi_risk ?? 0) * 100)}%`,
                        color: (insights.ssi_risk ?? 0) > 0.5 ? "text-rose-300" : (insights.ssi_risk ?? 0) > 0.25 ? "text-amber-300" : "text-violet-300",
                        glow: "rgba(139,92,246,.15)",
                        alert: (insights.ssi_risk ?? 0) > 0.5,
                        alertCls: "border-rose-500/25 bg-rose-500/6",
                        sub: (insights.ssi_risk ?? 0) > 0.5 ? "High risk" : (insights.ssi_risk ?? 0) > 0.25 ? "Moderate" : "Low risk",
                      },
                    ].map(({ label, value, color, glow, alert, alertCls, sub }) => (
                      <div
                        key={label}
                        className={`relative overflow-hidden rounded-[16px] border p-5 transition-transform hover:-translate-y-0.5 backdrop-blur-3xl shadow-lg ${alert ? `${alertCls}` : "border-slate-200/30 bg-slate-50/40"}`}
                      >
                        <div className="absolute -right-5 -top-5 h-16 w-16 rounded-full blur-2xl" style={{ background: glow }} />
                        <p className="text-[10px] font-bold uppercase tracking-[.13em] text-white">{label}</p>
                        <p className={`mt-2 font-['JetBrains_Mono',monospace] text-[1.9rem] font-bold leading-none ${color}`}>{value}</p>
                        {sub && <p className="mt-1.5 text-[11px] text-slate-600">{sub}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* ── TEMPORAL CLUSTERS ── */}
                <SectionCard
                  title="Temporal clusters"
                  sub="Claims within 90 seconds — potential syndicate coordination"
                  badge={
                    <SectionBadge
                      label={insights?.clusters?.length ? `${insights.clusters.length} cluster${insights.clusters.length > 1 ? "s" : ""} active` : "0 detected"}
                      variant={insights?.clusters?.length ? "amber" : "cyan"}
                    />
                  }
                >
                  {!insights?.clusters?.length ? (
                    <p className="text-center text-sm text-white">No clusters in this window.</p>
                  ) : (
                    insights.clusters.map((c, i) => (
                      <ClusterItem key={i} index={i} size={c.size} windowSeconds={c.window_seconds} workers={c.workers} />
                    ))
                  )}
                </SectionCard>

                {/* ── STAGGERED TRIGGERS ── */}
                {insights?.staggered_triggers !== undefined && (
                  <SectionCard
                    title="Staggered triggers"
                    sub="Claims ~30 min apart — evading burst detection"
                    badge={
                      <SectionBadge
                        label={insights.staggered_triggers.length ? `${insights.staggered_triggers.length} pattern${insights.staggered_triggers.length > 1 ? "s" : ""}` : "None detected"}
                        variant={insights.staggered_triggers.length ? "amber" : "cyan"}
                      />
                    }
                  >
                    {!insights.staggered_triggers.length ? (
                      <p className="text-center text-sm text-slate-600">No staggered patterns.</p>
                    ) : (
                      insights.staggered_triggers.map((s, i) => (
                        <div key={i} className="mb-2 flex items-start gap-3 rounded-xl border border-white/6 bg-white/[0.03] px-3.5 py-3 last:mb-0">
                          <span className="text-xs font-bold text-amber-300">Spacing: {s.spacing_minutes} min apart · {s.workers.slice(0, 3).join(", ")}</span>
                        </div>
                      ))
                    )}
                  </SectionCard>
                )}

                {/* ── BEHAVIORAL FLAGS ── */}
                {insights?.behavioral_baseline_flags !== undefined && (
                  <SectionCard
                    title="Behavioral baseline flags"
                    sub="Repeated at-home claim patterns over time"
                    badge={
                      <SectionBadge
                        label={insights.behavioral_baseline_flags.length ? `${insights.behavioral_baseline_flags.length} flagged` : "No flags"}
                        variant={insights.behavioral_baseline_flags.length ? "rose" : "cyan"}
                      />
                    }
                  >
                    {!insights.behavioral_baseline_flags.length ? (
                      <p className="text-center text-sm text-slate-600">No behavioral anomalies.</p>
                    ) : (
                      insights.behavioral_baseline_flags.map((b, i) => (
                        <div key={i} className="mb-2 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/12 px-3.5 py-3 last:mb-0">
                          <span className="text-xs font-bold text-rose-300">{b.worker_id} · {b.claim_count} claims · {b.pattern}</span>
                        </div>
                      ))
                    )}
                  </SectionCard>
                )}

                {/* ── SUSPICIOUS FINGERPRINTS ── */}
                {suspFPs.length > 0 && (
                  <SectionCard
                    title="Suspicious device fingerprints"
                    sub="Shared device IDs across multiple claimants"
                    badge={<SectionBadge label={`${suspFPs.length} flagged`} variant="rose" />}
                  >
                    <div className="flex flex-wrap gap-2">
                      {suspFPs.map(([fp, count]) => (
                        <div key={fp} className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/8 px-2.5 py-1.5">
                          <span className="font-['JetBrains_Mono',monospace] text-[11px] text-rose-300">{fp}</span>
                          <span className="rounded bg-rose-500/20 px-1.5 py-px font-['JetBrains_Mono',monospace] text-[10px] font-bold text-rose-200">{count}</span>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                )}

                {/* ── RECENT CLAIMS TABLE ── */}
                <div className="overflow-hidden rounded-[18px] border border-slate-200/30 bg-slate-50/40 backdrop-blur-3xl shadow-xl">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-200/30 px-5 py-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Recent claims feed</p>
                      <p className="mt-0.5 text-xs text-slate-600">Live-refreshed · last 30 minutes</p>
                    </div>
                    <SectionBadge label={`${claims.length} claim${claims.length !== 1 ? "s" : ""}`} variant="cyan" />
                  </div>

                  {claims.length === 0 ? (
                    <p className="p-10 text-center text-sm text-slate-600">No claims yet. File a claim from the worker dashboard.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-200/30 bg-slate-100/40">
                            {["Claim ID", "Worker", "Time", "Trust", "Tier", "Device FP"].map((h) => (
                              <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[.13em] text-slate-700">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {claims.map((c) => (
                            <tr key={c.claim_id} className="border-b border-slate-200/30 transition-colors hover:bg-cyan-50/30">
                              <td className="px-5 py-3.5 font-['JetBrains_Mono',monospace] text-xs text-slate-700">{c.claim_id}</td>
                              <td className="px-5 py-3.5 font-semibold text-slate-900">{c.worker_id}</td>
                              <td className="px-5 py-3.5 font-['JetBrains_Mono',monospace] text-xs text-slate-700">{new Date(c.claimed_at).toLocaleTimeString()}</td>
                              <td className="px-5 py-3.5"><TrustBar score={c.trust_score} /></td>
                              <td className="px-5 py-3.5">
                                <Pill
                                  label={c.tier || "—"}
                                  variant={(c.tier as "instant" | "provisional" | "escrow") || "default"}
                                />
                              </td>
                              <td className="px-5 py-3.5 font-['JetBrains_Mono',monospace] text-xs text-slate-700">{c.device_fp || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}
          </main>
        </div>
      </div>
      <style jsx global>{`
        .admin-glow,
        .admin-glow * {
          color: #ffffff !important;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.55);
        }
        .admin-glow header,
        .admin-glow header * {
          color: #000000 !important;
          text-shadow: none !important;
        }
        .admin-glow .syndicate-hero,
        .admin-glow .syndicate-hero * {
          color: #000000 !important;
          text-shadow: none !important;
        }
      `}</style>
    </>
  );
}