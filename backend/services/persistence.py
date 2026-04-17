"""
Graph persistence layer (Neo4j / Amazon Neptune)

This prototype keeps an in-memory list as the source of truth, but when a
graph backend is configured it will:
  - load previously persisted claims on startup
  - upsert claim records on creation/update

Configuration (examples):
  PERSISTENCE_BACKEND=neo4j
  NEO4J_URI=bolt://localhost:7687
  NEO4J_USER=neo4j
  NEO4J_PASSWORD=secret

  PERSISTENCE_BACKEND=neptune
  NEPTUNE_SPARQL_ENDPOINT=http://localhost:1337/sparql

If connection fails, the code falls back to in-memory behavior.
"""

from __future__ import annotations

import json
import os
from typing import Any

import httpx


def _safe_float_env(name: str, default: float) -> float:
    raw = os.getenv(name, str(default))
    try:
        return float(raw)
    except (TypeError, ValueError):
        return default


def _flatten_props(record: dict[str, Any]) -> dict[str, Any]:
    """
    Make a best-effort attempt to store everything as scalar JSON strings.
    """
    out: dict[str, Any] = {}
    for k, v in record.items():
        if isinstance(v, (dict, list)):
            out[k] = json.dumps(v)
        else:
            out[k] = v
    return out


def _neo4j_connector_available() -> bool:
    try:
        import neo4j  # noqa: F401

        return True
    except Exception:
        return False


def load_persisted_claims(limit: int = 200) -> list[dict[str, Any]]:
    backend = os.getenv("PERSISTENCE_BACKEND", "memory").lower()
    if backend == "neo4j":
        if not _neo4j_connector_available():
            return []
        try:
            from neo4j import GraphDatabase

            uri = os.getenv("NEO4J_URI", "")
            user = os.getenv("NEO4J_USER", "")
            pwd = os.getenv("NEO4J_PASSWORD", "")
            if not uri or not user:
                return []

            conn_timeout = max(0.5, _safe_float_env("NEO4J_CONNECT_TIMEOUT_SECONDS", 2.5))
            driver = GraphDatabase.driver(
                uri,
                auth=(user, pwd),
                connection_timeout=conn_timeout,
                connection_acquisition_timeout=conn_timeout,
            )
            query = """
            MATCH (c:Claim)
            RETURN c
            ORDER BY c.claimed_at DESC
            LIMIT $limit
            """
            with driver.session() as session:
                session.run("RETURN 1").consume()
                rows = session.run(query, limit=limit).data()
            driver.close()
            claims: list[dict[str, Any]] = []
            for r in rows:
                props = dict(r["c"])
                claims.append(props)
            return claims
        except Exception:
            return []
    elif backend == "neptune":
        # Minimal implementation: fetch recent claims.
        # If the SPARQL endpoint is not configured, return empty.
        endpoint = os.getenv("NEPTUNE_SPARQL_ENDPOINT", "").strip()
        if not endpoint:
            return []
        try:
            # We store properties as literal values on a Claim node.
            # This SELECT expects you to have created nodes already.
            # Use explicit URIs to avoid prefix ambiguity.
            claim_type = "<http://vigil/Claim>"
            q = f"""
            SELECT ?claim_id ?worker_id ?claimed_at ?trust_score ?tier ?device_fp ?payout_status
            WHERE {{
              ?c a {claim_type} ;
                 <http://vigil/claim_id> ?claim_id ;
                 <http://vigil/worker_id> ?worker_id ;
                 <http://vigil/claimed_at> ?claimed_at ;
                 <http://vigil/trust_score> ?trust_score ;
                 <http://vigil/tier> ?tier ;
                 <http://vigil/device_fp> ?device_fp ;
                 <http://vigil/payout_status> ?payout_status .
            }}
            ORDER BY DESC(?claimed_at)
            LIMIT {int(limit)}
            """
            r = httpx.get(
                endpoint,
                params={"query": q},
                timeout=5.0,
            )
            if r.status_code != 200:
                return []
            j = r.json()
            claims: list[dict[str, Any]] = []
            for b in j.get("results", {}).get("bindings", []):
                claims.append(
                    {
                        "claim_id": b.get("claim_id", {}).get("value"),
                        "worker_id": b.get("worker_id", {}).get("value"),
                        "claimed_at": b.get("claimed_at", {}).get("value"),
                        "trust_score": int(b.get("trust_score", {}).get("value", "0")),
                        "tier": b.get("tier", {}).get("value"),
                        "device_fp": b.get("device_fp", {}).get("value"),
                        "payout_status": b.get("payout_status", {}).get("value"),
                    }
                )
            return claims
        except Exception:
            return []

    return []


def persist_claim(record: dict[str, Any]) -> None:
    """
    Upsert a claim record into the configured graph backend.
    If backend is not configured, this is a no-op.
    """
    backend = os.getenv("PERSISTENCE_BACKEND", "memory").lower()
    claim_id = record.get("claim_id")
    if not claim_id:
        return

    if backend == "neo4j":
        if not _neo4j_connector_available():
            return
        try:
            from neo4j import GraphDatabase

            uri = os.getenv("NEO4J_URI", "")
            user = os.getenv("NEO4J_USER", "")
            pwd = os.getenv("NEO4J_PASSWORD", "")
            if not uri or not user:
                return

            conn_timeout = max(0.5, _safe_float_env("NEO4J_CONNECT_TIMEOUT_SECONDS", 2.5))
            driver = GraphDatabase.driver(
                uri,
                auth=(user, pwd),
                connection_timeout=conn_timeout,
                connection_acquisition_timeout=conn_timeout,
            )
            props = _flatten_props(record)
            props["claim_id"] = claim_id

            query = """
            MERGE (c:Claim {claim_id: $claim_id})
            SET c += $props
            """
            with driver.session() as session:
                session.run("RETURN 1").consume()
                session.run(query, claim_id=claim_id, props=props)
            driver.close()
        except Exception:
            return
    elif backend == "neptune":
        endpoint = os.getenv("NEPTUNE_SPARQL_ENDPOINT", "").strip()
        if not endpoint:
            return
        try:
            # Simple INSERT DATA (duplicates possible without a full upsert).
            # Production should use SPARQL upsert with DELETE/INSERT.
            def lit(x: Any) -> str:
                if x is None:
                    return '""'
                s = str(x).replace('"', '\\"')
                return f"\"{s}\""

            # We only persist a subset reliably for demo.
            sparql = f"""
            INSERT DATA {{
              <http://vigil/claim/{lit(claim_id)}>
                a <http://vigil/Claim> ;
                <http://vigil/claim_id> {lit(claim_id)} ;
                <http://vigil/worker_id> {lit(record.get('worker_id'))} ;
                <http://vigil/claimed_at> {lit(record.get('claimed_at'))} ;
                <http://vigil/trust_score> {lit(record.get('trust_score'))} ;
                <http://vigil/tier> {lit(record.get('tier'))} ;
                <http://vigil/device_fp> {lit(record.get('device_fp'))} ;
                <http://vigil/payout_status> {lit(record.get('payout_status'))} .
            }}
            """
            httpx.post(
                endpoint,
                headers={"Content-Type": "application/sparql-update"},
                content=sparql,
                timeout=5.0,
            )
        except Exception:
            return

