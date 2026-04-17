"""
BTE ML Model — Gradient Boosting (XGBoost-style) for Trust Score
Falls back to heuristic BTE if model not trained.
"""

import os
from pathlib import Path

try:
    from sklearn.ensemble import GradientBoostingRegressor
    import numpy as np
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

MODEL_PATH = Path(__file__).parent.parent / "models" / "bte_model.pkl"
FEATURE_ORDER = [
    "accelerometer_variance",
    "gyroscope_rotation_events",
    "step_count_delta",
    "cell_tower_handoff_count",
    "wifi_home_ssid_detected",
    "signal_strength_variance",
    "app_foreground",
    "battery_drain_rate",
    "screen_interaction_count",
    "has_active_order",
    "last_order_minutes_ago",
]
_model = None


def _bundle_to_features(bundle) -> list[float]:
    return [
        bundle.accelerometer_variance,
        float(bundle.gyroscope_rotation_events),
        float(bundle.step_count_delta),
        float(bundle.cell_tower_handoff_count),
        float(bundle.wifi_home_ssid_detected),
        bundle.signal_strength_variance,
        float(bundle.app_foreground),
        bundle.battery_drain_rate,
        float(bundle.screen_interaction_count),
        float(bundle.has_active_order),
        float(bundle.last_order_minutes_ago),
    ]


def _load_model():
    global _model
    if _model is not None:
        return _model
    if not SKLEARN_AVAILABLE or not MODEL_PATH.exists():
        return None
    try:
        import joblib
        _model = joblib.load(MODEL_PATH)
        return _model
    except Exception:
        return None


def predict_trust_score(bundle) -> float | None:
    """Predict trust score (0-100) using ML model. Returns None if model unavailable."""
    model = _load_model()
    if model is None:
        return None
    X = np.array([_bundle_to_features(bundle)])
    pred = model.predict(X)[0]
    return max(0, min(100, float(pred)))


def train_synthetic_model():
    """Generate synthetic data and train model. Run: python -m backend.services.bte_ml"""
    if not SKLEARN_AVAILABLE:
        print("scikit-learn not installed")
        return
    import joblib

    np.random.seed(42)
    X = []
    y = []

    def add(acc_var, gyro, steps, handoff, wifi, sig_var, fg, drain, screen, order, mins, score):
        X.append([acc_var, gyro, steps, handoff, float(wifi), sig_var, float(fg), drain, screen, float(order), mins])
        y.append(score)

    for _ in range(500):
        add(0.1 + np.random.rand() * 0.2, 10 + int(np.random.rand() * 20), 30 + int(np.random.rand() * 50),
            2 + int(np.random.rand() * 4), False, 0.1 + np.random.rand() * 0.15, True, 0.05 + np.random.rand() * 0.1,
            10 + int(np.random.rand() * 20), True, np.random.rand() * 30, 70 + np.random.rand() * 30)
    for _ in range(300):
        add(0.001 + np.random.rand() * 0.005, 0, 0, 0, True, 0.01 + np.random.rand() * 0.03,
            False, 0.005 + np.random.rand() * 0.02, int(np.random.rand() * 5), False, 100 + np.random.rand() * 100,
            np.random.rand() * 35)
    for _ in range(200):
        add(0.002 + np.random.rand() * 0.01, 0, 0, 0, True, 0.01, False, 0.002, 0, False, 200, 10 + np.random.rand() * 25)

    X = np.array(X)
    y = np.array(y)
    model = GradientBoostingRegressor(n_estimators=50, max_depth=4, random_state=42)
    model.fit(X, y)
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"Model saved to {MODEL_PATH}")


if __name__ == "__main__":
    train_synthetic_model()
