"""
Phase 2 — Insurance policy management
"""

from __future__ import annotations

from datetime import datetime, timedelta
import os

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, field_validator

from routers.deps import require_dpdp_consent
from services.premium import calculate_weekly_premium

router = APIRouter()


class PolicyCreate(BaseModel):
    worker_id: str
    # If omitted, premium model will recommend based on predictive weather.
    coverage_hours_per_day_pref: int = 3
    # When true, triggers may file claims automatically on the worker's behalf.
    auto_claim_opt_in: bool | None = None
    upi_handle: str | None = None

    @field_validator("worker_id", mode="before")
    @classmethod
    def strip_worker_id(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v


class PolicyResponse(BaseModel):
    policy_id: str
    worker_id: str
    lat: float
    lon: float
    coverage_hours_per_day: int
    weekly_premium_inr: int
    safe_zone_discount_inr: int
    recommended_by: str
    auto_claim_opt_in: bool
    active: bool
    valid_from: str
    valid_to: str
    premium_breakdown: dict


@router.post("/create", response_model=PolicyResponse)
def create_policy(payload: PolicyCreate, request: Request):
    require_dpdp_consent(request)
    worker_store: list[dict] = getattr(request.app.state, "worker_store", [])
    policy_store: list[dict] = getattr(request.app.state, "policy_store", [])

    if not payload.worker_id:
        raise HTTPException(status_code=422, detail="worker_id is required")

    worker = next((w for w in worker_store if w.get("worker_id") == payload.worker_id), None)
    if not worker:
        raise HTTPException(
            status_code=404,
            detail="Worker not found. Call POST /api/workers/register first with the same worker_id.",
        )

    lat = float(worker.get("lat", 0.0))
    lon = float(worker.get("lon", 0.0))
    auto_opt_in = payload.auto_claim_opt_in if payload.auto_claim_opt_in is not None else bool(worker.get("auto_claim_opt_in", True))
    upi = payload.upi_handle if payload.upi_handle is not None else str(worker.get("upi_handle", "") or "")

    premium = calculate_weekly_premium(
        lat=lat,
        lon=lon,
        worker_id=payload.worker_id,
        coverage_hours_per_day_pref=payload.coverage_hours_per_day_pref,
        upi_handle=upi,
    )

    now = datetime.utcnow()
    policy_id = f"pol_{now.strftime('%Y%m%d%H%M%S')}_{payload.worker_id[:8]}"
    valid_from = now
    valid_to = now + timedelta(days=int(os.getenv("POLICY_WEEKS_VALID_DAYS", "14")))

    record = {
        "policy_id": policy_id,
        "worker_id": payload.worker_id,
        "lat": lat,
        "lon": lon,
        "coverage_hours_per_day": int(premium["recommended_coverage_hours_per_day"]),
        "weekly_premium_inr": int(premium["weekly_premium_inr"]),
        "safe_zone_discount_inr": int(premium["safe_zone_discount_inr"]),
        "recommended_by": premium.get("model_name", "heuristic+mlstyle"),
        "auto_claim_opt_in": bool(auto_opt_in),
        "active": True,
        "valid_from": valid_from.isoformat(),
        "valid_to": valid_to.isoformat(),
        "premium_breakdown": premium.get("breakdown", {}),
        "upi_handle": upi,
        "created_at": now.isoformat(),
        "last_premium_recalc_at": now.isoformat(),
        "last_disruption": None,
    }

    policy_store.append(record)
    return PolicyResponse(
        policy_id=record["policy_id"],
        worker_id=record["worker_id"],
        lat=record["lat"],
        lon=record["lon"],
        coverage_hours_per_day=record["coverage_hours_per_day"],
        weekly_premium_inr=record["weekly_premium_inr"],
        safe_zone_discount_inr=record["safe_zone_discount_inr"],
        recommended_by=record["recommended_by"],
        auto_claim_opt_in=record["auto_claim_opt_in"],
        active=record["active"],
        valid_from=record["valid_from"],
        valid_to=record["valid_to"],
        premium_breakdown=record["premium_breakdown"],
    )


@router.get("/by-worker/{worker_id}")
def policies_by_worker(worker_id: str, request: Request):
    require_dpdp_consent(request)
    policy_store: list[dict] = getattr(request.app.state, "policy_store", [])
    recs = [p for p in policy_store if p.get("worker_id") == worker_id]
    return {"policies": recs}


@router.get("/{policy_id}")
def get_policy(policy_id: str, request: Request):
    require_dpdp_consent(request)
    policy_store: list[dict] = getattr(request.app.state, "policy_store", [])
    rec = next((p for p in policy_store if p.get("policy_id") == policy_id), None)
    if not rec:
        raise HTTPException(status_code=404, detail="Policy not found")
    return rec


class PolicyRecalcRequest(BaseModel):
    coverage_hours_per_day_pref: int = 3


@router.post("/{policy_id}/recalculate")
def recalc_policy(policy_id: str, payload: PolicyRecalcRequest, request: Request):
    require_dpdp_consent(request)
    policy_store: list[dict] = getattr(request.app.state, "policy_store", [])

    rec = next((p for p in policy_store if p.get("policy_id") == policy_id), None)
    if not rec:
        raise HTTPException(status_code=404, detail="Policy not found")

    premium = calculate_weekly_premium(
        lat=float(rec.get("lat", 0.0)),
        lon=float(rec.get("lon", 0.0)),
        worker_id=str(rec.get("worker_id", "")),
        coverage_hours_per_day_pref=int(payload.coverage_hours_per_day_pref),
        upi_handle=str(rec.get("upi_handle", "") or ""),
    )

    rec["coverage_hours_per_day"] = int(premium["recommended_coverage_hours_per_day"])
    rec["weekly_premium_inr"] = int(premium["weekly_premium_inr"])
    rec["safe_zone_discount_inr"] = int(premium["safe_zone_discount_inr"])
    rec["premium_breakdown"] = premium.get("breakdown", {})
    rec["last_premium_recalc_at"] = datetime.utcnow().isoformat()
    return rec

