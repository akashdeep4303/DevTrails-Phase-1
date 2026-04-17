"use client";

import { useState, useEffect } from "react";

const CONSENT_KEY = "vigil_dpdp_consent";

export default function DPDPBanner() {
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    setDismissed(localStorage.getItem(CONSENT_KEY) === "accepted");
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-sky-200/80 bg-white/95 px-6 py-4 shadow-[0_-8px_30px_-10px_rgba(14,165,233,0.2)] backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-slate-600">
          VIGIL collects device signals (IMU, network, battery) for fraud
          detection. By continuing, you agree to our data practices under{" "}
          <strong className="font-semibold text-slate-900">DPDP Act 2023</strong>.
          We minimize data collection.
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={accept}
            className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-600/20 transition-colors hover:bg-sky-700"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
