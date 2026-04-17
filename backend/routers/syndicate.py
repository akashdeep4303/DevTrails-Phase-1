"""
Syndicate detection API — temporal clustering, device fingerprint graph,
staggered trigger detection, behavioral baseline
"""

from datetime import datetime, timedelta
from collections import defaultdict

from fastapi import APIRouter, Request
from routers.deps import require_dpdp_consent

router = APIRouter()


def _parse_claimed_at(c: dict) -> datetime:
    return datetime.fromisoformat(c.get("claimed_at", "")) if c.get("claimed_at") else datetime.min


@router.get("/insights")
def syndicate_insights(request: Request, window_minutes: int = 30):
    """Detect claim clustering, staggered triggers, behavioral baseline."""
    require_dpdp_consent(request)
    store = getattr(request.app.state, "claim_store", [])
    if not store:
        return {
            "total_claims": 0,
            "clusters": [],
            "staggered_triggers": [],
            "behavioral_baseline_flags": [],
            "ssi_risk": 0,
            "device_fingerprints": {},
        }

    cutoff = datetime.utcnow() - timedelta(minutes=window_minutes)
    recent = sorted(
        [c for c in store if _parse_claimed_at(c) > cutoff],
        key=_parse_claimed_at,
    )

    # 1. Temporal clustering: claims within 90 seconds
    clusters = []
    used = set()
    for i, c in enumerate(recent):
        if i in used:
            continue
        t = _parse_claimed_at(c)
        cluster = [c]
        used.add(i)
        for j, d in enumerate(recent):
            if j in used:
                continue
            td = _parse_claimed_at(d)
            if abs((t - td).total_seconds()) <= 90:
                cluster.append(d)
                used.add(j)
        if len(cluster) >= 3:
            clusters.append({
                "size": len(cluster),
                "window_seconds": 90,
                "workers": list({x.get("worker_id", "") for x in cluster}),
                "device_fingerprints": list({x.get("device_fp", "unknown") for x in cluster}),
            })

    # 2. Staggered trigger detection: claims ~30 mins apart (syndicate evading burst detection)
    staggered = []
    for i in range(len(recent) - 2):
        t0 = _parse_claimed_at(recent[i])
        t1 = _parse_claimed_at(recent[i + 1])
        t2 = _parse_claimed_at(recent[i + 2])
        d1 = abs((t1 - t0).total_seconds() - 30 * 60)  # ~30 min
        d2 = abs((t2 - t1).total_seconds() - 30 * 60)
        if d1 < 5 * 60 and d2 < 5 * 60:  # within 5 min of 30-min spacing
            low_trust = [
                recent[i].get("trust_score", 100) < 50,
                recent[i + 1].get("trust_score", 100) < 50,
                recent[i + 2].get("trust_score", 100) < 50,
            ]
            if all(low_trust):
                staggered.append({
                    "workers": [recent[i].get("worker_id"), recent[i + 1].get("worker_id"), recent[i + 2].get("worker_id")],
                    "spacing_minutes": 30,
                })

    # 3. Behavioral baseline: workers with repeated at-home-like claims over time
    worker_claims = {}
    for c in store:
        wid = c.get("worker_id", "")
        if wid not in worker_claims:
            worker_claims[wid] = []
        worker_claims[wid].append(c)
    baseline_flags = []
    for wid, claims in worker_claims.items():
        if len(claims) < 2:
            continue
        at_home_like = sum(
            1 for c in claims
            if c.get("trust_score", 100) < 50  # low trust = likely sedentary
        )
        if at_home_like >= 2 and at_home_like == len(claims):
            baseline_flags.append({
                "worker_id": wid,
                "claim_count": len(claims),
                "pattern": "repeated_at_home_claim_pattern",
            })

    # Device fingerprint frequency
    fps = {}
    for c in recent:
        fp = c.get("device_fp", "unknown")
        fps[fp] = fps.get(fp, 0) + 1
    suspicious_fps = {k: v for k, v in fps.items() if v >= 3}

    # Graph: co-occurrence edges between device_fingerprint nodes
    edge_weights: dict[tuple[str, str], int] = {}
    for cl in clusters:
        fps_in_cluster = cl.get("device_fingerprints", [])
        uniq = sorted(set(fps_in_cluster))
        for i in range(len(uniq)):
            for j in range(i + 1, len(uniq)):
                a = uniq[i]
                b = uniq[j]
                edge_weights[(a, b)] = edge_weights.get((a, b), 0) + 1

    edges = [
        {"from": a, "to": b, "weight": w}
        for (a, b), w in sorted(edge_weights.items(), key=lambda kv: kv[1], reverse=True)[:20]
    ]
    nodes = sorted(set(fps.keys()))

    ssi_risk = min(
        1.0,
        len(clusters) * 0.3
        + len(suspicious_fps) * 0.2
        + len(staggered) * 0.2
        + len(baseline_flags) * 0.15,
    )

    return {
        "total_claims": len(recent),
        "clusters": clusters,
        "staggered_triggers": staggered,
        "behavioral_baseline_flags": baseline_flags,
        "suspicious_fingerprints": suspicious_fps,
        "ssi_risk": round(ssi_risk, 2),
        "device_fingerprints": dict(list(fps.items())[:20]),
        "graph": {"nodes": nodes, "edges": edges},
    }


