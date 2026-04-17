"use client";

import Link from "next/link";
import Header from "@/components/Header";
import PageBackdrop from "@/components/PageBackdrop";
import { Card } from "@/components/Card";

const PLANS = [
  {
    name: "Worker Subscription",
    price: "₹29/month",
    alt: "or ₹5/active-day",
    desc: "Affordable for daily-wage earners. Pay only when you're on the road.",
  },
  {
    name: "Platform B2B",
    price: "White-label",
    alt: "API access",
    desc: "Licensed BTE as a fraud-detection API for other insurtech platforms.",
  },
  {
    name: "Liquidity Pool",
    price: "Institutional",
    alt: "Staked capital",
    desc: "Partners (insurers, delivery platforms) stake capital with reinsurance layer for catastrophic weather events.",
  },
];

export default function BusinessPage() {
  return (
    <div className="relative min-h-screen page-shell-light">
      <PageBackdrop variant="ambient" />
      <div className="relative z-10 min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-12">
        <div className="mb-16">
          <p className="text-sm font-semibold text-sky-700">Business model</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            How VIGIL works for everyone
          </h1>
          <p className="mt-4 text-slate-600">
            Sustainable pricing for gig workers, B2B API for insurtech, and
            institutional liquidity for scale.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Card
              key={i}
              variant="default"
              className="flex flex-col p-6 transition-all hover:border-sky-200"
            >
              <p className="text-sm font-semibold text-sky-700">{plan.name}</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{plan.price}</p>
              <p className="text-sm text-slate-500">{plan.alt}</p>
              <p className="mt-4 flex-1 text-sm text-slate-500">{plan.desc}</p>
            </Card>
          ))}
        </div>

        <div className="mt-12 flex gap-3">
          <Link
            href="/claim"
            className="inline-flex items-center justify-center rounded-lg bg-vigil-accent px-5 py-2.5 text-sm font-medium text-slate-950 transition-all hover:bg-vigil-accent/90"
          >
            File a Claim
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-sky-200 hover:bg-sky-50/50"
          >
            ← Home
          </Link>
        </div>
      </main>
      </div>
    </div>
  );
}
