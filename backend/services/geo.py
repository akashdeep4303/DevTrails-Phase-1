"""
Geography helpers (demo)

Provides deterministic, no-API geo utilities for:
- zone granularity (macro/meso/micro)
- city + city tier + confidence
"""

from __future__ import annotations

def zone_id(lat: float, lon: float, *, precision_decimals: int = 3) -> str:
    """
    Stable "zone" id based on rounded lat/lon.
    Example: zone_12.970_77.590
    """
    try:
        p = int(precision_decimals)
    except Exception:
        p = 3
    p = max(1, min(6, p))
    return f"zone_{round(float(lat), p):.{p}f}_{round(float(lon), p):.{p}f}"


def zone_hierarchy(lat: float, lon: float) -> dict:
    """
    Multi-level zone ids for different aggregation levels.
    """
    return {
        "zone_macro": zone_id(lat, lon, precision_decimals=2),
        "zone_meso": zone_id(lat, lon, precision_decimals=3),
        "zone_micro": zone_id(lat, lon, precision_decimals=4),
    }


def city_tier(lat: float, lon: float) -> dict:
    """
    Demo-only city/tier assignment.

    We bucket by rough bounding boxes (very approximate) so the UI can show a
    plausible city label without external dependencies.
    """
    la = float(lat)
    lo = float(lon)

    # Tier-1 metros (approx envelopes)
    if 12.7 <= la <= 13.25 and 77.3 <= lo <= 77.95:
        return {"city": "Bengaluru", "tier": "1", "confidence": 0.95}
    if 18.8 <= la <= 19.4 and 72.7 <= lo <= 73.2:
        return {"city": "Mumbai", "tier": "1", "confidence": 0.95}
    if 28.3 <= la <= 28.95 and 76.8 <= lo <= 77.7:
        return {"city": "Delhi NCR", "tier": "1", "confidence": 0.9}
    if 17.2 <= la <= 17.65 and 78.2 <= lo <= 78.75:
        return {"city": "Hyderabad", "tier": "1", "confidence": 0.9}
    if 12.8 <= la <= 13.35 and 80.1 <= lo <= 80.45:
        return {"city": "Chennai", "tier": "1", "confidence": 0.9}
    if 22.45 <= la <= 22.75 and 88.2 <= lo <= 88.55:
        return {"city": "Kolkata", "tier": "1", "confidence": 0.88}
    if 18.45 <= la <= 18.7 and 73.7 <= lo <= 74.05:
        return {"city": "Pune", "tier": "1", "confidence": 0.85}

    # Tier-2 examples
    if 26.75 <= la <= 27.1 and 75.65 <= lo <= 75.95:
        return {"city": "Jaipur", "tier": "2", "confidence": 0.8}
    if 26.4 <= la <= 26.6 and 80.2 <= lo <= 80.45:
        return {"city": "Lucknow", "tier": "2", "confidence": 0.78}
    if 23.0 <= la <= 23.25 and 72.45 <= lo <= 72.75:
        return {"city": "Ahmedabad", "tier": "2", "confidence": 0.82}

    # Default fallback
    tier = "2" if 8 <= la <= 32 else "3"
    return {"city": "Other", "tier": tier, "confidence": 0.55 if tier == "2" else 0.45}

