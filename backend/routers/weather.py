"""
Weather Oracle API
"""

from fastapi import APIRouter

from services.weather_oracle import get_weather_at_location
from routers.deps import require_dpdp_consent
from fastapi import Request

router = APIRouter()


@router.get("/at")
async def weather_at(lat: float, lon: float, request: Request):
    """Get weather at coordinates. Multi-source oracle."""
    require_dpdp_consent(request)
    w = await get_weather_at_location(lat, lon)
    return {
        "lat": w.lat,
        "lon": w.lon,
        "temp_c": w.temp_c,
        "condition": w.condition,
        "wind_kmh": w.wind_kmh,
        "precipitation_mm": w.precipitation_mm,
        "visibility_km": w.visibility_km,
        "is_adverse": w.is_adverse,
        "severity": w.severity,
        "sources_agree": w.sources_agree,
    }
