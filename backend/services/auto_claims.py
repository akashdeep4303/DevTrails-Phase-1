"""
Phase 2 — Zero-touch claim submission

Triggers call this to automatically submit a claim using:
  - worker/policy coordinates
  - Weather Oracle verification
  - Behavioral Trust Engine (BTE) on synthetic/last-known signals (demo)
  - Payout Engine for instant/provisional/escrow flows
"""

from __future__ import annotations

from datetime import datetime
import os
from typing import Any

from services.bte import SignalBundle, compute_trust_score
from services.orders_oracle import get_order_context
from services.weather_oracle import get_weather_at_location
from services.payouts import initiate_payouts
from services.persistence import persist_claim


def _synthetic_signals_for_profile(profile: str) -> dict[str, Any]:
    # Profiles mirror the Phase 1 claim presets, but are used server-side for
    # a "zero touch" UX.
    if profile == "spoofer":
        return {
            "accelerometer_variance": 0.002,
            "gyroscope_rotation_events": 0,
            "step_count_delta": 0,
            "cell_tower_handoff_count": 0,
            "wifi_home_ssid_detected": True,
            "signal_strength_variance": 0.02,
            "app_foreground": False,
            "battery_drain_rate": 0.01,
            "screen_interaction_count": 2,
            "has_active_order": False,
            "last_order_minutes_ago": 180,
        }
    if profile == "syndicate":
        return {
            "accelerometer_variance": 0.003,
            "gyroscope_rotation_events": 0,
            "step_count_delta": 0,
            "cell_tower_handoff_count": 0,
            "wifi_home_ssid_detected": True,
            "signal_strength_variance": 0.01,
            "app_foreground": False,
            "battery_drain_rate": 0.005,
            "screen_interaction_count": 0,
            "has_active_order": False,
            "last_order_minutes_ago": 240,
        }
    # Default: genuine worker.
    return {
        "accelerometer_variance": 0.15,
        "gyroscope_rotation_events": 12,
        "step_count_delta": 45,
        "cell_tower_handoff_count": 3,
        "wifi_home_ssid_detected": False,
        "signal_strength_variance": 0.12,
        "app_foreground": True,
        "battery_drain_rate": 0.08,
        "screen_interaction_count": 15,
        "has_active_order": True,
        "last_order_minutes_ago": 8,
    }


async def submit_zero_touch_claim(
    *,
    policy: dict[str, Any],
    store: list[dict[str, Any]],
    behavior_profile: str = "genuine",
    disruption_snapshot: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Creates a claim record in the in-memory store and schedules payout completion.
    """
    signals = _synthetic_signals_for_profile(behavior_profile)
    worker_id = str(policy.get("worker_id", "worker_demo"))
    lat = float(policy.get("lat", 0.0))
    lon = float(policy.get("lon", 0.0))

    weather = await get_weather_at_location(lat, lon)

    order_ctx = await get_order_context(
        worker_id=worker_id,
        fallback_has_active_order=bool(signals.get("has_active_order", True)),
        fallback_last_order_minutes_ago=int(signals.get("last_order_minutes_ago", 8)),
    )

    bundle = SignalBundle(
        accelerometer_variance=float(signals["accelerometer_variance"]),
        gyroscope_rotation_events=int(signals["gyroscope_rotation_events"]),
        step_count_delta=int(signals["step_count_delta"]),
        cell_tower_handoff_count=int(signals["cell_tower_handoff_count"]),
        wifi_home_ssid_detected=bool(signals["wifi_home_ssid_detected"]),
        signal_strength_variance=float(signals["signal_strength_variance"]),
        app_foreground=bool(signals["app_foreground"]),
        battery_drain_rate=float(signals["battery_drain_rate"]),
        screen_interaction_count=int(signals["screen_interaction_count"]),
        has_active_order=order_ctx["has_active_order"],
        last_order_minutes_ago=order_ctx["last_order_minutes_ago"],
        lat=lat,
        lon=lon,
        worker_id=worker_id,
        claimed_at=datetime.utcnow(),
    )

    use_ml = os.getenv("BTE_USE_ML", "false").lower() == "true"
    bte_result = compute_trust_score(
        bundle, recent_claims=store, veteran_shield=False, use_ml=use_ml
    )
    claim_id = f"clm_auto_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{worker_id[:8]}"

    # Base payout: ₹50 micro-payout (demo)
    base = 50
    tier = bte_result["tier"]

    payout_amount_now = 0
    remaining_amount = 0
    payout_eta_seconds = 0
    payout_status = "processing"
    payout_ref = ""

    impossible_count = len(bte_result.get("impossible_combinations", []))
    syndicate_idx = float(bte_result.get("syndicate_suspicion_index", 0))

    if tier == "instant":
        payout_amount_now = base
        msg = "Zero-touch approval: payout is sent automatically to your UPI."
    elif tier == "provisional":
        payout_amount_now = base // 2
        remaining_amount = base - payout_amount_now
        msg = f"Zero-touch provisional: ₹{payout_amount_now} sent now. Remaining completes after verification."
    else:
        remaining_amount = base
        msg = "Zero-touch escrow: reviewing claim authenticity. No action required."

    if not weather.is_adverse:
        payout_amount_now = 0
        payout_status = "rejected_no_adverse_weather"
        remaining_amount = 0
        payout_ref = "none"
        msg = "No adverse weather at worker's coordinates. Claim auto-rejected."

    record: dict[str, Any] = {
        "claim_id": claim_id,
        "policy_id": policy.get("policy_id"),
        "initiated_by": "zero_touch_trigger",
        "disruption_snapshot": disruption_snapshot or {},
        "worker_id": worker_id,
        "claimed_at": datetime.utcnow().isoformat(),
        "lat": lat,
        "lon": lon,
        "trust_score": bte_result["trust_score"],
        "tier": tier,
        "device_fp": bte_result.get("device_fingerprint", ""),
        "upi_handle": str(policy.get("upi_handle") or os.getenv("DEFAULT_WORKER_UPI", "") or ""),
        "payout_ref": "",
        "payout_status": "processing",
        "payout_amount_now_sent": 0,
        "remaining_amount": 0,
        "payout_eta_seconds": 0,
    }

    store.append(record)
    persist_claim(record)

    if weather.is_adverse:
        payout_payload = initiate_payouts(
            store=store,
            claim_id=claim_id,
            tier=tier,
            base_total_amount=base,
            trust_score=int(bte_result["trust_score"]),
            syndicate_idx=syndicate_idx,
            impossible_count=impossible_count,
        )
        payout_ref = payout_payload["payout_ref"]
        payout_status = payout_payload["payout_status"]
        payout_eta_seconds = payout_payload["payout_eta_seconds"]
        remaining_amount = payout_payload["remaining_amount"]
        payout_amount_now = payout_payload["payout_amount_now_sent"]

    return {
        "claim_id": claim_id,
        "trust_score": bte_result["trust_score"],
        "tier": tier,
        "payout_amount": payout_amount_now if weather.is_adverse else 0,
        "payout_status": payout_status,
        "payout_ref": payout_ref,
        "remaining_amount": remaining_amount,
        "payout_eta_seconds": payout_eta_seconds,
        "payout_message": msg,
        "weather_verified": weather.is_adverse,
        "weather_condition": weather.condition,
        "breakdown": bte_result["breakdown"],
        "syndicate_suspicion_index": bte_result["syndicate_suspicion_index"],
    }

