const CONSENT_KEY = "vigil_dpdp_consent";

export function getDpdpHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const accepted = localStorage.getItem(CONSENT_KEY) === "accepted";
  return accepted ? { "x-vigil-consent": "accepted" } : {};
}

