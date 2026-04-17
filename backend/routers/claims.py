"""
Claims API — Submit, validate, payout tier
"""

from datetime import datetime
import os

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from pydantic import BaseModel

from services.bte import SignalBundle, compute_trust_score
from services.orders_oracle import get_order_context
from services.weather_oracle import get_weather_at_location
from services.payouts import initiate_payouts
from services.persistence import persist_claim
from routers.deps import require_dpdp_consent

router = APIRouter()


class ClaimSignals(BaseModel):
    accelerometer_variance: float = 0.15
    gyroscope_rotation_events: int = 12
    step_count_delta: int = 45
    cell_tower_handoff_count: int = 3
    wifi_home_ssid_detected: bool = False
    signal_strength_variance: float = 0.12
    app_foreground: bool = True
    battery_drain_rate: float = 0.08
    screen_interaction_count: int = 15
    has_active_order: bool = True
    last_order_minutes_ago: int = 8
    lat: float = 0.0
    lon: float = 0.0
    signal_packet_id: str | None = None
    upi_handle: str | None = None
    worker_id: str = "worker_demo"


class ClaimResponse(BaseModel):
    claim_id: str
    trust_score: int
    tier: str
    payout_amount: int
    payout_status: str
    payout_ref: str
    remaining_amount: int = 0
    payout_eta_seconds: int = 0
    payout_message: str
    weather_verified: bool
    weather_condition: str
    breakdown: dict
    syndicate_suspicion_index: float


