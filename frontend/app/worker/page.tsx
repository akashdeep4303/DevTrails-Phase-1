"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { getDpdpHeaders } from "@/lib/consent";

type Worker = {
  worker_id: string;
  name: string;
  upi_handle: string;
  lat: number;
  lon: number;
  auto_claim_opt_in: boolean;
  behavior_profile: string;
  zone_id: string;
  city: string;
  city_tier: string;
  registered_at: string;
};

type Policy = {
  policy_id: string;
  coverage_hours_per_day: number;
  weekly_premium_inr: number;
  auto_claim_opt_in: boolean;
  active: boolean;
  valid_from: string;
  valid_to: string;
};

type Claim = {
  claim_id: string;
  claimed_at: string;
  trust_score: number;
  tier?: "instant" | "provisional" | "escrow";
  payout_status?: string;
  payout_amount_now_sent?: number;
  remaining_amount?: number;
  payout_eta_seconds?: number;
};

type WorkerAnalytics = {
  worker: Worker;
  active_policy: Policy | null;
  claims_recent: Claim[];
  week: { start: string; end: string; claims_count: number; payouts_received_inr: number };
  lifetime: { claims_count: number; payouts_received_inr: number };
};

export default function WorkerDashboardPage() {
  const [workerId, setWorkerId] = useState("demo_protect");
  const [data, setData] = useState<WorkerAnalytics | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const headers = getDpdpHeaders();
      const [aRes, cRes] = await Promise.all([
        fetch(`/api/analytics/worker/${encodeURIComponent(workerId.trim() || "demo_protect")}`, { headers }),
        fetch(`/api/claims/by-worker/${encodeURIComponent(workerId.trim() || "demo_protect")}?limit=30`, { headers }),
      ]);
      const aData = await aRes.json().catch(() => ({}));
      const cData = await cRes.json().catch(() => ({}));
      if (!aRes.ok) throw new Error((aData as { detail?: string }).detail || `Failed (${aRes.status})`);
      if (!cRes.ok) throw new Error((cData as { detail?: string }).detail || `Failed (${cRes.status})`);
      setData(aData as WorkerAnalytics);
      setClaims(((cData as { claims?: Claim[] }).claims || []) as Claim[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load dashboard");
      setData(null);
      setClaims([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const coverageLabel = useMemo(() => {
    const p = data?.active_policy;
    if (!p) return "No active policy";
    return `${p.coverage_hours_per_day}h/day · ₹${p.weekly_premium_inr}/wk`;
  }, [data?.active_policy]);

  return (
    <div className="relative min-h-screen">

      {/* ── BACKGROUND — fully visible, no blur, no heavy overlay ── */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/backdrops/mak-8wy9mGgmGoU-unsplash.jpg')" }}
      />
      {/*
        Only a very thin dark scrim so white text stays legible.
        opacity-40 = background is clearly visible, text is still readable.
        Swap to opacity-30 if you want even more of the photo to show through.
      */}
      <div className="fixed inset-0 z-0 bg-black/40" />

      {/* ── Page content ── */}
      <div className="relative z-10 min-h-screen">
        <Header />

        <main className="mx-auto max-w-6xl px-6 py-10 md:py-12">

          {/* ── HERO BANNER ── */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl">
            <div className="h-1 w-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400" />
            <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
              {/* Background Image */}
<div
  className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25"
  style={{
    backgroundImage: "url('/backdrops/Food-delivery-driver-on-motorcycle-delivering-online-food-order.webp')",
  }}
/>

{/* Optional dark overlay for readability */}
<div className="pointer-events-none absolute inset-0 bg-black/40" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.6)]">
                    Worker dashboard
                  </p>
                </div>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]">
                  Earnings protection
                </h1>
                <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-300 drop-shadow-[0_0_10px_rgba(203,213,225,0.5)]">
                  View active weekly coverage, protected payouts, and claim outcomes.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/protect"
                  className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-all hover:border-sky-400/50 hover:bg-white/20 hover:text-white drop-shadow-[0_0_8px_rgba(203,213,225,0.4)]"
                >
                  Manage policy →
                </Link>
                <button
                  onClick={load}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:bg-sky-400 disabled:opacity-60 drop-shadow-[0_0_12px_rgba(56,189,248,0.7)]"
                >
                  {loading
                    ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-white" />
                    : "↺"}
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* ── WORKER ID SELECTOR ── */}
          <div className="mb-6 rounded-2xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-sky-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.6)]">Select worker</p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-72">
                <label className="mb-1.5 block text-xs font-semibold text-slate-300 drop-shadow-[0_0_8px_rgba(203,213,225,0.4)]">Worker ID</label>
                <input
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder-slate-400 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-500/20"
                  placeholder="demo_protect"
                />
              </div>
              <button
                onClick={load}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition hover:from-sky-400 hover:to-cyan-400 disabled:opacity-60"
              >
                {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
                Load dashboard
              </button>
            </div>
            {err && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/15 px-4 py-3">
                <span className="text-red-400">⚠</span>
                <p className="text-sm font-medium text-red-300 drop-shadow-[0_0_8px_rgba(252,165,165,0.4)]">{err}</p>
              </div>
            )}
          </div>

          {/* ── LOADING ── */}
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <div className="relative h-12 w-12">
                  <div className="absolute inset-0 animate-spin rounded-full border-2 border-sky-500/20 border-t-sky-400" />
                  <div className="absolute inset-2 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-400 [animation-direction:reverse] [animation-duration:0.6s]" />
                </div>
                <p className="text-sm font-medium text-slate-300 drop-shadow-[0_0_10px_rgba(203,213,225,0.5)]">Loading dashboard…</p>
              </div>
            </div>
          ) : data ? (
            <>
              {/* ── STAT TILES ── */}
              <div className="grid gap-4 md:grid-cols-4">
                <StatTile label="Coverage"        value={coverageLabel}                       sub={`Policy: ${data.active_policy?.policy_id || "—"}`} icon="🛡️" color="sky" />
                <StatTile label="Payouts (7 days)" value={`₹${data.week.payouts_received_inr}`} sub={`${data.week.claims_count} claim(s)`}               icon="⚡" color="emerald" large />
                <StatTile label="Lifetime payouts" value={`₹${data.lifetime.payouts_received_inr}`} sub={`${data.lifetime.claims_count} claim(s)`}        icon="◉" color="violet" large />

                {/* Worker card */}
                <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-5 shadow-xl backdrop-blur-xl">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 drop-shadow-[0_0_8px_rgba(148,163,184,0.4)]">Worker</p>
                  <p className="mt-2 text-base font-bold text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]">{data.worker.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400 drop-shadow-[0_0_8px_rgba(148,163,184,0.4)]">{data.worker.upi_handle}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-200 drop-shadow-[0_0_8px_rgba(203,213,225,0.4)]">{data.worker.city}</span>
                    <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-200 drop-shadow-[0_0_8px_rgba(203,213,225,0.4)]">tier {data.worker.city_tier}</span>
                    {data.worker.auto_claim_opt_in
                      ? <span className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">auto-claims on</span>
                      : <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-400">auto-claims off</span>
                    }
                  </div>
                </div>
              </div>

              {/* ── CLAIM TIMELINE ── */}
              <div className="mt-6 overflow-hidden rounded-2xl border border-white/20 bg-white/10 shadow-2xl backdrop-blur-xl">
                <div className="border-b border-white/10 px-6 py-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-sky-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.6)]">Claim timeline</p>
                  <p className="mt-0.5 text-sm text-slate-400 drop-shadow-[0_0_8px_rgba(148,163,184,0.4)]">Latest claim statuses and payout progress.</p>
                </div>

                {claims.length === 0 ? (
                  <div className="flex h-32 items-center justify-center">
                    <p className="text-sm text-slate-400 drop-shadow-[0_0_8px_rgba(148,163,184,0.4)]">No claims yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                          {["Claim", "Trust", "Tier", "Status", "Payout", "Time"].map((h) => (
                            <th key={h} className="px-5 py-3.5 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 drop-shadow-[0_0_8px_rgba(148,163,184,0.4)]">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {claims.slice(0, 20).map((c) => (
                          <tr key={c.claim_id} className="border-b border-white/5 transition-colors hover:bg-white/5">
                            <td className="px-5 py-3.5">
                              <span className="font-mono text-xs text-slate-400 drop-shadow-[0_0_8px_rgba(148,163,184,0.4)]">{c.claim_id}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold tabular-nums ${c.trust_score >= 70 ? "text-emerald-400" : c.trust_score >= 40 ? "text-amber-400" : "text-red-400"}`}>
                                  {c.trust_score}
                                </span>
                                <div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/10">
                                  <div
                                    className={`h-full rounded-full ${c.trust_score >= 70 ? "bg-emerald-400" : c.trust_score >= 40 ? "bg-amber-400" : "bg-red-400"}`}
                                    style={{ width: `${c.trust_score}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5"><TierBadge tier={c.tier} /></td>
                            <td className="px-5 py-3.5"><StatusBadge status={c.payout_status} /></td>
                            <td className="px-5 py-3.5">
                              <span className="font-semibold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]">₹{c.payout_amount_now_sent ?? 0}</span>
                              {typeof c.remaining_amount === "number" && c.remaining_amount > 0 && (
                                <span className="ml-1 text-xs text-slate-400 drop-shadow-[0_0_8px_rgba(148,163,184,0.4)]">+₹{c.remaining_amount} later</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-xs text-slate-400 drop-shadow-[0_0_8px_rgba(148,163,184,0.4)]">{new Date(c.claimed_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}

/* ── StatTile ── */
const colorMap = {
  sky:     { border: "border-sky-400/30",     bg: "bg-sky-500/20",     text: "text-sky-400",     icon: "bg-sky-500/20"     },
  emerald: { border: "border-emerald-400/30", bg: "bg-emerald-500/20", text: "text-emerald-400", icon: "bg-emerald-500/20" },
  violet:  { border: "border-violet-400/30",  bg: "bg-violet-500/20",  text: "text-violet-400",  icon: "bg-violet-500/20"  },
} as const;

function StatTile({ label, value, sub, icon, color, large }: {
  label: string; value: string; sub: string; icon: string;
  color: keyof typeof colorMap; large?: boolean;
}) {
  const c = colorMap[color];
  return (
    <div className={`relative overflow-hidden rounded-2xl border ${c.border} bg-white/10 p-5 shadow-xl transition-all hover:-translate-y-0.5 backdrop-blur-xl`}>
      <div className={`absolute -right-4 -top-4 h-16 w-16 rounded-full ${c.bg} blur-xl`} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className={`text-[10px] font-bold uppercase tracking-[0.15em] ${c.text}`}>{label}</p>
          <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-sm ${c.icon}`}>{icon}</span>
        </div>
        <p className={`mt-2 ${large ? "text-2xl font-bold tabular-nums" : "text-sm font-semibold"} text-white`}>{value}</p>
        <p className="mt-1 text-xs text-slate-400">{sub}</p>
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier?: string }) {
  if (!tier) return <span className="text-xs text-slate-500 drop-shadow-[0_0_8px_rgba(148,163,184,0.4)]">—</span>;
  const styles: Record<string, string> = {
    instant:     "border-emerald-500/40 bg-emerald-500/20 text-emerald-300",
    provisional: "border-amber-500/40 bg-amber-500/20 text-amber-300",
    escrow:      "border-red-500/40 bg-red-500/20 text-red-300",
  };
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${styles[tier] ?? "border-white/15 bg-white/10 text-slate-300"}`}>
      {tier}
    </span>
  );
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 drop-shadow-[0_0_8px_rgba(148,163,184,0.4)]">processing</span>;
  const isSuccess = status.includes("completed") || status.includes("approved");
  const isWarn    = status.includes("escrow") || status.includes("provisional");
  const isErr     = status.includes("rejected");
  const cls = isSuccess ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
            : isWarn    ? "border-amber-500/40 bg-amber-500/20 text-amber-300"
            : isErr     ? "border-red-500/40 bg-red-500/20 text-red-300"
            :             "border-white/15 bg-white/10 text-slate-300";
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {status}
    </span>
  );
}