"""
Razorpay payout integration (UPI)

If Razorpay credentials and a worker UPI handle are available, this module
creates real payouts via Razorpay Payouts API.

In demo mode (missing config), it returns a deterministic mock reference.
"""

from __future__ import annotations

import os
import uuid
from typing import Any

import httpx


def _demo_ref(prefix: str) -> str:
    return f"{prefix}_demo_{uuid.uuid4().hex[:10]}"


def create_upi_payout(
    *,
    upi_handle: str,
    amount: int,
    currency: str = "INR",
    purpose: str = "vigil_micro_insurance",
    reference_id: str = "",
) -> dict[str, Any]:
    """
    Returns:
      - payout_ref: string
      - mode: 'real'|'demo'
    """
    key_id = os.getenv("RAZORPAY_KEY_ID", "").strip()
    key_secret = os.getenv("RAZORPAY_KEY_SECRET", "").strip()
    api_url = os.getenv("RAZORPAY_PAYOUTS_API_URL", "https://api.razorpay.com/v1/payouts").strip()

    if not key_id or not key_secret or not upi_handle:
        return {"payout_ref": _demo_ref("payout"), "mode": "demo"}

    # Razorpay UPI payout payload is configurable here. If your Razorpay
    # account expects different fields, adjust using env variables.
    account_type = os.getenv("RAZORPAY_PAYOUT_ACCOUNT_TYPE", "upi").strip() or "upi"
    speed = os.getenv("RAZORPAY_PAYOUT_SPEED", "normal").strip() or "normal"
    queue_if_low_balance = os.getenv("RAZORPAY_QUEUE_IF_LOW_BALANCE", "true").lower() == "true"

    payload: dict[str, Any] = {
        "amount": amount,
        "currency": currency,
        "purpose": purpose,
        "mode": account_type.upper(),
        "speed": speed,
        "queue_if_low_balance": queue_if_low_balance,
        "recipient_type": "individual",
        "account_type": account_type,
        "account_number": upi_handle,
    }
    if reference_id:
        payload["reference_id"] = reference_id

    try:
        r = httpx.post(
            api_url,
            auth=(key_id, key_secret),
            json=payload,
            timeout=10.0,
        )
        if r.status_code in (200, 201):
            j = r.json()
            return {"payout_ref": j.get("id") or j.get("payout_id") or _demo_ref("payout"), "mode": "real"}
        return {"payout_ref": _demo_ref("payout"), "mode": "demo"}
    except Exception:
        return {"payout_ref": _demo_ref("payout"), "mode": "demo"}

