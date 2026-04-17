"""
Phase 2 — Worker registration
"""

from __future__ import annotations

from datetime import datetime
import os

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, field_validator

from routers.deps import require_dpdp_consent

router = APIRouter()


class WorkerRegistration(BaseModel):
    worker_id: str = "worker_demo"
    name: str = "Demo Worker"
    # Frontend often sends null when the field is empty; accept it like other routers.
    upi_handle: str | None = None
    lat: float = 12.97
    lon: float = 77.59
    auto_claim_opt_in: bool = True
    # Demo-only: how to simulate signals for zero-touch monitoring.
    behavior_profile: str = "genuine"

    @field_validator("worker_id", "name", mode="before")
    @classmethod
    def strip_text(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v


class WorkerResponse(BaseModel):
    worker_id: str
    name: str
    upi_handle: str
    lat: float
    lon: float
    auto_claim_opt_in: bool
    behavior_profile: str
    zone_id: str
    zone_macro: str
    zone_meso: str
    zone_micro: str
    city: str
    city_tier: str
    city_tier_confidence: float
    registered_at: str


@router.post("/register", response_model=WorkerResponse)
def register_worker(payload: WorkerRegistration, request: Request):
    require_dpdp_consent(request)
    store: list[dict] = getattr(request.app.state, "worker_store", [])

    existing = next((w for w in store if w.get("worker_id") == payload.worker_id), None)
    now = datetime.utcnow().isoformat()
    if not payload.worker_id:
        raise HTTPException(status_code=422, detail="worker_id is required")

    upi = (payload.upi_handle or "").strip()
    from services.geo import city_tier, zone_id, zone_hierarchy

    z = zone_id(payload.lat, payload.lon, precision_decimals=int(os.getenv("ZONE_PRECISION_DECIMALS", "3")))
    z_levels = zone_hierarchy(payload.lat, payload.lon)
    ct = city_tier(payload.lat, payload.lon)

    record = {
        "worker_id": payload.worker_id,
        "name": payload.name,
        "upi_handle": upi,
        "lat": payload.lat,
        "lon": payload.lon,
        "auto_claim_opt_in": payload.auto_claim_opt_in,
        "behavior_profile": str(payload.behavior_profile or "genuine"),
        "zone_id": z,
        "zone_macro": z_levels["zone_macro"],
        "zone_meso": z_levels["zone_meso"],
        "zone_micro": z_levels["zone_micro"],
        "city": ct["city"],
        "city_tier": ct["tier"],
        "city_tier_confidence": float(ct.get("confidence", 0.5)),
        "registered_at": existing.get("registered_at", now) if existing else now,
    }

    if existing:
        existing.update(record)
    else:
        store.append(record)

    return WorkerResponse(**record)


@router.get("/{worker_id}", response_model=WorkerResponse)
def get_worker(worker_id: str, request: Request):
    require_dpdp_consent(request)
    store: list[dict] = getattr(request.app.state, "worker_store", [])
    rec = next((w for w in store if w.get("worker_id") == worker_id), None)
    if not rec:
        raise HTTPException(status_code=404, detail="Worker not found")
    return WorkerResponse(**rec)

