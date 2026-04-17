"""
Phase 3-ish — Analytics endpoints

- Worker dashboard metrics: active weekly coverage + payouts received
- Insurer/admin metrics: loss ratio, payout totals, forecast-style risk outlook
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any
from collections import defaultdict

from fastapi import APIRouter, HTTPException, Request

from routers.deps import require_dpdp_consent
from services.mock_disruption_data import mock_weather_forecast, mock_waterlogging, mock_roadclosure, mock_order_impact
from services.premium_ml import heuristic_risk_score

router = APIRouter()


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _sum_payout(rec: dict) -> int:
    return int(rec.get("payout_amount_now_sent", 0) or 0) + int(rec.get("payout_amount_remaining_sent", 0) or 0) + int(rec.get("payout_amount_final_sent", 0) or 0)


@router.get("/worker/{worker_id}")
def worker_analytics(worker_id: str, request: Request) -> dict[str, Any]:
    require_dpdp_consent(request)
    wid = (worker_id or "").strip()
    if not wid:
        raise HTTPException(status_code=422, detail="worker_id is required")

    workers: list[dict] = getattr(request.app.state, "worker_store", [])
    policies: list[dict] = getattr(request.app.state, "policy_store", [])
    claims: list[dict] = getattr(request.app.state, "claim_store", [])

    worker = next((w for w in workers if w.get("worker_id") == wid), None)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    active_policies = [p for p in policies if p.get("worker_id") == wid and p.get("active", True)]
    active_policies = sorted(active_policies, key=lambda x: str(x.get("created_at", "")), reverse=True)
    active_policy = active_policies[0] if active_policies else None

    now = datetime.utcnow()
    week_cutoff = now - timedelta(days=7)
    worker_claims = [c for c in claims if c.get("worker_id") == wid]
    worker_claims_sorted = sorted(worker_claims, key=lambda x: str(x.get("claimed_at", "")), reverse=True)
    week_claims = []
    for c in worker_claims_sorted:
        try:
            ts = datetime.fromisoformat(str(c.get("claimed_at", "")))
        except Exception:
            ts = None
        if ts and ts >= week_cutoff:
            week_claims.append(c)

    payouts_week = sum(_sum_payout(c) for c in week_claims)
    payouts_all = sum(_sum_payout(c) for c in worker_claims)

    return {
        "worker": worker,
        "active_policy": active_policy,
        "claims_recent": worker_claims_sorted[:20],
        "week": {
            "start": _iso(week_cutoff),
            "end": _iso(now),
            "claims_count": len(week_claims),
            "payouts_received_inr": payouts_week,
        },
        "lifetime": {
            "claims_count": len(worker_claims),
            "payouts_received_inr": payouts_all,
        },
    }


@router.get("/insurer")
def insurer_analytics(request: Request, window_days: int = 30) -> dict[str, Any]:
    require_dpdp_consent(request)
    claims: list[dict] = getattr(request.app.state, "claim_store", [])
    policies: list[dict] = getattr(request.app.state, "policy_store", [])
    monitor_stats: dict = getattr(request.app.state, "monitoring_stats", {}) or {}

    now = datetime.utcnow()
    cutoff = now - timedelta(days=int(window_days))

    recent_claims = []
    for c in claims:
        try:
            ts = datetime.fromisoformat(str(c.get("claimed_at", "")))
        except Exception:
            continue
        if ts >= cutoff:
            recent_claims.append(c)

    payouts_recent = sum(_sum_payout(c) for c in recent_claims)
    payouts_all = sum(_sum_payout(c) for c in claims)

    # Demo assumption: one week's premium collected for each active policy in window.
    active_policies = [p for p in policies if p.get("active", True)]
    premiums_weekly_total = sum(int(p.get("weekly_premium_inr", 0) or 0) for p in active_policies)
    # Scale weekly to the selected window.
    weeks = max(1.0, float(window_days) / 7.0)
    premiums_window = int(round(premiums_weekly_total * weeks))

    loss_ratio = float(payouts_recent) / float(premiums_window) if premiums_window > 0 else 0.0

    # Forecast-ish outlook: compute heuristic risk scores for active workers/policies using the same mock drivers.
    outlook = []
    zone_risk_buckets: dict[str, dict[str, float]] = defaultdict(lambda: {"policies": 0, "avg_risk": 0.0})
    for p in active_policies[:200]:
        wid = str(p.get("worker_id", "") or "")
        lat = float(p.get("lat", 0.0) or 0.0)
        lon = float(p.get("lon", 0.0) or 0.0)
        if not wid:
            continue

        fc = mock_weather_forecast(lat, lon)
        water = mock_waterlogging(lat, lon)
        road = mock_roadclosure(lat, lon)
        order = mock_order_impact(wid, lat, lon)

        risk = heuristic_risk_score(
            water_logging_risk=water.water_logging_risk,
            predicted_rain_prob=fc.predicted_rain_prob,
            road_closure_prob=road.road_closure_prob,
            income_loss_prob=order.income_loss_prob,
            coverage_hours_per_day_pref=int(p.get("coverage_hours_per_day", 3) or 3),
            safe_zone=bool(water.safe_zone),
        )

        outlook.append(
            {
                "worker_id": wid,
                "policy_id": p.get("policy_id"),
                "risk_score": round(float(risk), 3),
                "predicted_rain_prob": round(float(fc.predicted_rain_prob), 3),
                "predicted_severity": fc.predicted_severity,
                "water_logging_risk": round(float(water.water_logging_risk), 3),
                "road_closure_prob": round(float(road.road_closure_prob), 3),
                "income_loss_prob": round(float(order.income_loss_prob), 3),
                "safe_zone": bool(water.safe_zone),
                "zone_meso": p.get("zone_meso"),
            }
        )

        zone_key = str(p.get("zone_meso", p.get("zone_id", "unknown")))
        b = zone_risk_buckets[zone_key]
        b["policies"] += 1
        b["avg_risk"] += float(risk)

    outlook_sorted = sorted(outlook, key=lambda x: float(x.get("risk_score", 0.0)), reverse=True)
    zone_hotspots = []
    for zone, v in zone_risk_buckets.items():
        c = int(v["policies"])
        avg = float(v["avg_risk"]) / max(1, c)
        zone_hotspots.append({"zone": zone, "policies": c, "avg_risk_score": round(avg, 3)})
    zone_hotspots = sorted(zone_hotspots, key=lambda x: (x["avg_risk_score"], x["policies"]), reverse=True)

    return {
        "window": {"days": int(window_days), "start": _iso(cutoff), "end": _iso(now)},
        "policies": {
            "active_count": len(active_policies),
            "estimated_premiums_collected_inr": premiums_window,
            "estimated_weekly_premiums_inr": premiums_weekly_total,
        },
        "claims": {
            "count": len(recent_claims),
            "payouts_inr": payouts_recent,
            "loss_ratio": round(loss_ratio, 3),
            "lifetime_payouts_inr": payouts_all,
        },
        "forecast_outlook": {
            "top_risky_workers": outlook_sorted[:10],
            "zone_hotspots": zone_hotspots[:10],
        },
        "monitoring": monitor_stats,
        "notes": {
            "premium_accounting": "Demo: assumes 1 week premium per active policy, scaled to window_days.",
        },
    }

