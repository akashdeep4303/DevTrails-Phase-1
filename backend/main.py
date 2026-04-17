"""
VIGIL — FastAPI Backend
Behavioral Trust Engine, Weather Oracle, Claim Validator
"""

from contextlib import asynccontextmanager
from datetime import datetime
import asyncio
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import claims, weather, signals, syndicate, workers, policies, premium, triggers, mock_apis, analytics
from services.persistence import load_persisted_claims
from services.monitoring import monitoring_loop

# In-memory stores for prototype (replace with DB/graph store in production)
claim_store: list[dict] = load_persisted_claims(limit=500)
signal_packet_store: list[dict] = []
worker_store: list[dict] = []
policy_store: list[dict] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.claim_store = claim_store
    app.state.signal_packet_store = signal_packet_store
    app.state.worker_store = worker_store
    app.state.policy_store = policy_store
    app.state.monitoring_stats = {
        "running": False,
        "enabled": False,
        "last_run_at": None,
        "last_success_at": None,
        "last_error": None,
        "iterations": 0,
        "policies_scanned": 0,
        "claims_triggered": 0,
    }
    monitor_task: asyncio.Task | None = None
    enable_scheduler = os.getenv("ENABLE_TRIGGER_SCHEDULER", "true").lower() == "true"
    if enable_scheduler:
        monitor_task = asyncio.create_task(monitoring_loop(app))
    yield
    if monitor_task is not None:
        monitor_task.cancel()
        try:
            await monitor_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="VIGIL API",
    description="Verified Intelligence for Gig Insurance Legitimacy",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    # If you're using Next.js rewrites (`/api/*`) you usually don't need
    # CORS, but this keeps the API safe to call directly too.
    #
    # Configure in Render:
    #   CORS_ALLOW_ORIGINS="https://your-frontend.vercel.app,http://localhost:3000"
    # Or for rapid testing:
    #   CORS_ALLOW_ORIGINS="*"
    allow_origins=[
        o.strip()
        for o in os.getenv(
            "CORS_ALLOW_ORIGINS", "*"
        ).split(",")
        if o.strip()
    ],
    allow_credentials=os.getenv("CORS_ALLOW_CREDENTIALS", "false").lower()
    == "true" and os.getenv("CORS_ALLOW_ORIGINS", "*").strip() != "*",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(claims.router, prefix="/api/claims", tags=["Claims"])
app.include_router(weather.router, prefix="/api/weather", tags=["Weather"])
app.include_router(signals.router, prefix="/api/signals", tags=["Signals"])
app.include_router(syndicate.router, prefix="/api/syndicate", tags=["Syndicate"])
app.include_router(workers.router, prefix="/api/workers", tags=["Workers"])
app.include_router(policies.router, prefix="/api/policies", tags=["Policies"])
app.include_router(premium.router, prefix="/api/premium", tags=["Premium"])
app.include_router(triggers.router, prefix="/api/triggers", tags=["Triggers"])
app.include_router(mock_apis.router, prefix="/api/mock", tags=["Mock APIs"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])


@app.get("/")
def root():
    return {
        "name": "VIGIL API",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/health")
def health():
    return {"status": "ok"}
