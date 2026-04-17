"""
Phase 2 — Automated disruption triggers & zero-touch claims
"""

from __future__ import annotations

import asyncio
from dataclasses import asdict, is_dataclass
from datetime import datetime
from typing import Any
import os

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, field_validator

from routers.deps import require_dpdp_consent
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

router = APIRouter()

DEFAULT_TRIGGER_TIMEOUT_SECONDS = 3.0


def _safe_float_env(name: str, default: float) -> float:
    raw = os.getenv(name, str(default))
    try:
        return float(raw)
    except (TypeError, ValueError):
        return default


def _obj_to_dict(value: object) -> dict[str, Any]:
    # Accept dataclasses, pydantic-like models, and plain dicts.
    if isinstance(value, dict):
        return value
    if is_dataclass(value):
        return asdict(value)
    dump = getattr(value, "model_dump", None)
    if callable(dump):
        out = dump()
        if isinstance(out, dict):
            return out
    raw = getattr(value, "__dict__", None)
    if isinstance(raw, dict):
        return raw
    return {}


class TriggerRunRequest(BaseModel):
    worker_id: str
    behavior_profile: str = "genuine"
    policy_id: str | None = None

    @field_validator("worker_id", "policy_id", "behavior_profile", mode="before")
    @classmethod
    def strip_ids(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v


class MonitoringControlRequest(BaseModel):
    running: bool | None = None
    interval_seconds: int | None = None
    cooldown_minutes: int | None = None


@router.get("/monitoring-status")
def monitoring_status(request: Request):
    require_dpdp_consent(request)
    stats = getattr(request.app.state, "monitoring_stats", {}) or {}
    policy_store: list[dict] = getattr(request.app.state, "policy_store", [])
    active_auto = [
        p for p in policy_store if p.get("active", True) and p.get("auto_claim_opt_in", True)
    ]
    return {
        "scheduler": stats,
        "active_auto_policies": len(active_auto),
        "sample_policy_last_runs": [
            {
                "policy_id": p.get("policy_id"),
                "worker_id": p.get("worker_id"),
                "last_monitor_run_at": p.get("last_monitor_run_at"),
                "last_auto_claim_at": p.get("last_auto_claim_at"),
            }
            for p in active_auto[:10]
        ],
    }


@router.post("/monitoring-control")
def monitoring_control(payload: MonitoringControlRequest, request: Request):
    require_dpdp_consent(request)
    stats = getattr(request.app.state, "monitoring_stats", None)
    if stats is None:
        return {"ok": False, "message": "Monitoring scheduler is unavailable.", "scheduler": None}

    if payload.running is not None:
        stats["running"] = bool(payload.running)
    if payload.interval_seconds is not None:
        stats["interval_seconds"] = max(10, int(payload.interval_seconds))
    if payload.cooldown_minutes is not None:
        stats["cooldown_minutes"] = max(1, int(payload.cooldown_minutes))

    return {"ok": True, "scheduler": stats}


@router.post("/run")
async def run_triggers(payload: TriggerRunRequest, request: Request):
    require_dpdp_consent(request)
    worker_store: list[dict] = getattr(request.app.state, "worker_store", [])
    policy_store: list[dict] = getattr(request.app.state, "policy_store", [])
    claim_store: list[dict] = getattr(request.app.state, "claim_store", [])

    worker = next((w for w in worker_store if w.get("worker_id") == payload.worker_id), None)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    policies = [p for p in policy_store if p.get("worker_id") == payload.worker_id and p.get("active", True)]
    if payload.policy_id:
        policy = next((p for p in policies if p.get("policy_id") == payload.policy_id), None)
    else:
        # Latest active policy
        policy = sorted(policies, key=lambda x: str(x.get("created_at", "")), reverse=True)[0] if policies else None

    if not policy:
        raise HTTPException(status_code=404, detail="Active policy not found. Create one first.")
    if not bool(policy.get("auto_claim_opt_in", True)):
        return {"triggered": False, "message": "Auto-claims disabled for this policy.", "claim": None, "disruption": None}

    lat = float(policy.get("lat", 0.0))
    lon = float(policy.get("lon", 0.0))
    consent = request.headers.get("x-vigil-consent")
    headers = {}
    if consent:
        headers["x-vigil-consent"] = consent

    # Prefer direct in-process mock generation to avoid self-HTTP deadlocks/timeouts.
    weather_j = _obj_to_dict(mock_weather_forecast(lat, lon))
    water_j = _obj_to_dict(mock_waterlogging(lat, lon))
    road_j = _obj_to_dict(mock_roadclosure(lat, lon))
    order_j = _obj_to_dict(mock_order_impact(payload.worker_id, lat, lon))

    # Optional override: if a base URL is provided, try external mock APIs in parallel.
    # If they fail/timeout, fall back to in-process values for a smoother UX.
    base_url = os.getenv("VIGIL_API_BASE_URL_OVERRIDE", "").strip()
    if base_url:
        timeout_seconds = _safe_float_env(
            "TRIGGER_HTTP_TIMEOUT_SECONDS", DEFAULT_TRIGGER_TIMEOUT_SECONDS
        )
        timeout_seconds = max(0.5, timeout_seconds)
        try:
            async with httpx.AsyncClient(timeout=timeout_seconds) as client:
                weather_task = client.get(
                    f"{base_url}/api/mock/weather-forecast",
                    params={"lat": lat, "lon": lon},
                    headers=headers,
                )
                water_task = client.get(
                    f"{base_url}/api/mock/waterlogging",
                    params={"lat": lat, "lon": lon},
                    headers=headers,
                )
                road_task = client.get(
                    f"{base_url}/api/mock/roadclosure",
                    params={"lat": lat, "lon": lon},
                    headers=headers,
                )
                order_task = client.get(
                    f"{base_url}/api/mock/order-impact",
                    params={"worker_id": payload.worker_id, "lat": lat, "lon": lon},
                    headers=headers,
                )
                weather_res, water_res, road_res, order_res = await asyncio.gather(
                    weather_task, water_task, road_task, order_task, return_exceptions=True
                )
        except Exception:
            weather_res = water_res = road_res = order_res = None

        def _as_json(resp: object) -> dict[str, Any] | None:
            if isinstance(resp, Exception) or resp is None:
                return None
            if getattr(resp, "status_code", None) != 200:
                return None
            try:
                return resp.json()
            except Exception:
                return None

        weather_http = _as_json(weather_res)
        water_http = _as_json(water_res)
        road_http = _as_json(road_res)
        order_http = _as_json(order_res)
        if weather_http:
            weather_j = weather_http
        if water_http:
            water_j = water_http
        if road_http:
            road_j = road_http
        if order_http:
            order_j = order_http

    weather = WeatherForecast(
        predicted_rain_prob=float(weather_j.get("predicted_rain_prob", 0.0)),
        predicted_severity=str(weather_j.get("predicted_severity", "none")),
        adverse_future=bool(weather_j.get("adverse_future", False)),
    )
    water = WaterLogging(
        water_logging_risk=float(water_j.get("water_logging_risk", 0.0)),
        safe_zone=bool(water_j.get("safe_zone", False)),
    )
    road = RoadClosure(
        road_closure_prob=float(road_j.get("road_closure_prob", 0.0)),
        severity=str(road_j.get("severity", "none")),
    )
    order = OrderIncomeImpact(
        income_loss_prob=float(order_j.get("income_loss_prob", 0.0)),
        predicted_hours_lost=int(order_j.get("predicted_hours_lost", 0)),
        likely_reason=str(order_j.get("likely_reason", "")),
    )

    disruption = disruption_score_from_signals(
        weather=weather,
        water=water,
        road=road,
        order=order,
    )

    triggered = bool(disruption.get("triggered", False))

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

    if not triggered:
        policy["last_disruption"] = {
            "detected_at": datetime.utcnow().isoformat(),
            "disruption_score": disruption.get("disruption_score"),
            "reasons": disruption.get("reasons", []),
            "trigger_outputs": trigger_outputs,
        }
        return {"triggered": False, "message": "No qualifying disruption detected yet.", "claim": None, "disruption": disruption, "trigger_outputs": trigger_outputs}

    try:
        claim = await submit_zero_touch_claim(
            policy=policy,
            store=claim_store,
            behavior_profile=payload.behavior_profile,
            disruption_snapshot=disruption,
        )
    except Exception as exc:
        # Surface a useful API error instead of a generic 500 so UI can explain failure.
        raise HTTPException(
            status_code=500,
            detail=f"Zero-touch claim pipeline failed: {exc}",
        ) from exc

    policy["last_disruption"] = {
        "detected_at": datetime.utcnow().isoformat(),
        "disruption_score": disruption.get("disruption_score"),
        "reasons": disruption.get("reasons", []),
        "trigger_outputs": trigger_outputs,
        "claim_id": claim.get("claim_id"),
    }

    return {
        "triggered": True,
        "message": "Zero-touch claim submitted automatically.",
        "claim": claim,
        "disruption": disruption,
        "trigger_outputs": trigger_outputs,
        "policy": {
            "policy_id": policy.get("policy_id"),
            "weekly_premium_inr": policy.get("weekly_premium_inr"),
            "coverage_hours_per_day": policy.get("coverage_hours_per_day"),
        },
    }

