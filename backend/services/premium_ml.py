"""
Phase 2 — ML-style risk model for dynamic weekly premium (pure Python)

Why pure Python?
- This sandbox environment can crash on `import numpy` (exit 139), so we
  avoid heavy scientific deps entirely.
- We still meet the requirement by training an ML-style model (logistic
  regression with gradient descent) on synthetic data.
"""

from __future__ import annotations

from pathlib import Path
import json
import math
import random
from typing import Any


MODEL_PATH = Path(__file__).parent.parent / "models" / "premium_model.json"

# Features are intentionally simple so the demo runs fast and explainable.
FEATURE_ORDER = [
    "water_logging_risk",  # 0..1
    "predicted_rain_prob",  # 0..1
    "road_closure_prob",  # 0..1
    "income_loss_prob",  # 0..1
    "coverage_hours_per_day_pref",  # int
    "safe_zone",  # 0/1
]

_model: dict[str, Any] | None = None


def _clamp01(x: float) -> float:
    return max(0.0, min(1.0, float(x)))


def _features_to_vec(*, water_logging_risk: float, predicted_rain_prob: float, road_closure_prob: float, income_loss_prob: float, coverage_hours_per_day_pref: int, safe_zone: bool) -> list[float]:
    return [
        _clamp01(water_logging_risk),
        _clamp01(predicted_rain_prob),
        _clamp01(road_closure_prob),
        _clamp01(income_loss_prob),
        float(coverage_hours_per_day_pref),
        1.0 if safe_zone else 0.0,
    ]


def _sigmoid(z: float) -> float:
    # Clamp to avoid math overflow.
    if z >= 35:
        return 1.0
    if z <= -35:
        return 0.0
    return 1.0 / (1.0 + math.exp(-z))


def _load_model() -> dict[str, Any] | None:
    global _model
    if _model is not None:
        return _model
    if not MODEL_PATH.exists():
        return None
    try:
        _model = json.loads(MODEL_PATH.read_text(encoding="utf-8"))
        return _model
    except Exception:
        return None


def train_synthetic_premium_model(seed: int = 42) -> bool:
    """
    Trains a logistic-regression-like model using gradient descent.
    Output is a vector of coefficients + bias persisted to MODEL_PATH.
    """
    random.seed(seed)

    # Training hyperparams tuned for speed.
    learning_rate = 0.35
    l2_reg = 0.03
    epochs = 350
    n_samples = 1200

    # Coefficients for 6 features.
    w = [0.0] * len(FEATURE_ORDER)
    b = 0.0

    def predict(x_vec: list[float]) -> float:
        z = b
        for i in range(len(w)):
            z += w[i] * x_vec[i]
        return _sigmoid(z)

    def loss_grad(y_hat: float, y: float) -> float:
        # For sigmoid with squared error, d/dz = (y_hat - y) * y_hat * (1-y_hat)
        return (y_hat - y) * y_hat * (1.0 - y_hat)

    for _ in range(epochs):
        # SGD-ish: shuffle samples each epoch.
        indices = list(range(n_samples))
        random.shuffle(indices)

        # Accumulate gradients.
        for idx in indices:
            water_logging_risk = random.random()
            predicted_rain_prob = random.random()
            road_closure_prob = random.random()
            income_loss_prob = random.random()
            coverage_hours_pref = random.randint(2, 7)
            safe_zone = random.random() > 0.62

            risk_base = (
                0.55 * water_logging_risk
                + 0.35 * predicted_rain_prob
                + 0.25 * road_closure_prob
                + 0.25 * income_loss_prob
            )
            if safe_zone:
                risk_base -= 0.07
            coverage_cost = (coverage_hours_pref - 3) * 0.06

            noise = random.gauss(0.0, 0.03)
            target = max(0.0, min(1.0, risk_base + coverage_cost + noise))

            x_vec = _features_to_vec(
                water_logging_risk=water_logging_risk,
                predicted_rain_prob=predicted_rain_prob,
                road_closure_prob=road_closure_prob,
                income_loss_prob=income_loss_prob,
                coverage_hours_per_day_pref=coverage_hours_pref,
                safe_zone=safe_zone,
            )

            y_hat = predict(x_vec)
            dz = loss_grad(y_hat, target)

            # L2 regularization.
            for i in range(len(w)):
                grad = dz * x_vec[i] + l2_reg * w[i]
                w[i] -= learning_rate * grad
            b -= learning_rate * dz

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "model_type": "tiny_logreg_gd",
        "seed": seed,
        "weights": w,
        "bias": b,
    }
    MODEL_PATH.write_text(json.dumps(payload), encoding="utf-8")

    return True


def predict_risk_score(
    *,
    water_logging_risk: float,
    predicted_rain_prob: float,
    road_closure_prob: float,
    income_loss_prob: float,
    coverage_hours_per_day_pref: int,
    safe_zone: bool,
) -> tuple[float | None, str]:
    """
    Returns:
      - risk score in 0..1
      - model_name
    """
    model = _load_model()
    if model is None:
        return None, "heuristic"

    x_vec = _features_to_vec(
        water_logging_risk=water_logging_risk,
        predicted_rain_prob=predicted_rain_prob,
        road_closure_prob=road_closure_prob,
        income_loss_prob=income_loss_prob,
        coverage_hours_per_day_pref=coverage_hours_per_day_pref,
        safe_zone=safe_zone,
    )

    w = model.get("weights") or []
    b = float(model.get("bias") or 0.0)
    z = b
    for i in range(min(len(w), len(x_vec))):
        z += float(w[i]) * float(x_vec[i])
    pred = _sigmoid(z)
    pred = max(0.0, min(1.0, float(pred)))

    model_name = str(model.get("model_type") or "tiny_logreg_gd")
    return pred, model_name


def heuristic_risk_score(
    *,
    water_logging_risk: float,
    predicted_rain_prob: float,
    road_closure_prob: float,
    income_loss_prob: float,
    coverage_hours_per_day_pref: int,
    safe_zone: bool,
) -> float:
    # Deterministic rule-based score (0..1).
    score = (
        0.4 * water_logging_risk
        + 0.35 * predicted_rain_prob
        + 0.15 * road_closure_prob
        + 0.10 * income_loss_prob
    )
    if safe_zone:
        score -= 0.07
    score += max(0, coverage_hours_per_day_pref - 3) * 0.02
    return max(0.0, min(1.0, score))