@router.post("/submit", response_model=ClaimResponse)
async def submit_claim(signals: ClaimSignals, request: Request):
    """Submit a weather claim. BTE + Weather Oracle → payout tier."""
    require_dpdp_consent(request)

    store: list = getattr(request.app.state, "claim_store", [])
    weather = await get_weather_at_location(signals.lat, signals.lon)

    # If a client provided a real device ingestion packet id, load signals from there.
    if signals.signal_packet_id:
        packets: list = getattr(request.app.state, "signal_packet_store", [])
        pkt = next(
            (p for p in packets if p.get("packet_id") == signals.signal_packet_id),
            None,
        )
        if not pkt:
            raise HTTPException(status_code=404, detail="Signal packet not found")
        payload = pkt.get("signals", {}) or {}
        # Override fields with what the packet provides.
        signals = signals.model_copy(
            update={
                "accelerometer_variance": payload.get(
                    "accelerometer_variance", signals.accelerometer_variance
                ),
                "gyroscope_rotation_events": payload.get(
                    "gyroscope_rotation_events", signals.gyroscope_rotation_events
                ),
                "step_count_delta": payload.get("step_count_delta", signals.step_count_delta),
                "cell_tower_handoff_count": payload.get(
                    "cell_tower_handoff_count", signals.cell_tower_handoff_count
                ),
                "wifi_home_ssid_detected": payload.get(
                    "wifi_home_ssid_detected", signals.wifi_home_ssid_detected
                ),
                "signal_strength_variance": payload.get(
                    "signal_strength_variance", signals.signal_strength_variance
                ),
                "app_foreground": payload.get("app_foreground", signals.app_foreground),
                "battery_drain_rate": payload.get(
                    "battery_drain_rate", signals.battery_drain_rate
                ),
                "screen_interaction_count": payload.get(
                    "screen_interaction_count", signals.screen_interaction_count
                ),
                "has_active_order": payload.get("has_active_order", signals.has_active_order),
                "last_order_minutes_ago": payload.get(
                    "last_order_minutes_ago", signals.last_order_minutes_ago
                ),
                "lat": payload.get("lat", signals.lat),
                "lon": payload.get("lon", signals.lon),
                # UPI handle is stored at the packet level, not inside `signals`.
                "upi_handle": pkt.get("upi_handle", payload.get("upi_handle", signals.upi_handle)),
            }
        )
        weather = await get_weather_at_location(signals.lat, signals.lon)

    order_ctx = await get_order_context(
        worker_id=signals.worker_id,
        fallback_has_active_order=signals.has_active_order,
        fallback_last_order_minutes_ago=signals.last_order_minutes_ago,
    )

    bundle = SignalBundle(
        accelerometer_variance=signals.accelerometer_variance,
        gyroscope_rotation_events=signals.gyroscope_rotation_events,
        step_count_delta=signals.step_count_delta,
        cell_tower_handoff_count=signals.cell_tower_handoff_count,
        wifi_home_ssid_detected=signals.wifi_home_ssid_detected,
        signal_strength_variance=signals.signal_strength_variance,
        app_foreground=signals.app_foreground,
        battery_drain_rate=signals.battery_drain_rate,
        screen_interaction_count=signals.screen_interaction_count,
        has_active_order=order_ctx["has_active_order"],
        last_order_minutes_ago=order_ctx["last_order_minutes_ago"],
        lat=signals.lat,
        lon=signals.lon,
        worker_id=signals.worker_id,
        claimed_at=datetime.utcnow(),
    )

    use_ml = os.getenv("BTE_USE_ML", "false").lower() == "true"
    bte_result = compute_trust_score(
        bundle, recent_claims=store, veteran_shield=False, use_ml=use_ml
    )
    claim_id = f"clm_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{signals.worker_id[:8]}"

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
        msg = "Your payout of ₹50 has been sent. Check your UPI linked account."
    elif tier == "provisional":
        payout_amount_now = base // 2
        remaining_amount = base - payout_amount_now
        msg = f"₹{payout_amount_now} sent now. Full payout will complete shortly as our system finishes verification."
    else:
        remaining_amount = base
        msg = "We're reviewing your claim. This usually takes under 2 hours. Optional: submit a short video/photo to speed up."

    if not weather.is_adverse:
        payout_amount_now = 0
        payout_status = "rejected_no_adverse_weather"
        remaining_amount = 0
        payout_ref = "none"
        msg = "Weather at your location does not meet payout criteria. No adverse conditions detected."

    record = {
        "claim_id": claim_id,
        "worker_id": signals.worker_id,
        "claimed_at": datetime.utcnow().isoformat(),
        "lat": signals.lat,
        "lon": signals.lon,
        "trust_score": bte_result["trust_score"],
        "tier": tier,
        "device_fp": bte_result.get("device_fingerprint", ""),
        "upi_handle": signals.upi_handle or os.getenv("DEFAULT_WORKER_UPI", ""),
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

    return ClaimResponse(
        claim_id=claim_id,
        trust_score=bte_result["trust_score"],
        tier=tier,
        payout_amount=payout_amount_now if weather.is_adverse else 0,
        payout_status=payout_status,
        payout_ref=payout_ref,
        remaining_amount=remaining_amount,
        payout_eta_seconds=payout_eta_seconds,
        payout_message=msg,
        weather_verified=weather.is_adverse,
        weather_condition=weather.condition,
        breakdown=bte_result["breakdown"],
        syndicate_suspicion_index=bte_result["syndicate_suspicion_index"],
    )


@router.get("/recent")
def recent_claims(request: Request, limit: int = 20):
    require_dpdp_consent(request)
    store = getattr(request.app.state, "claim_store", [])
    return {"claims": store[-limit:][::-1]}


@router.get("/{claim_id}")
def claim_status(claim_id: str, request: Request):
    require_dpdp_consent(request)
    store = getattr(request.app.state, "claim_store", [])
    rec = next((r for r in store if r.get("claim_id") == claim_id), None)
    if not rec:
        raise HTTPException(status_code=404, detail="Claim not found")
    return rec


@router.post("/{claim_id}/media")
async def submit_claim_media(
    claim_id: str,
    request: Request,
    file: UploadFile | None = File(None),
):
    """
    Optional media submission to speed up Tier-3 reviews.
    Demo mode stores only metadata.
    """
    require_dpdp_consent(request)
    store = getattr(request.app.state, "claim_store", [])
    rec = next((r for r in store if r.get("claim_id") == claim_id), None)
    if not rec:
        raise HTTPException(status_code=404, detail="Claim not found")
    if file is not None:
        rec["media"] = {
            "filename": file.filename,
            "content_type": file.content_type,
        }
    else:
        rec["media"] = {"filename": None, "content_type": None}
    return {"ok": True}


@router.get("/by-worker/{worker_id}")
def claims_by_worker(worker_id: str, request: Request, limit: int = 50):
    require_dpdp_consent(request)
    store = getattr(request.app.state, "claim_store", [])
    recs = [c for c in store if c.get("worker_id") == worker_id]
    # newest first
    recs = sorted(recs, key=lambda x: str(x.get("claimed_at", "")), reverse=True)
    return {"claims": recs[:limit]}