@router.get("/behavioral-analysis")
def behavioral_analysis(request: Request, window_days: int = 30):
    """
    Compare individual worker behavior against aggregate baselines.
    Useful for identifying outliers not visible in aggregate-only views.
    """
    require_dpdp_consent(request)
    store = getattr(request.app.state, "claim_store", [])
    if not store:
        return {
            "window_days": int(window_days),
            "aggregate": {
                "workers": 0,
                "claims": 0,
                "avg_trust_score": 0.0,
                "low_trust_rate": 0.0,
                "instant_rate": 0.0,
            },
            "individual": [],
            "outliers": [],
        }

    cutoff = datetime.utcnow() - timedelta(days=int(window_days))
    recent = []
    for c in store:
        ts = _parse_claimed_at(c)
        if ts > cutoff:
            recent.append(c)

    if not recent:
        return {
            "window_days": int(window_days),
            "aggregate": {
                "workers": 0,
                "claims": 0,
                "avg_trust_score": 0.0,
                "low_trust_rate": 0.0,
                "instant_rate": 0.0,
            },
            "individual": [],
            "outliers": [],
        }

    by_worker: dict[str, list[dict]] = defaultdict(list)
    for c in recent:
        by_worker[str(c.get("worker_id", "unknown"))].append(c)

    total = len(recent)
    avg_trust = sum(float(c.get("trust_score", 0) or 0) for c in recent) / max(1, total)
    low_trust_rate = sum(1 for c in recent if float(c.get("trust_score", 100) or 100) < 50) / max(1, total)
    instant_rate = sum(1 for c in recent if str(c.get("tier", "")) == "instant") / max(1, total)

    individual = []
    for wid, claims in by_worker.items():
        n = len(claims)
        w_avg = sum(float(c.get("trust_score", 0) or 0) for c in claims) / max(1, n)
        w_low = sum(1 for c in claims if float(c.get("trust_score", 100) or 100) < 50) / max(1, n)
        w_instant = sum(1 for c in claims if str(c.get("tier", "")) == "instant") / max(1, n)
        fps = {str(c.get("device_fp", "unknown")) for c in claims}
        individual.append(
            {
                "worker_id": wid,
                "claims": n,
                "avg_trust_score": round(w_avg, 2),
                "low_trust_rate": round(w_low, 3),
                "instant_rate": round(w_instant, 3),
                "device_fingerprint_diversity": len(fps),
                "delta_vs_aggregate": {
                    "trust": round(w_avg - avg_trust, 2),
                    "low_trust_rate": round(w_low - low_trust_rate, 3),
                    "instant_rate": round(w_instant - instant_rate, 3),
                },
            }
        )

    # Heuristic outlier flags:
    # - sustained low trust with enough samples
    # - far lower trust than population
    outliers = [
        x for x in individual
        if (x["claims"] >= 3 and x["low_trust_rate"] >= 0.66)
        or (x["claims"] >= 3 and x["delta_vs_aggregate"]["trust"] <= -20)
    ]
    outliers = sorted(outliers, key=lambda x: (x["low_trust_rate"], -x["avg_trust_score"]), reverse=True)
    individual = sorted(individual, key=lambda x: x["claims"], reverse=True)

    return {
        "window_days": int(window_days),
        "aggregate": {
            "workers": len(by_worker),
            "claims": total,
            "avg_trust_score": round(avg_trust, 2),
            "low_trust_rate": round(low_trust_rate, 3),
            "instant_rate": round(instant_rate, 3),
        },
        "individual": individual[:100],
        "outliers": outliers[:20],
    }
