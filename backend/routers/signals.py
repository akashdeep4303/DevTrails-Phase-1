"""
Signal evaluation API — test BTE with custom signals
"""

from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Any, Optional

from routers.deps import require_dpdp_consent

from services.bte import SignalBundle, compute_trust_score

router = APIRouter()


class SignalTest(BaseModel):
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
    lat: float = 12.97
    lon: float = 77.59
    worker_id: str = "test"


@router.post("/evaluate")
def evaluate_signals(signals: SignalTest, request: Request):
    """Evaluate signals through BTE without submitting a claim."""
    require_dpdp_consent(request)
    from datetime import datetime

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
        has_active_order=signals.has_active_order,
        last_order_minutes_ago=signals.last_order_minutes_ago,
        lat=signals.lat,
        lon=signals.lon,
        worker_id=signals.worker_id,
        claimed_at=datetime.utcnow(),
    )
    result = compute_trust_score(bundle)
    return result


class SignalPacketIn(BaseModel):
    """Raw device signal packet (collected by a real device SDK).

    For this prototype, `signals` is a flexible JSON object so a mobile SDK
    can send raw arrays or summarized features.
    """

    worker_id: str = "worker_demo"
    signals: dict[str, Any]
    upi_handle: Optional[str] = None


@router.post("/ingest")
def ingest_signals(packet: SignalPacketIn, request: Request):
    """Ingest real device signal packets and return a packet id."""
    require_dpdp_consent(request)
    store: list = getattr(request.app.state, "signal_packet_store", [])
    packet_id = f"pkt_{len(store) + 1}_{packet.worker_id[:6]}"

    store.append(
        {
            "packet_id": packet_id,
            "worker_id": packet.worker_id,
            "upi_handle": packet.upi_handle,
            "signals": packet.signals,
        }
    )
    return {"packet_id": packet_id}
