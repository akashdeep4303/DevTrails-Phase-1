"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { Card } from "@/components/Card";

export default function Home() {
  return (
    <div className="relative min-h-screen gradient-mesh">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat "
        style={{
          backgroundImage: "url('/backdrops/rowan-freeman-clYlmCaQbzY-unsplash.jpg')",
          backgroundAttachment: "fixed",
        }}
      />
      <Header />
      <main className="relative z-10 mx-auto max-w-6xl px-6 pb-28 pt-14 md:pt-20">

        {/* ── Hero section ── */}
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/75 p-8 shadow-card backdrop-blur-sm md:p-10">
          <div className="absolute -right-12 -top-12 h-52 w-52 rounded-full bg-sky-200/35 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-indigo-100/30 blur-3xl" />

          <div>
            <p className="inline-flex items-center rounded-full border border-sky-200/80 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-sky-700 shadow-sm">
              Parametric micro-insurance · Gig economy
            </p>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              Verified intelligence for{" "}
              <span className="bg-gradient-to-r from-sky-600 to-sky-500 bg-clip-text text-transparent">
                gig insurance
              </span>{" "}
              legitimacy
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              Instant, trigger-based payouts for delivery partners and drivers
              when weather disrupts work — validated in real time by the
              Behavioral Trust Engine.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/claim"
                className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-sky-600/25 transition-all hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
              >
                File a claim
              </Link>
              <Link
                href="/protect"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-7 py-3.5 text-base font-semibold text-slate-800 shadow-sm transition-all hover:border-sky-200 hover:bg-sky-50/50"
              >
                Protect your worker
              </Link>
            </div>

            {/* ── Stat cards ── */}
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Claims validated" value="12,480+" accent="sky" />
              <StatCard label="Avg payout latency" value="43 sec" accent="emerald" />
              <StatCard label="Fraud prevention gain" value="68%" accent="violet" />
              <StatCard label="Partners onboarded" value="24" accent="amber" />
            </div>

            {/* ── BTE trust signal ── */}
            <div className="mt-8 overflow-hidden rounded-2xl shadow-2xl">
              <div className="relative">
                {/* Photo background */}
                <div
                  className="absolute inset-0 scale-105 bg-cover bg-center"
                  style={{
                    backgroundImage:
                      "url('/backdrops/umit-yildirim-Ass0DusYDk4-unsplash.jpg')",
                  }}
                />
                {/* Rich dark overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/92 via-sky-950/88 to-slate-900/95" />
                {/* Accent glows */}
                <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-sky-500/20 blur-3xl" />
                <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-emerald-500/15 blur-3xl" />

                <div className="relative p-7">
                  {/* Top row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_2px_rgba(52,211,153,0.6)]" />
                      </span>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">
                        Live trust signal
                      </p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-slate-400 backdrop-blur-sm">
                      Updated just now
                    </span>
                  </div>

                  {/* Score + arc gauge */}
                  <div className="mt-5 flex items-center gap-6">
                    <div className="relative flex-shrink-0">
                      <svg width="88" height="88" viewBox="0 0 88 88">
                        <circle cx="44" cy="44" r="36" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
                        <circle
                          cx="44" cy="44" r="36"
                          fill="none"
                          stroke="url(#scoreGrad)"
                          strokeWidth="7"
                          strokeLinecap="round"
                          strokeDasharray="226.2"
                          strokeDashoffset="13.6"
                          transform="rotate(-90 44 44)"
                        />
                        <defs>
                          <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="100%" stopColor="#34d399" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold tabular-nums leading-none text-white">94</span>
                        <span className="text-[10px] font-medium text-slate-400">/100</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-3xl font-bold text-white">Excellent</p>
                      <p className="mt-1 text-sm text-slate-400">BTE fusion score (demo)</p>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-1.5 w-36 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"
                            style={{ width: "94%" }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-emerald-400">94%</span>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="mt-6 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                  {/* Signal tiles */}
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {[
                      { label: "IMU & motion", icon: "📡", score: 97 },
                      { label: "Network reality", icon: "🌐", score: 91 },
                      { label: "Order context", icon: "📦", score: 95 },
                    ].map(({ label, icon, score }) => (
                      <div
                        key={label}
                        className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm transition-all duration-300 hover:border-emerald-400/30 hover:bg-white/10"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-lg">{icon}</span>
                          <span className="text-xs font-bold text-emerald-400">{score}</span>
                        </div>
                        <p className="mt-2 text-xs font-medium text-slate-300">{label}</p>
                        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400"
                            style={{ width: `${score}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                          Verified ✓
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3 overview cards ── */}
        <section className="mt-10 grid gap-6 md:grid-cols-3">
          <OverviewCard
            tag="Payout model"
            description="Dynamic trigger bands support instant, provisional, and escrow payouts based on confidence and field conditions."
            gradient="from-sky-500 to-cyan-400"
            icon="⚡"
          />
          <OverviewCard
            tag="Operations view"
            description="Real-time dashboards surface high-risk clusters early so teams can intervene before abuse patterns scale."
            gradient="from-sky-500 to-cyan-400"
            icon="◉"
          />
          <OverviewCard
            tag="Worker trust"
            description="Honest workers receive faster approvals through explainable score decisions and minimal friction journeys."
            gradient="from-sky-500 to-cyan-400"
            icon="◇"
          />
        </section>

        {/* ── Core capabilities ── */}
        <section className="mt-24 md:mt-32">
          <div className="mb-2 flex items-end justify-between gap-4">
            {/* Fixed: white text with glow so it stands out on any background */}
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white">
              Core capabilities
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-white/40 to-transparent" />
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <FeatureCard
              title="9-signal fusion"
              description="IMU, cell, Wi‑Fi, battery — GPS alone is never enough. Multi-signal trust scoring."
              icon="⊕"
              index={0}
            />
            <FeatureCard
              title="Syndicate breaker"
              description="Temporal clustering and device graphs catch coordinated abuse before it scales."
              icon="◉"
              index={1}
            />
            <FeatureCard
              title="Fair by design"
              description="Instant, provisional, or escrow tiers — honest workers are not punished for noise."
              icon="◇"
              index={2}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

/* ── StatCard ── */
const accentMap = {
  sky:     { bg: "from-sky-50 to-white",     border: "border-sky-200/60",    text: "text-sky-600",    badge: "bg-sky-100 text-sky-700" },
  emerald: { bg: "from-emerald-50 to-white", border: "border-emerald-200/60",text: "text-emerald-600",badge: "bg-emerald-100 text-emerald-700" },
  violet:  { bg: "from-violet-50 to-white",  border: "border-violet-200/60", text: "text-violet-600", badge: "bg-violet-100 text-violet-700" },
  amber:   { bg: "from-amber-50 to-white",   border: "border-amber-200/60",  text: "text-amber-600",  badge: "bg-amber-100 text-amber-700" },
} as const;

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: keyof typeof accentMap;
}) {
  const a = accentMap[accent];
  return (
    <div className={`group relative overflow-hidden rounded-2xl border ${a.border} bg-gradient-to-br ${a.bg} p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md`}>
      <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className={`mt-1 text-xs font-semibold uppercase tracking-wide ${a.text}`}>
        {label}
      </p>
      {/* Bottom accent bar */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${a.bg.replace("from-", "from-").replace("to-white", "to-transparent")} opacity-60`} />
    </div>
  );
}

/* ── OverviewCard ── */
function OverviewCard({
  tag,
  description,
  gradient,
  icon,
}: {
  tag: string;
  description: string;
  gradient: string;
  icon: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      {/* Coloured top strip */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${gradient}`} />
      <div className="p-6">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-lg text-white shadow-sm`}>
          {icon}
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-sky-700">{tag}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
      </div>
      {/* Hover glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-[0.04]`} />
    </div>
  );
}

/* ── FeatureCard ── */
const featureAccents = [
  { border: "hover:border-sky-300",    glow: "group-hover:from-sky-500/10",    icon: "from-sky-100 to-sky-50 text-sky-700 ring-sky-100/80" },
  { border: "hover:border-violet-300", glow: "group-hover:from-violet-500/10", icon: "from-violet-100 to-violet-50 text-violet-700 ring-violet-100/80" },
  { border: "hover:border-emerald-300",glow: "group-hover:from-emerald-500/10",icon: "from-emerald-100 to-emerald-50 text-emerald-700 ring-emerald-100/80" },
];

function FeatureCard({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: string;
  index: number;
}) {
  const a = featureAccents[index % featureAccents.length];
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 p-7 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 ${a.border} hover:shadow-xl`}
    >
      {/* Corner glow */}
      <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${a.glow} to-transparent opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100`} />

      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${a.icon} text-xl ring-1 transition-transform duration-300 group-hover:scale-110`}>
        {icon}
      </div>
      <h3 className="mt-5 text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>

      {/* Bottom tag */}
      <div className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-slate-400 transition-colors duration-300 group-hover:text-sky-500">
        <span>Learn more</span>
        <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
      </div>
    </div>
  );
}