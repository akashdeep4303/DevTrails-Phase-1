"""
Order Platform Oracle (demo)

In production this would validate:
- Last order completion timestamp (recent activity)
- Active order status at claim time

For this prototype it uses the values sent by the worker client, unless an
external order API is configured.
"""

import os
from typing import Any

import httpx


async def get_order_context(
    worker_id: str,
    fallback_has_active_order: bool,
    fallback_last_order_minutes_ago: int,
) -> dict[str, Any]:
    api_base = os.getenv("ORDER_API_BASE_URL", "").strip()
    token = os.getenv("ORDER_API_TOKEN", "").strip()

    if not api_base or not token:
        return {
            "has_active_order": fallback_has_active_order,
            "last_order_minutes_ago": fallback_last_order_minutes_ago,
        }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            r = await client.get(
                f"{api_base}/orders/active",
                headers={"Authorization": f"Bearer {token}"},
                params={"worker_id": worker_id},
            )
            if r.status_code != 200:
                raise RuntimeError("order api failed")
            j = r.json()
            return {
                "has_active_order": bool(j.get("has_active_order", fallback_has_active_order)),
                "last_order_minutes_ago": int(j.get("last_order_minutes_ago", fallback_last_order_minutes_ago)),
            }
    except Exception:
        # Fall back to client-provided values in demo.
        return {
            "has_active_order": fallback_has_active_order,
            "last_order_minutes_ago": fallback_last_order_minutes_ago,
        }

