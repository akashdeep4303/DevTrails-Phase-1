"""
Behavioral Trust Engine (BTE)
Multi-signal fusion → Trust Score 0-100
"""

import hashlib
from dataclasses import dataclass
from datetime import datetime
from typing import Any


def _clip(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


@dataclass
class SignalBundle:
    """9 passive device signals at claim time."""
    # IMU
    accelerometer_variance: float
    gyroscope_rotation_events: int
    step_count_delta: int
    # Network
    cell_tower_handoff_count: int
    wifi_home_ssid_detected: bool
    signal_strength_variance: float
    # Device
    app_foreground: bool
    battery_drain_rate: float
    screen_interaction_count: int
    # Platform (optional)
    has_active_order: bool = True
    last_order_minutes_ago: int = 10
    # Metadata
    lat: float = 0.0
    lon: float = 0.0
    claimed_at: datetime | None = None
    worker_id: str = ""


def _impossible_combination(bundle: SignalBundle) -> list[str]:
    """Detect 'Impossible Combination' rules → escalate to Tier 2."""
    flags = []
    # Rule 1: Red zone + home Wi-Fi
    if bundle.wifi_home_ssid_detected and bundle.lat != 0:
        flags.append("home_wifi_in_claimed_zone")
    # Rule 2: Movement claimed but sedentary IMU
    if bundle.accelerometer_variance < 0.01 and bundle.step_count_delta == 0:
        flags.append("sedentary_imu_with_claimed_movement")
    # Rule 3: Cell tower >2km from claimed GPS (simplified: stable tower = suspicious)
    if bundle.cell_tower_handoff_count == 0 and bundle.lat != 0:
        flags.append("no_cell_handoff_during_claimed_travel")
    return flags


def _syndicate_suspicion_index(
    worker_id: str,
    claimed_at: datetime,
    recent_claims: list[dict],
    device_fingerprint: str,
) -> float:
    """
    SSI: Temporal clustering + fingerprint correlation.
    Returns 0-1; >0.7 = high syndicate suspicion.
    """
    if not recent_claims:
        return 0.0
    # Temporal: claims within 90 seconds in same city
    window_seconds = 90
    clustered = 0
    for c in recent_claims:
        if c.get("worker_id") == worker_id:
            continue
        raw_ts = c.get("claimed_at")
        if not raw_ts:
            continue
        try:
            ts = datetime.fromisoformat(str(raw_ts))
        except (TypeError, ValueError):
            # Ignore malformed historical rows instead of failing the request.
            continue
        if abs((claimed_at - ts).total_seconds()) < window_seconds:
            clustered += 1
    temporal_score = min(clustered / 10, 1.0)  # 10+ = max
    # Fingerprint: same device fingerprint (simplified)
    same_fingerprint = sum(
        1 for c in recent_claims if c.get("device_fp") == device_fingerprint
    )
    fp_score = min(same_fingerprint / 5, 1.0)
    return 0.6 * temporal_score + 0.4 * fp_score


def compute_trust_score(
    bundle: SignalBundle,
    recent_claims: list[dict] | None = None,
    veteran_shield: bool = False,
    use_ml: bool = False,
) -> dict[str, Any]:
    """
    Trust score via ML (GradientBoosting) if model available, else heuristic fusion.
    Returns trust_score (0-100), tier, flags, breakdown.
    """
    recent_claims = recent_claims or []
    ml_score = None
    if use_ml:
        try:
            from .bte_ml import predict_trust_score
            ml_score = predict_trust_score(bundle)
        except Exception:
            pass
    impossible = _impossible_combination(bundle)
    device_fp = hashlib.sha256(
        f"{bundle.worker_id}{bundle.lat}{bundle.lon}".encode()
    ).hexdigest()[:16]
    ssi = _syndicate_suspicion_index(
        bundle.worker_id,
        bundle.claimed_at or datetime.utcnow(),
        recent_claims,
        device_fp,
    )

    # Score components (each 0-1, higher = more genuine)
    scores = []
    # IMU: motion expected
    imu = min(1.0, (bundle.accelerometer_variance * 50) + (bundle.gyroscope_rotation_events / 20) + (bundle.step_count_delta / 50))
    scores.append(("imu", _clip(imu, 0, 1)))
    # Network: handoffs = movement
    net = 0.5 + (bundle.cell_tower_handoff_count / 5) * 0.3 - (0.4 if bundle.wifi_home_ssid_detected else 0) + min(bundle.signal_strength_variance, 0.2)
    scores.append(("network", _clip(net, 0, 1)))
    # Device: active app, battery drain
    dev = (0.3 if bundle.app_foreground else 0) + min(bundle.battery_drain_rate * 2, 0.3) + min(bundle.screen_interaction_count / 20, 0.4)
    scores.append(("device", _clip(dev, 0, 1)))
    # Platform: active order
    plat = 0.6 if bundle.has_active_order else 0
    plat += max(0, 0.4 - bundle.last_order_minutes_ago / 60)
    scores.append(("platform", _clip(plat, 0, 1)))
    # Syndicate: invert SSI
    synd = 1.0 - ssi
    scores.append(("syndicate", max(0, synd)))

    weights = [0.25, 0.25, 0.20, 0.20, 0.10]
    raw = sum(w * s for (_, s), w in zip(scores, weights))
    heuristic_trust = int(_clip(raw * 100, 0, 100))
    trust = int(ml_score) if ml_score is not None else heuristic_trust

    # Impossible combinations → cap or reduce
    for _ in impossible:
        trust = max(0, trust - 25)
    # SSI penalty
    if ssi > 0.7:
        trust = min(trust, 35)
    elif ssi > 0.5:
        trust = min(trust, 55)

    if veteran_shield:
        trust = max(trust, 50)

    # Tier
    if trust >= 70:
        tier = "instant"
    elif trust >= 40:
        tier = "provisional"
    else:
        tier = "escrow"

    return {
        "trust_score": trust,
        "tier": tier,
        "impossible_combinations": impossible,
        "syndicate_suspicion_index": round(ssi, 3),
        "breakdown": {k: round(v, 3) for k, v in scores},
        "device_fingerprint": device_fp,
    }
