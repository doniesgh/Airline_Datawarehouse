"""Loyalty service: live churn + CLV scoring and action recommendation.

Loads the joblibs produced by ML/export_loyalty_models.py and exposes:
    is_ready()                       -> bool
    score(features: dict)            -> {clv_predicted, churn_proba, risk_tier, action}
    recommend_action(clv, proba)     -> str
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd

MODELS_DIR = Path(__file__).resolve().parent / "models" / "loyalty"

_churn_model = None
_churn_meta: dict = {}
_clv_model = None
_clv_calibrator = None
_clv_meta: dict = {}


def _load() -> None:
    global _churn_model, _churn_meta, _clv_model, _clv_calibrator, _clv_meta
    if _churn_model is not None:
        return
    required = ["churn_model.joblib", "churn_meta.joblib",
                "clv_model.joblib", "clv_calibrator.joblib", "clv_meta.joblib"]
    for f in required:
        if not (MODELS_DIR / f).exists():
            raise FileNotFoundError(
                f"Loyalty artifacts missing in {MODELS_DIR}. "
                "Run: python ML/export_loyalty_models.py"
            )
    _churn_model    = joblib.load(MODELS_DIR / "churn_model.joblib")
    _churn_meta     = joblib.load(MODELS_DIR / "churn_meta.joblib")
    _clv_model      = joblib.load(MODELS_DIR / "clv_model.joblib")
    _clv_calibrator = joblib.load(MODELS_DIR / "clv_calibrator.joblib")
    _clv_meta       = joblib.load(MODELS_DIR / "clv_meta.joblib")


def is_ready() -> bool:
    try:
        _load()
        return True
    except FileNotFoundError:
        return False


def _encode(row: dict, meta: dict) -> pd.DataFrame:
    encoders = meta["encoders"]
    out = {c: row.get(c, 0) or 0 for c in meta["num_features"]}
    for c in meta["cat_features"]:
        le = encoders[c]
        v = str(row.get(c) or "Unknown")
        if v not in set(le.classes_):
            v = "Unknown"
        out[f"{c}_enc"] = int(le.transform([v])[0])
    df = pd.DataFrame([out])
    return df[meta["features"]]


def predict_churn(row: dict) -> float:
    _load()
    X = _encode(row, _churn_meta)
    return float(_churn_model.predict_proba(X)[0, 1])


def predict_clv(row: dict) -> float:
    _load()
    X = _encode(row, _clv_meta)
    raw = max(1.0, float(np.expm1(_clv_model.predict(X)[0])))
    return float(_clv_calibrator.predict([raw])[0])


def risk_tier(p: float) -> str:
    if p >= 0.66: return "high"
    if p >= 0.33: return "medium"
    return "low"


def recommend_action(clv_predicted: float, churn_proba: float,
                     clv_actual: float | None = None) -> str:
    clv = clv_actual if clv_actual and clv_actual > 0 else clv_predicted
    tier = risk_tier(churn_proba)
    if tier == "high" and clv >= 9000:
        return "Priority retention call — high-value churn risk"
    if tier == "high":
        return "Send personalised win-back offer"
    if tier == "medium" and clv >= 10000:
        return "VIP outreach + bonus points"
    if tier == "medium":
        return "Re-engagement email + double-points week"
    if clv >= 10000:
        return "Upgrade to Aurora — premium benefits"
    return "Newsletter + targeted promotions"


def score(features: dict) -> dict[str, Any]:
    """One-shot scoring of a customer payload."""
    _load()
    clv_pred = predict_clv(features)
    proba    = predict_churn(features)
    tier     = risk_tier(proba)
    return {
        "clv_predicted": round(clv_pred, 2),
        "churn_proba":   round(proba, 3),
        "risk_tier":     tier,
        "recommended_action": recommend_action(clv_pred, proba, features.get("CLV")),
    }
