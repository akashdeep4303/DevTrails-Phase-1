"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { Card } from "@/components/Card";

export default function Home() {
  return (
    <div className="min-h-screen gradient-mesh">
      <Header />
      <main className="mx-auto max-w-6xl px-6 pb-28 pt-14 md:pt-20">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/65 shadow-card backdrop-blur-sm">
          <div className="grid min-h-[520px] lg:grid-cols-2">
            <div className="flex items-center border-b border-slate-200/70 p-8 md:p-10 lg:border-b-0 lg:border-r">
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
                  Instant, trigger-based payouts for delivery partners and
                  drivers when weather disrupts work, validated in real time by
                  the Behavioral Trust Engine.
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
              </div>
            </div>
            <div className="relative min-h-[320px] overflow-hidden bg-slate-900">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url('https://unsplash.com/photos/man-wearing-red-hard-hat-hanged-on-brown-rebar-bar-Pj4je7OjrME')",
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950/65 via-sky-950/55 to-slate-900/40" />
              <div className="absolute -right-12 -top-10 h-48 w-48 rounded-full bg-sky-300/15 blur-3xl" />
              <div className="relative flex h-full items-end p-6 md:p-8">
                <div className="relative w-full overflow-hidden rounded-2xl border border-white/20 bg-slate-950/40">
                  <div
                    className="absolute -inset-5 bg-cover bg-no-repeat blur-[3px]"
                    style={{
                      backgroundImage:
                        "url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&q=80&auto=format&fit=crop')",
                      backgroundPosition: "center 35%",
                    }}
                  />
                  <div className="absolute inset-0 bg-slate-950/34" />
                  <div className="absolute inset-0 bg-gradient-to-br from-[#020e24]/72 via-[#042c53]/56 to-sky-900/42" />
                  <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-sky-300/15 blur-2xl" />
                  <div className="relative p-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-sky-300">
                      Live trust signal
                    </p>
                    <p className="mt-4 text-3xl font-bold tabular-nums text-sky-50">
                      94
                      <span className="text-lg font-semibold text-slate-300">
                        /100
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      BTE fusion score (demo)
                    </p>
                    <div className="mt-6 space-y-3 border-t border-white/10 pt-6">
                      {["IMU & motion", "Network reality", "Order context"].map(
                        (label) => (
                          <div
                            key={label}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-slate-200">{label}</span>
                            <span className="font-semibold text-emerald-300">
                              Verified
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 grid gap-5 sm:grid-cols-3">
          <StatCard label="Claims validated in pilot" value="12,480+" />
          <StatCard label="Avg payout latency" value="43 sec" />
          <StatCard label="False-claim reduction" value="68%" />
        </section>

        <section className="mt-24 md:mt-32">
          <div className="mb-2 flex items-end justify-between gap-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-sky-800/80">
              Core capabilities
            </h2>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <FeatureCard
              title="9-signal fusion"
              description="IMU, cell, Wi‑Fi, battery — GPS alone is never enough. Multi-signal trust scoring."
              icon="⊕"
            />
            <FeatureCard
              title="Syndicate breaker"
              description="Temporal clustering and device graphs catch coordinated abuse before it scales."
              icon="◉"
            />
            <FeatureCard
              title="Fair by design"
              description="Instant, provisional, or escrow tiers — honest workers are not punished for noise."
              icon="◇"
            />
          </div>
        </section>

        <section className="mt-24 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="p-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
              Why teams choose VIGIL
            </p>
            <h3 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
              Built to scale trust, not paperwork
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600">
              Traditional verification stacks slow down payouts and frustrate real
              workers. VIGIL combines risk detection with transparent decisioning
              so insurers can move fast without increasing fraud exposure.
            </p>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <MiniPill text="Risk-tiered instant payouts" />
              <MiniPill text="Behavioral confidence scoring" />
              <MiniPill text="Weather + mobility trigger fusion" />
              <MiniPill text="Explainable review workflows" />
            </div>
          </Card>

          <Card variant="neo" className="relative overflow-hidden p-8">
            <div className="absolute -right-6 -top-8 h-40 w-40 rounded-full bg-sky-100/80 blur-2xl" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
              Deployment readiness
            </p>
            <ul className="relative mt-5 space-y-4 text-sm text-slate-700">
              {[
                "API-first architecture for insurer integrations",
                "Audit-friendly trust events for compliance",
                "Low-latency decision hooks for real-time claims",
                "Plug-and-play UX for workers and ops teams",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-0.5 text-sky-600">●</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/business"
              className="relative mt-7 inline-flex items-center rounded-xl border border-sky-200 bg-white/90 px-4 py-2 text-sm font-semibold text-sky-800 transition-colors hover:bg-sky-50"
            >
              Explore business impact
            </Link>
          </Card>
        </section>
      </main>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <Card
      variant="default"
      className="group p-7 transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-card-hover"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-sky-50 text-xl text-sky-700 ring-1 ring-sky-100/80">
        {icon}
      </div>
      <h3 className="mt-5 text-lg font-bold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
    </Card>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </Card>
  );
}

function MiniPill({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm">
      {text}
    </div>
  );
}
