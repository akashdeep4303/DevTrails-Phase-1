"""
Weather Oracle
Multi-source: OpenWeatherMap (when API key set), else deterministic mock
"""

import os
from dataclasses import dataclass
from typing import Any

import httpx

@dataclass
class WeatherSnapshot:
    lat: float
    lon: float
    temp_c: float
    condition: str
    wind_kmh: float
    precipitation_mm: float
    visibility_km: float
    is_adverse: bool
    severity: str  # "none" | "moderate" | "severe" | "extreme"
    sources_agree: int


# Demo: deterministic "weather" from lat/lon to avoid API keys
def _mock_weather(lat: float, lon: float) -> dict[str, Any]:
    """Deterministic mock — real impl would call IMD, OpenWeather, Windy."""
    # Simple hash for reproducibility
    h = hash((round(lat, 2), round(lon, 2))) % 100
    if h < 20:
        return {
            "temp_c": 28,
            "condition": "Thunderstorm",
            "wind_kmh": 65,
            "precipitation_mm": 15,
            "visibility_km": 2,
            "is_adverse": True,
            "severity": "severe",
        }
    if h < 45:
        return {
            "temp_c": 32,
            "condition": "Heavy Rain",
            "wind_kmh": 40,
            "precipitation_mm": 25,
            "visibility_km": 4,
            "is_adverse": True,
            "severity": "moderate",
        }
    if h < 60:
        return {
            "temp_c": 35,
            "condition": "Cloudy",
            "wind_kmh": 15,
            "precipitation_mm": 0,
            "visibility_km": 8,
            "is_adverse": False,
            "severity": "none",
        }
    return {
        "temp_c": 38,
        "condition": "Clear",
        "wind_kmh": 8,
        "precipitation_mm": 0,
        "visibility_km": 10,
        "is_adverse": False,
        "severity": "none",
    }

def _iot_mesh_weather(lat: float, lon: float) -> dict[str, Any]:
    """
    Simulated hyperlocal IoT mesh sensor.
    In production: this comes from neighborhood sensors (or a local IoT mesh).
    """
    # Different hash/thresholding so it doesn't always exactly match the mock.
    h = (hash((round(lat, 2), round(lon, 2))) + 33) % 100
    if h < 25:
        return {
            "temp_c": 27,
            "condition": "Heavy Rain (IoT)",
            "wind_kmh": 55,
            "precipitation_mm": 22,
            "visibility_km": 3,
            "is_adverse": True,
            "severity": "severe",
        }
    if h < 55:
        return {
            "temp_c": 31,
            "condition": "Rain (IoT)",
            "wind_kmh": 35,
            "precipitation_mm": 12,
            "visibility_km": 5,
            "is_adverse": True,
            "severity": "moderate",
        }
    return {
        "temp_c": 36,
        "condition": "Clear (IoT)",
        "wind_kmh": 12,
        "precipitation_mm": 0,
        "visibility_km": 9,
        "is_adverse": False,
        "severity": "none",
    }


def _severity_rank(sev: str) -> int:
    return {"none": 0, "moderate": 1, "severe": 2, "extreme": 3}.get(sev, 0)


async def get_weather_at_location(lat: float, lon: float) -> WeatherSnapshot:
    """
    Multi-source oracle:
    - Source A: OpenWeatherMap (when `OPENWEATHER_API_KEY` is set)
    - Source B: hyperlocal IoT mesh (simulated)

    If OpenWeather fails/unavailable, it falls back to a deterministic mock.
    """
    api_key = os.getenv("OPENWEATHER_API_KEY")
    open_src: dict[str, Any] | None = None

    if api_key:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(
                    "https://api.openweathermap.org/data/2.5/weather",
                    params={"lat": lat, "lon": lon, "appid": api_key, "units": "metric"},
                )
                if r.status_code == 200:
                    j = r.json()
                    condition = j.get("weather", [{}])[0].get("main", "Unknown")
                    temp = j.get("main", {}).get("temp", 25)
                    wind = j.get("wind", {}).get("speed", 0) * 3.6  # m/s -> km/h
                    precip = (
                        j.get("rain", {}).get("1h", 0)
                        or j.get("snow", {}).get("1h", 0)
                        or 0
                    )
                    vis = j.get("visibility", 10000) / 1000 if j.get("visibility") else 10
                    is_adverse = condition in ("Thunderstorm", "Rain", "Drizzle", "Snow") or wind > 40
                    open_src = {
                        "temp_c": temp,
                        "condition": condition,
                        "wind_kmh": wind,
                        "precipitation_mm": precip,
                        "visibility_km": vis,
                        "is_adverse": is_adverse,
                        "severity": "severe" if is_adverse else "none",
                    }
        except Exception:
            open_src = None

    # IoT mesh (always available in this demo)
    iot_src = _iot_mesh_weather(lat, lon)

    if open_src is None:
        open_src = _mock_weather(lat, lon)

    adverse = bool(open_src["is_adverse"] or iot_src["is_adverse"])
    agree = int(open_src["is_adverse"] == adverse) + int(iot_src["is_adverse"] == adverse)

    # Choose the worse severity, and pick the condition/source value from whichever is worse.
    sev_rank_open = _severity_rank(open_src.get("severity", "none"))
    sev_rank_iot = _severity_rank(iot_src.get("severity", "none"))
    if sev_rank_iot >= sev_rank_open:
        picked = iot_src
    else:
        picked = open_src

    severity = picked.get("severity", "none")
    if adverse and severity == "none":
        severity = "moderate"

    return WeatherSnapshot(
        lat=lat,
        lon=lon,
        temp_c=round(picked["temp_c"], 1),
        condition=picked["condition"],
        wind_kmh=round(picked["wind_kmh"], 1),
        precipitation_mm=picked["precipitation_mm"],
        visibility_km=round(picked["visibility_km"], 1),
        is_adverse=adverse,
        severity=severity,
        sources_agree=agree,
    )
