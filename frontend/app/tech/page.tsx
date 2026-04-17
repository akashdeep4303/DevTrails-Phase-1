"use client";

import Link from "next/link";
import Header from "@/components/Header";
import PageBackdrop from "@/components/PageBackdrop";
import { Card } from "@/components/Card";

const STACK = [
  {
    layer: "Mobile SDK",
    tech: "React Native",
    note: "Android-first for gig workers",
  },
  {
    layer: "Signal Collection",
    tech: "Native IMU/Network APIs",
    note: "Background service for passive collection",
  },
  {
    layer: "BTE Model",
    tech: "XGBoost + LSTM",
    note: "Retrained weekly on new fraud patterns",
  },
  {
    layer: "Graph DB (Syndicate Detection)",
    tech: "Neo4j / Amazon Neptune",
    note: "Device fingerprint graph, temporal clustering",
  },
  {
    layer: "Weather Oracle",
    tech: "IMD API + OpenWeatherMap + Windy",
    note: "Local IoT mesh; multi-source aggregation",
  },
  {
    layer: "Backend",
    tech: "FastAPI (ML inference)",
    note: "Node.js optional for high-throughput APIs",
  },
  {
    layer: "Smart Contract / Payout",
    tech: "Razorpay Instant Payout API",
    note: "UPI micro-transfers",
  },
  {
    layer: "Privacy & Compliance",
    tech: "DPDP Act 2023",
    note: "Data minimization by design",
  },
];

export default function TechPage() {
  return (
    <div className="relative min-h-screen page-shell-light">
      <PageBackdrop variant="circuit" />
      <div className="relative z-10 min-h-screen">
      <Header />
      <main className="mx-auto max-w-4xl px-6 pb-24 pt-12">
        <div className="mb-16">
          <p className="text-sm font-semibold text-sky-700">Technology</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Tech stack
          </h1>
          <p className="mt-4 text-slate-600">
            Infrastructure powering the Behavioral Trust Engine and fraud
            detection.
          </p>
        </div>

        <div className="space-y-4">
          {STACK.map((item, i) => (
            <Card key={i} variant="default" className="p-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    {item.layer}
                  </p>
                  <p className="mt-1 font-semibold text-slate-900">{item.tech}</p>
                </div>
                <p className="text-sm text-slate-500 sm:text-right">
                  {item.note}
                </p>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-12 flex gap-3">
          <Link
            href="/approach"
            className="inline-flex items-center justify-center rounded-lg bg-vigil-accent px-5 py-2.5 text-sm font-medium text-slate-950 transition-all hover:bg-vigil-accent/90"
          >
            How It Works
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
