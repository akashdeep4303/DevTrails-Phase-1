"""
Phase 2 — Mock/public API endpoints for disruption detection.

These endpoints are consumed by `POST /api/triggers/run` to identify
disruptions that may cause a worker's income loss.
"""

from __future__ import annotations

from fastapi import APIRouter, Request

from routers.deps import require_dpdp_consent
from services.mock_disruption_data import (
    mock_weather_forecast,
    mock_waterlogging,
    mock_roadclosure,
    mock_order_impact,
)

router = APIRouter()


@router.get("/weather-forecast")
def weather_forecast(lat: float, lon: float, request: Request):
    require_dpdp_consent(request)
    w = mock_weather_forecast(lat, lon)
    return {"lat": lat, "lon": lon, **w.__dict__}


@router.get("/waterlogging")
def waterlogging(lat: float, lon: float, request: Request):
    require_dpdp_consent(request)
    w = mock_waterlogging(lat, lon)
    return {"lat": lat, "lon": lon, **w.__dict__}


@router.get("/roadclosure")
def roadclosure(lat: float, lon: float, request: Request):
    require_dpdp_consent(request)
    r = mock_roadclosure(lat, lon)
    return {"lat": lat, "lon": lon, **r.__dict__}


@router.get("/order-impact")
def order_impact(worker_id: str, lat: float, lon: float, request: Request):
    require_dpdp_consent(request)
    o = mock_order_impact(worker_id, lat, lon)
    return {"worker_id": worker_id, "lat": lat, "lon": lon, **o.__dict__}

