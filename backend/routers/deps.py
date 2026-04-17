import os

from fastapi import HTTPException, Request


def require_dpdp_consent(request: Request) -> None:
    """
    Server-side consent enforcement.

    Enable with:
      REQUIRE_CONSENT=true
    Then clients must send header:
      x-vigil-consent: accepted
    """
    require = os.getenv("REQUIRE_CONSENT", "false").lower() == "true"
    if not require:
        return

    consent = request.headers.get("x-vigil-consent")
    if consent != "accepted":
        raise HTTPException(
            status_code=403,
            detail="DPDP consent required",
        )

