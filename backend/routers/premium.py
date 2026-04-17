"""
Phase 2 — Dynamic premium calculation endpoint
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, field_validator

from routers.deps import require_dpdp_consent
from services.premium import calculate_weekly_premium

router = APIRouter()


class WeeklyPremiumRequest(BaseModel):
    worker_id: str
    coverage_hours_per_day_pref: int = 3

    @field_validator("worker_id", mode="before")
    @classmethod
    def strip_worker_id(cls, v: object) -> object:
        if isinstance(v, str):
            return v.strip()
        return v


@router.post("/weekly")
def weekly_premium(req: WeeklyPremiumRequest, request: Request):
    require_dpdp_consent(request)
    worker_store: list[dict] = getattr(request.app.state, "worker_store", [])
    worker = next((w for w in worker_store if w.get("worker_id") == req.worker_id), None)
    if not worker:
        raise HTTPException(status_code=404, detail="Worker not found")

    premium = calculate_weekly_premium(
        lat=float(worker.get("lat", 0.0)),
        lon=float(worker.get("lon", 0.0)),
        worker_id=req.worker_id,
        coverage_hours_per_day_pref=int(req.coverage_hours_per_day_pref),
        upi_handle=str(worker.get("upi_handle", "") or ""),
    )
    return {
        "worker_id": req.worker_id,
        "weekly_premium_inr": int(premium["weekly_premium_inr"]),
        "recommended_coverage_hours_per_day": int(premium["recommended_coverage_hours_per_day"]),
        "safe_zone_discount_inr": int(premium["safe_zone_discount_inr"]),
        "model_name": premium.get("model_name", "heuristic"),
        "breakdown": premium.get("breakdown", {}),
    }

