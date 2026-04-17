"""
Payout Engine (demo)

- Instant: payout immediately
- Provisional: 50% now, remainder after delay
- Escrow: hold for review, then release (benefit of doubt in demo)

If real Razorpay keys are configured, this module can be extended to call Razorpay.
For now it returns mock payout refs so the end-to-end flow works.
"""

import asyncio
import os
import uuid
from datetime import datetime
from typing import Any

from services.persistence import persist_claim
from services.razorpay_payouts import create_upi_payout


def _demo_seconds(env_name: str, default: int) -> int:
    try:
        return int(os.getenv(env_name, str(default)))
    except Exception:
        return default


PROVISIONAL_COMPLETE_SECONDS = _demo_seconds("DEMO_PROVISIONAL_SECONDS", 10)
ESCROW_REVIEW_SECONDS = _demo_seconds("DEMO_ESCROW_REVIEW_SECONDS", 10)


def _new_ref(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


async def finalize_provisional(store: list[dict], claim_id: str) -> None:
    """Complete the remaining payout after a delay (demo)."""
    await asyncio.sleep(PROVISIONAL_COMPLETE_SECONDS)
    for rec in store:
        if rec.get("claim_id") != claim_id:
            continue
        rec["payout_status"] = "completed"
        rec["payout_completed_at"] = datetime.utcnow().isoformat()
        remaining = int(rec.get("remaining_amount", 0) or 0)
        rec["payout_amount_remaining_sent"] = remaining
        rec["remaining_amount"] = 0

        upi = (rec.get("upi_handle") or "").strip()
        if remaining > 0:
            payout_final = create_upi_payout(
                upi_handle=upi,
                amount=remaining,
                reference_id=f"{rec.get('claim_id','')}_provisional_remaining",
            )
            rec["payout_ref_remaining"] = payout_final.get("payout_ref", "")
        persist_claim(rec)
        break


async def finalize_escrow_review(store: list[dict], claim_id: str, trust_score: int, syndicate_idx: float, impossible_count: int) -> None:
    """
    Escrow review completes after a delay.

    Demo policy:
    - If multiple impossible combinations OR high syndicate suspicion => reject
    - Otherwise approve with benefit of doubt
    """
    await asyncio.sleep(ESCROW_REVIEW_SECONDS)

    should_reject = impossible_count >= 2 or syndicate_idx > 0.7
    status = "rejected_after_review" if should_reject else "released_after_review"

    for rec in store:
        if rec.get("claim_id") != claim_id:
            continue
        rec["payout_status"] = status
        rec["payout_completed_at"] = datetime.utcnow().isoformat()
        if should_reject:
            rec["payout_amount_final_sent"] = 0
            rec["remaining_amount"] = 0
        else:
            final_amount = int(rec.get("payout_amount_total", 0) or 0)
            rec["payout_amount_final_sent"] = final_amount
            rec["remaining_amount"] = 0
            upi = (rec.get("upi_handle") or "").strip()
            payout_final = create_upi_payout(
                upi_handle=upi,
                amount=final_amount,
                reference_id=f"{rec.get('claim_id','')}_escrow_final",
            )
            rec["payout_ref_final"] = payout_final.get("payout_ref", "")
        persist_claim(rec)
        break


def initiate_payouts(
    store: list[dict],
    claim_id: str,
    tier: str,
    base_total_amount: int,
    trust_score: int,
    syndicate_idx: float,
    impossible_count: int,
) -> dict[str, Any]:
    """
    Create initial payout state and schedule completion for provisional/escrow.

    Returns a dict for API response payload.
    """
    record = next((r for r in store if r.get("claim_id") == claim_id), None)
    # record can be None if called before record is appended; handle gracefully.

    payout_ref = _new_ref("payout")

    if tier == "instant":
        status = "approved_instant"
        now_amount = base_total_amount
        remaining = 0
        eta = 0
    elif tier == "provisional":
        status = "provisional_sent"
        now_amount = base_total_amount // 2
        remaining = base_total_amount - now_amount
        eta = PROVISIONAL_COMPLETE_SECONDS
    else:
        status = "escrow_held"
        now_amount = 0
        remaining = base_total_amount
        eta = ESCROW_REVIEW_SECONDS

    if record is not None:
        upi = (record.get("upi_handle") or "").strip()
        # Try to create a real payout right away when configured.
        if now_amount > 0:
            payout_real = create_upi_payout(
                upi_handle=upi,
                amount=now_amount,
                reference_id=f"{claim_id}_{status}",
            )
            payout_ref = payout_real.get("payout_ref", payout_ref)
            record["payout_ref"] = payout_ref
            record["payout_mode"] = payout_real.get("mode", "demo")
        else:
            record["payout_ref"] = payout_ref
            record["payout_mode"] = "demo"
        record["payout_status"] = status
        record["payout_amount_now_sent"] = now_amount
        record["remaining_amount"] = remaining
        record["payout_amount_total"] = base_total_amount
        record["payout_eta_seconds"] = eta
        persist_claim(record)

    if tier == "provisional":
        asyncio.create_task(finalize_provisional(store, claim_id))
    elif tier == "escrow":
        asyncio.create_task(
            finalize_escrow_review(
                store,
                claim_id,
                trust_score=trust_score,
                syndicate_idx=syndicate_idx,
                impossible_count=impossible_count,
            )
        )

    return {
        "payout_ref": payout_ref,
        "payout_status": status,
        "payout_amount_now_sent": now_amount,
        "remaining_amount": remaining,
        "payout_eta_seconds": eta,
    }

