"""
Phase 2 — Mock/public APIs for disruption detection

These "mock APIs" simulate external feeds (weather forecast, water-logging
sensors, road closures, order platform impact) in a deterministic way so your
demo is repeatable without real network keys.
"""

from __future__ import annotations

from dataclasses import dataclass

import hashlib
from typing import Any


def _h(lat: float, lon: float, salt: str = "") -> int:
    key = f"{round(lat, 3)}|{round(lon, 3)}|{salt}"
    return int(hashlib.sha256(key.encode()).hexdigest()[:8], 16)


@dataclass
class WeatherForecast:
    predicted_rain_prob: float  # 0..1
    predicted_severity: str  # none|moderate|severe
    adverse_future: bool


@dataclass
class WaterLogging:
    water_logging_risk: float  # 0..1
    safe_zone: bool


@dataclass
class RoadClosure:
    road_closure_prob: float  # 0..1
    severity: str  # none|light|heavy


@dataclass
class OrderIncomeImpact:
    income_loss_prob: float  # 0..1
    predicted_hours_lost: int
    likely_reason: str


def mock_weather_forecast(lat: float, lon: float) -> WeatherForecast:
    h = _h(lat, lon, "forecast") % 100
    predicted_rain_prob = h / 100.0
    adverse_future = predicted_rain_prob > 0.45
    if predicted_rain_prob > 0.7:
        severity = "severe"
    elif predicted_rain_prob > 0.5:
        severity = "moderate"
    else:
        severity = "none"
    return WeatherForecast(
        predicted_rain_prob=round(predicted_rain_prob, 2),
        predicted_severity=severity,
        adverse_future=bool(adverse_future),
    )


def mock_waterlogging(lat: float, lon: float) -> WaterLogging:
    h = _h(lat, lon, "waterlogging") % 100
    # "Historically safe zone" => low risk => discount eligibility.
    safe_zone = h > 62
    water_logging_risk = (100 - h) / 100.0  # invert so low hash -> high risk
    return WaterLogging(
        water_logging_risk=round(water_logging_risk, 2),
        safe_zone=bool(safe_zone),
    )


def mock_roadclosure(lat: float, lon: float) -> RoadClosure:
    h = _h(lat, lon, "roadclosure") % 100
    road_closure_prob = h / 100.0
    if road_closure_prob > 0.7:
        severity = "heavy"
    elif road_closure_prob > 0.45:
        severity = "light"
    else:
        severity = "none"
    return RoadClosure(
        road_closure_prob=round(road_closure_prob, 2),
        severity=severity,
    )


def mock_order_impact(worker_id: str, lat: float, lon: float) -> OrderIncomeImpact:
    h = _h(lat, lon, f"order_{worker_id}") % 100
    # Income loss correlates with forecast and road closure implicitly.
    income_loss_prob = (h / 100.0) * 0.75 + 0.1
    income_loss_prob = max(0.0, min(1.0, income_loss_prob))
    predicted_hours_lost = int(1 + round(income_loss_prob * 6))
    if income_loss_prob > 0.65:
        reason = "Adverse roads + demand drop"
    elif income_loss_prob > 0.45:
        reason = "Light closures and lower order flow"
    else:
        reason = "Local disruption but limited impact"
    return OrderIncomeImpact(
        income_loss_prob=round(income_loss_prob, 2),
        predicted_hours_lost=predicted_hours_lost,
        likely_reason=reason,
    )


def disruption_score_from_signals(
    *,
    weather: WeatherForecast,
    water: WaterLogging,
    road: RoadClosure,
    order: OrderIncomeImpact,
) -> dict[str, Any]:
    weather_alert = 1.0 if weather.adverse_future else 0.0
    water_alert = 1.0 if water.water_logging_risk > 0.55 else 0.0
    road_alert = 1.0 if road.road_closure_prob > 0.55 else 0.0
    order_alert = 1.0 if order.income_loss_prob > 0.5 else 0.0

    # Weighted score; threshold determines claim automation.
    score = (
        0.4 * weather_alert
        + 0.3 * water_alert
        + 0.2 * road_alert
        + 0.1 * order_alert
    )
    triggered = score >= 0.6

    reasons: list[str] = []
    if weather_alert:
        reasons.append("Weather oracle forecast")
    if water_alert:
        reasons.append("Water logging sensor risk")
    if road_alert:
        reasons.append("Road closure likelihood")
    if order_alert:
        reasons.append("Predicted order drop")

    return {
        "weather_alert": weather_alert,
        "water_alert": water_alert,
        "road_alert": road_alert,
        "order_alert": order_alert,
        "disruption_score": round(score, 2),
        "triggered": bool(triggered),
        "reasons": reasons,
        "weather": weather.__dict__,
        "water": water.__dict__,
        "road": road.__dict__,
        "order": order.__dict__,
    }

