"""
Phase 2 — Dynamic weekly premium calculation

Implements the deliverable:
- hyper-local risk factors (water-logging safe zone, forecast weather, etc.)
- a ML-style risk model (falls back to deterministic heuristic when ML libs
  are not available)
- requirement: "model charges ₹2 less per week if the worker operates in a
  zone historically safe from water logging"
- requirement: "dynamically offers increased coverage hours based on predictive
  weather modelling"
"""

from __future__ import annotations

from typing import Any

from services.mock_disruption_data import (
    mock_weather_forecast,
    mock_waterlogging,
    mock_roadclosure,
    mock_order_impact,
)

from services.premium_ml import (
    predict_risk_score,
    heuristic_risk_score,
    train_synthetic_premium_model,
)


def _recommended_hours(predicted_rain_prob: float, predicted_severity: str) -> int:
    # Coverage expansion based on predictive weather.
    if predicted_severity == "severe" and predicted_rain_prob > 0.7:
        return 6
    if predicted_severity in ("severe", "moderate") and predicted_rain_prob > 0.55:
        return 5
    if predicted_rain_prob > 0.35:
        return 4
    return 3


def calculate_weekly_premium(
    *,
    lat: float,
    lon: float,
    worker_id: str,
    coverage_hours_per_day_pref: int,
    upi_handle: str = "",
) -> dict[str, Any]:
    forecast = mock_weather_forecast(lat, lon)
    water = mock_waterlogging(lat, lon)
    road = mock_roadclosure(lat, lon)
    order = mock_order_impact(worker_id, lat, lon)

    safe_zone_discount_inr = -2 if water.safe_zone else 0

    recommended_hours = _recommended_hours(
        predicted_rain_prob=forecast.predicted_rain_prob,
        predicted_severity=forecast.predicted_severity,
    )

    # Respect user's preference when provided, but still expand when risk is high.
    coverage_hours_per_day = max(int(coverage_hours_per_day_pref), recommended_hours)

    # "ML Integration Example": risk score via ML model (if available).
    # We try to train once on-demand when libraries are available and no model exists.
    risk_pred, model_name = predict_risk_score(
        water_logging_risk=water.water_logging_risk,
        predicted_rain_prob=forecast.predicted_rain_prob,
        road_closure_prob=road.road_closure_prob,
        income_loss_prob=order.income_loss_prob,
        coverage_hours_per_day_pref=coverage_hours_per_day,
        safe_zone=water.safe_zone,
    )

    ml_used = risk_pred is not None
    if risk_pred is None:
        # Train if possible and allowed (fast synthetic dataset).
        try:
            if train_synthetic_premium_model():
                risk_pred2, _ = predict_risk_score(
                    water_logging_risk=water.water_logging_risk,
                    predicted_rain_prob=forecast.predicted_rain_prob,
                    road_closure_prob=road.road_closure_prob,
                    income_loss_prob=order.income_loss_prob,
                    coverage_hours_per_day_pref=coverage_hours_per_day,
                    safe_zone=water.safe_zone,
                )
                if risk_pred2 is not None:
                    risk_pred = risk_pred2
                    model_name = "premium_ml_gbr"
                    ml_used = True
        except Exception:
            pass

    risk_score = float(risk_pred) if risk_pred is not None else heuristic_risk_score(
        water_logging_risk=water.water_logging_risk,
        predicted_rain_prob=forecast.predicted_rain_prob,
        road_closure_prob=road.road_closure_prob,
        income_loss_prob=order.income_loss_prob,
        coverage_hours_per_day_pref=coverage_hours_per_day,
        safe_zone=water.safe_zone,
    )

    # Pricing formula: base premium + risk uplift + coverage uplift + safe-zone discount.
    base_weekly = 120
    risk_uplift = int(round(risk_score * 65))
    coverage_extra = int(max(0, coverage_hours_per_day - 3) * 10)
    income_loss_extra = int(round(order.income_loss_prob * 12))

    weekly_premium_inr = base_weekly + risk_uplift + coverage_extra + income_loss_extra + safe_zone_discount_inr
    weekly_premium_inr = max(49, int(weekly_premium_inr))

    # Store a breakdown so customers/admin can "see the why".
    breakdown = {
        "base_weekly": base_weekly,
        "risk_score": round(risk_score, 3),
        "risk_uplift_inr": risk_uplift,
        "coverage_hours_per_day": coverage_hours_per_day,
        "coverage_extra_inr": coverage_extra,
        "income_loss_prob": order.income_loss_prob,
        "income_loss_extra_inr": income_loss_extra,
        "safe_zone": water.safe_zone,
        "water_logging_risk": water.water_logging_risk,
        "safe_zone_discount_inr": safe_zone_discount_inr,
        "forecast_predicted_rain_prob": forecast.predicted_rain_prob,
        "forecast_predicted_severity": forecast.predicted_severity,
        "road_closure_prob": road.road_closure_prob,
        "ml_used": ml_used,
    }

    return {
        "weekly_premium_inr": weekly_premium_inr,
        "recommended_coverage_hours_per_day": coverage_hours_per_day,
        "safe_zone_discount_inr": safe_zone_discount_inr,
        "model_name": model_name,
        "breakdown": breakdown,
    }

