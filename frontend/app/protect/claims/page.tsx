"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";

interface WorkerClaimRecord {
  claim_id: string;
  policy_id?: string;
  initiated_by?: string;
  worker_id: string;
  claimed_at: string;
  trust_score: number;
  tier?: "instant" | "provisional" | "escrow";
  payout_status: string;
  payout_amount_now_sent?: number;
  remaining_amount?: number;
  payout_eta_seconds?: number;
  device_fp?: string;
}

export default function ProtectClaimsPage() {
  const [workerId, setWorkerId] = useState("demo_protect");
  const [claims, setClaims] = useState<WorkerClaimRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const getDpdpHeaders = (): Record<string, string> => {
    const consentAccepted =
      typeof window !== "undefined" &&
      localStorage.getItem("vigil_dpdp_consent") === "accepted";
    return consentAccepted ? { "x-vigil-consent": "accepted" } : {};
  };

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(
        `/api/claims/by-worker/${encodeURIComponent(workerId.trim() || "demo_protect")}`,
        { headers: { ...getDpdpHeaders() } }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          res.status === 403
            ? (data?.detail as string) || "DPDP consent required — accept the banner on any page."
            : (data?.detail as string) || `Failed to load claims (${res.status})`;
        throw new Error(msg);
      }
      setClaims((data?.claims || []) as WorkerClaimRecord[]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load claims";
      setErr(
        msg === "Failed to fetch"
          ? "Backend unavailable. Run npm run dev from the project root."
          : msg
      );
      setClaims([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">

      {/* ════════════════════════════════
          PAGE BACKGROUND IMAGE — swap the URL below for any photo
          Recommended: a dark city / rain / delivery-themed photo
          e.g. "url('/backdrops/your-photo.jpg')"
          Current: Unsplash city lights (dark, atmospheric)
      ════════════════════════════════ */}
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center bg-no-repeat "
        style={{
          backgroundImage:
            "url('/backdrops/kai-pilger-tL92LY152Sk-unsplash.jpg')",
        }}
      />

      {/* Layered dark overlays for depth */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-br from-slate-950/88 via-sky-950/80 to-slate-950/92" />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/30" />

      {/* Ambient glow orbs */}
      <div className="pointer-events-none fixed left-0 top-1/3 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-sky-600/8 blur-[140px]" />
      <div className="pointer-events-none fixed bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-emerald-500/6 blur-[120px]" />
      <div className="pointer-events-none fixed right-0 top-0 h-[300px] w-[300px] rounded-full bg-violet-600/6 blur-[100px]" />

      <div className="relative z-10 min-h-screen">
        <Header />

        <main className="mx-auto max-w-5xl px-6 py-10 md:py-12">

          {/* ── Hero header ── */}
          <div className="mb-8 overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
            {/* Gradient accent strip */}
            <div className="h-1 w-full bg-gradient-to-r from-sky-500 via-violet-500 to-emerald-400" />
            {/* Background Image */}
<div
  className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25"
  style={{
    backgroundImage: "url('/backdrops/Food-delivery-driver-on-motorcycle-delivering-online-food-order.webp')",
  }}
/>

{/* Optional dark overlay for readability */}
<div className="absolute inset-0 bg-black/40" />

            <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
              {/* Left: icon + title */}
              <div className="flex items-start gap-5">
                {/* Animated clock icon */}
                <div className="relative shrink-0">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-500/10 backdrop-blur-sm shadow-lg">
                    <svg className="h-7 w-7 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                      <circle cx="12" cy="12" r="9" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
                    </svg>
                  </div>
                  {/* Pulsing dots */}
                  <div className="mt-2 flex justify-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400"
                        style={{ animationDelay: `${i * 280}ms` }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.6)]">
                      Activity timeline
                    </p>
                  </div>
                  <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white md:text-3xl drop-shadow-[0_0_20px_rgba(255,255,255,0.7)]">
                    Worker claims
                  </h1>
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-white drop-shadow-[0_0_10px_rgba(148,163,184,0.5)]">
                    Every row is an event on the worker&apos;s ledger — manual
                    filings and zero-touch auto-claims in one stream.
                  </p>
                </div>
              </div>

              {/* Right: counter + nav */}
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center md:flex-col md:items-end">
                {/* Live counter pill */}
                <div className="overflow-hidden rounded-2xl border border-sky-500/20 bg-sky-500/10 px-5 py-3 text-center backdrop-blur-sm shadow-lg">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-sky-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.6)]">In view</p>
                  <p className="text-3xl font-bold tabular-nums text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.6)]">
                    {loading ? (
                      <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-sky-500/30 border-t-sky-400" />
                    ) : (
                      claims.length
                    )}
                  </p>
                  <p className="text-xs text-white drop-shadow-[0_0_8px_rgba(148,163,184,0.4)]">claims</p>
                </div>

                <Link
                  href="/protect"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:border-sky-400/30 hover:bg-white/10 hover:text-white"
                >
                  ← Protect worker
                </Link>
              </div>
            </div>
          </div>

          {/* ── Filter card ── */}
          <div className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur-md">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-4 w-0.5 rounded-full bg-sky-400" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-400 drop-shadow-[0_0_10px_rgba(56,189,248,0.6)]">
                Filter by worker
              </p>
            </div>
            <p className="mb-4 text-xs text-white drop-shadow-[0_0_8px_rgba(148,163,184,0.4)]">Fetch the latest claims for a specific worker_id.</p>

            <div className="flex flex-wrap items-end gap-3">
              <div className="w-72">
                <label className="mb-1.5 block text-xs font-semibold text-white drop-shadow-[0_0_8px_rgba(148,163,184,0.4)]">Worker ID</label>
                <input
                  value={workerId}
                  onChange={(e) => setWorkerId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && load()}
                  className="w-full rounded-xl border border-white/10 bg-white/8 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none backdrop-blur-sm transition-all focus:border-sky-500/60 focus:bg-white/10 focus:ring-2 focus:ring-sky-500/20"
                  placeholder="demo_protect"
                />
              </div>
              <button
                onClick={load}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 transition-all hover:from-sky-400 hover:to-cyan-400 disabled:opacity-60"
              >
                {loading && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                Load claims
              </button>
            </div>

            {err && (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 backdrop-blur-sm">
                <span className="mt-0.5 text-red-400">⚠</span>
                <p className="text-sm font-medium text-red-300">{err}</p>
              </div>
            )}
          </div>

          {/* ── Claims timeline card ── */}
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
              <div>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-0.5 rounded-full bg-emerald-400" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]">
                    Claim timeline
                  </p>
                </div>
                <p className="mt-1 text-xs text-white drop-shadow-[0_0_8px_rgba(148,163,184,0.4)]">
                  {loading ? "Loading…" : `${claims.length} claim(s) found`}
                </p>
              </div>
              {/* Live indicator */}
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[10px] font-semibold text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]">Live</span>
              </div>
            </div>

            {/* Loading state */}
            {loading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative h-12 w-12">
                    <div className="absolute inset-0 animate-spin rounded-full border-2 border-sky-500/20 border-t-sky-400" />
                    <div className="absolute inset-2 animate-spin rounded-full border-2 border-emerald-500/20 border-t-emerald-400 [animation-direction:reverse] [animation-duration:0.6s]" />
                  </div>
                  <p className="text-sm font-medium text-white drop-shadow-[0_0_10px_rgba(148,163,184,0.5)]">Fetching claim events…</p>
                </div>
              </div>
            ) : claims.length === 0 ? (
              <div className="flex h-48 flex-col items-center justify-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
                  📭
                </div>
                <p className="text-sm font-medium text-white drop-shadow-[0_0_10px_rgba(148,163,184,0.5)]">No claims yet.</p>
                <p className="text-xs text-white drop-shadow-[0_0_8px_rgba(107,114,128,0.4)]">Create a policy and run disruption triggers.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8 bg-white/3">
                      {["Claim", "Tier", "Trust", "Status", "Time"].map((h) => (
                        <th
                          key={h}
                          className="px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.15em] text-white drop-shadow-[0_0_8px_rgba(148,163,184,0.4)]"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((c, i) => (
                      <tr
                        key={c.claim_id}
                        className="group border-b border-white/5 transition-all duration-200 hover:bg-white/5"
                      >
                        {/* Claim ID + policy */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            {/* Timeline dot */}
                            <div className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                              <div
                                className={`h-2 w-2 rounded-full ${
                                  c.tier === "instant"
                                    ? "bg-emerald-400"
                                    : c.tier === "provisional"
                                    ? "bg-amber-400"
                                    : c.tier === "escrow"
                                    ? "bg-red-400"
                                    : "bg-slate-500"
                                }`}
                              />
                            </div>
                            <div>
                              <div className="font-mono text-xs text-white group-hover:text-white transition-colors drop-shadow-[0_0_8px_rgba(207,250,254,0.4)]">
                                {c.claim_id}
                              </div>
                              {c.policy_id && (
                                <div className="mt-0.5 text-[10px] text-white drop-shadow-[0_0_6px_rgba(107,114,128,0.3)]">
                                  policy: {c.policy_id}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Tier */}
                        <td className="px-5 py-4">
                          <TierPill tier={c.tier} />
                        </td>

                        {/* Trust score */}
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1.5">
                            <span
                              className={`text-sm font-bold tabular-nums drop-shadow-lg ${
                                c.trust_score >= 70
                                  ? "text-emerald-400"
                                  : c.trust_score >= 40
                                  ? "text-amber-400"
                                  : "text-red-400"
                              }`}
                            >
                              {c.trust_score}
                            </span>
                            <div className="h-1 w-16 overflow-hidden rounded-full bg-white/10">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                  c.trust_score >= 70
                                    ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                                    : c.trust_score >= 40
                                    ? "bg-gradient-to-r from-amber-500 to-amber-400"
                                    : "bg-gradient-to-r from-red-500 to-red-400"
                                }`}
                                style={{ width: `${c.trust_score}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Status + payout */}
                        <td className="px-5 py-4">
                          <StatusPill status={c.payout_status} />
                          {typeof c.payout_amount_now_sent === "number" && c.payout_amount_now_sent > 0 && (
                            <div className="mt-1.5 flex items-center gap-1">
                              <span className="text-[10px] text-white drop-shadow-[0_0_6px_rgba(148,163,184,0.3)]">Sent</span>
                              <span className="text-xs font-semibold text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">
                                ₹{c.payout_amount_now_sent}
                              </span>
                            </div>
                          )}
                          {typeof c.remaining_amount === "number" && c.remaining_amount > 0 && (
                            <div className="mt-0.5 flex items-center gap-1">
                              <span className="text-[10px] text-white drop-shadow-[0_0_6px_rgba(148,163,184,0.3)]">Remaining</span>
                              <span className="text-xs font-semibold text-amber-400 drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]">
                                ₹{c.remaining_amount}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Time */}
                        <td className="px-5 py-4 text-xs text-white group-hover:text-white transition-colors drop-shadow-[0_0_8px_rgba(148,163,184,0.4)]">
                          {new Date(c.claimed_at).toLocaleTimeString()}
                          <div className="mt-0.5 text-[10px] text-white drop-shadow-[0_0_6px_rgba(107,114,128,0.3)]">
                            {new Date(c.claimed_at).toLocaleDateString()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Footer spacer note ── */}
                          <p className="mt-6 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-white drop-shadow-[0_0_8px_rgba(107,114,128,0.4)]">
            Behavioral Trust Engine · Claim Ledger
          </p>
        </main>
      </div>
    </div>
  );
}

/* ── Tier pill ── */
function TierPill({ tier }: { tier?: string }) {
  if (!tier) return <span className="text-xs text-white">—</span>;
  const map: Record<string, string> = {
    instant:     "border-emerald-500/30 bg-emerald-500/15 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.15)]",
    provisional: "border-amber-500/30   bg-amber-500/15   text-amber-300   shadow-[0_0_8px_rgba(245,158,11,0.15)]",
    escrow:      "border-red-500/30     bg-red-500/15     text-red-300     shadow-[0_0_8px_rgba(239,68,68,0.15)]",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${map[tier] ?? "border-white/10 bg-white/8 text-white"}`}>
      {tier}
    </span>
  );
}

/* ── Status pill ── */
function StatusPill({ status }: { status: string }) {
  const isSuccess = status?.includes("completed") || status?.includes("approved");
  const isWarn    = status?.includes("escrow") || status?.includes("provisional");
  const isErr     = status?.includes("rejected");
  const cls = isSuccess
    ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
    : isWarn
    ? "border-amber-500/30 bg-amber-500/15 text-amber-300"
    : isErr
    ? "border-red-500/30 bg-red-500/15 text-red-300"
    : "border-white/10 bg-white/8 text-white";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {status || "processing"}
    </span>
  );
}