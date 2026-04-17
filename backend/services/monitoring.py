"""
Background disruption monitoring scheduler.

Runs continuously (when enabled) and evaluates active policies for disruption.
If a qualifying disruption is detected, it files zero-touch claims automatically.
"""

from __future__ import annotations

import asyncio
import os
from datetime import datetime, timedelta
from typing import Any

from services.auto_claims import submit_zero_touch_claim
from services.mock_disruption_data import (
    WeatherForecast,
    WaterLogging,
    RoadClosure,
    OrderIncomeImpact,
    disruption_score_from_signals,
    mock_weather_forecast,
    mock_waterlogging,
    mock_roadclosure,
    mock_order_impact,
)


def _safe_int_env(name: str, default: int) -> int:
    raw = os.getenv(name, str(default))
    try:
        return int(raw)
    except (TypeError, ValueError):
        return default


def _to_iso(dt: datetime) -> str:
    return dt.isoformat()


def _cooldown_ok(last_auto_claim_at: str | None, cooldown_minutes: int) -> bool:
    if not last_auto_claim_at:
        return True
    try:
        ts = datetime.fromisoformat(str(last_auto_claim_at))
    except Exception:
        return True
    return datetime.utcnow() - ts >= timedelta(minutes=max(1, cooldown_minutes))


async def evaluate_policy_once(*, policy: dict, worker: dict, claim_store: list[dict]) -> dict[str, Any]:
    lat = float(policy.get("lat", 0.0))
    lon = float(policy.get("lon", 0.0))
    worker_id = str(policy.get("worker_id", "") or "")
    behavior_profile = str(worker.get("behavior_profile", "genuine") or "genuine")

    weather_j = mock_weather_forecast(lat, lon)
    water_j = mock_waterlogging(lat, lon)
    road_j = mock_roadclosure(lat, lon)
    order_j = mock_order_impact(worker_id, lat, lon)

    weather = WeatherForecast(
        predicted_rain_prob=float(weather_j.predicted_rain_prob),
        predicted_severity=str(weather_j.predicted_severity),
        adverse_future=bool(weather_j.adverse_future),
    )
    water = WaterLogging(
        water_logging_risk=float(water_j.water_logging_risk),
        safe_zone=bool(water_j.safe_zone),
    )
    road = RoadClosure(
        road_closure_prob=float(road_j.road_closure_prob),
        severity=str(road_j.severity),
    )
    order = OrderIncomeImpact(
        income_loss_prob=float(order_j.income_loss_prob),
        predicted_hours_lost=int(order_j.predicted_hours_lost),
        likely_reason=str(order_j.likely_reason),
    )

    disruption = disruption_score_from_signals(
        weather=weather,
        water=water,
        road=road,
        order=order,
    )

    trigger_outputs = [
        {
            "name": "weather_forecast",
            "triggered": disruption.get("weather_alert", 0.0) > 0.5,
            "value": disruption.get("weather", {}).get("predicted_rain_prob"),
        },
        {
            "name": "water_logging_risk",
            "triggered": disruption.get("water_alert", 0.0) > 0.5,
            "value": disruption.get("water", {}).get("water_logging_risk"),
        },
        {
            "name": "road_closure_likelihood",
            "triggered": disruption.get("road_alert", 0.0) > 0.5,
            "value": disruption.get("road", {}).get("road_closure_prob"),
        },
        {
            "name": "order_income_drop",
            "triggered": disruption.get("order_alert", 0.0) > 0.5,
            "value": disruption.get("order", {}).get("income_loss_prob"),
        },
    ]

    now_iso = _to_iso(datetime.utcnow())
    policy["last_disruption"] = {
        "detected_at": now_iso,
        "disruption_score": disruption.get("disruption_score"),
        "reasons": disruption.get("reasons", []),
        "trigger_outputs": trigger_outputs,
    }
    policy["last_monitor_run_at"] = now_iso

    if not bool(disruption.get("triggered", False)):
        return {"triggered": False, "claim": None, "disruption": disruption}

    claim = await submit_zero_touch_claim(
        policy=policy,
        store=claim_store,
        behavior_profile=behavior_profile,
        disruption_snapshot=disruption,
    )
    policy["last_auto_claim_at"] = now_iso
    policy["last_disruption"]["claim_id"] = claim.get("claim_id")
    return {"triggered": True, "claim": claim, "disruption": disruption}


async def monitoring_loop(app) -> None:
    default_interval_s = _safe_int_env("TRIGGER_MONITOR_INTERVAL_SECONDS", 60)
    default_cooldown_min = _safe_int_env("TRIGGER_POLICY_COOLDOWN_MINUTES", 30)
    default_interval_s = max(10, default_interval_s)
    default_cooldown_min = max(1, default_cooldown_min)

    app.state.monitoring_stats = {
        "running": True,
        "enabled": True,
        "last_run_at": None,
        "last_success_at": None,
        "last_error": None,
        "iterations": 0,
        "policies_scanned": 0,
        "claims_triggered": 0,
        "interval_seconds": default_interval_s,
        "cooldown_minutes": default_cooldown_min,
    }

    while True:
        try:
            stats = getattr(app.state, "monitoring_stats", {}) or {}
            if not bool(stats.get("running", True)):
                await asyncio.sleep(1.0)
                continue

            interval_s = max(10, int(stats.get("interval_seconds", default_interval_s) or default_interval_s))
            cooldown_min = max(1, int(stats.get("cooldown_minutes", default_cooldown_min) or default_cooldown_min))

            policies: list[dict] = getattr(app.state, "policy_store", [])
            workers: list[dict] = getattr(app.state, "worker_store", [])
            claims: list[dict] = getattr(app.state, "claim_store", [])

            worker_index = {str(w.get("worker_id", "")): w for w in workers}
            active = [p for p in policies if p.get("active", True) and p.get("auto_claim_opt_in", True)]

            app.state.monitoring_stats["iterations"] += 1
            app.state.monitoring_stats["last_run_at"] = _to_iso(datetime.utcnow())
            app.state.monitoring_stats["policies_scanned"] += len(active)

            triggered_this_run = 0
            for p in active:
                if not _cooldown_ok(str(p.get("last_auto_claim_at", "") or ""), cooldown_min):
                    continue
                wid = str(p.get("worker_id", "") or "")
                worker = worker_index.get(wid)
                if not worker:
                    continue
                result = await evaluate_policy_once(policy=p, worker=worker, claim_store=claims)
                if result.get("triggered"):
                    triggered_this_run += 1

            app.state.monitoring_stats["claims_triggered"] += triggered_this_run
            app.state.monitoring_stats["last_success_at"] = _to_iso(datetime.utcnow())
            app.state.monitoring_stats["last_error"] = None
        except asyncio.CancelledError:
            app.state.monitoring_stats["running"] = False
            app.state.monitoring_stats["enabled"] = False
            raise
        except Exception as exc:
            app.state.monitoring_stats["last_error"] = str(exc)

        await asyncio.sleep(interval_s)

