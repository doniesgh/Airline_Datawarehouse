"""NLP service: thin wrapper around the trained sentiment model.

Loads artifacts produced by ML/export_nlp_model.py and exposes a single
``analyze(text)`` function whose output mirrors the notebook so the
frontend can render identical breakdowns.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

import joblib
import numpy as np


MODELS_DIR = Path(__file__).resolve().parent / "models"

_tfidf = None
_clf = None
_rules: dict[str, Any] = {}
_classes: list[str] = []


def _load() -> None:
    global _tfidf, _clf, _rules, _classes
    if _tfidf is not None:
        return
    tfidf_path = MODELS_DIR / "nlp_tfidf.joblib"
    clf_path = MODELS_DIR / "nlp_clf.joblib"
    rules_path = MODELS_DIR / "nlp_rules.json"
    if not tfidf_path.exists() or not clf_path.exists() or not rules_path.exists():
        raise FileNotFoundError(
            f"NLP artifacts missing in {MODELS_DIR}. "
            "Run: python ML/export_nlp_model.py"
        )
    _tfidf = joblib.load(tfidf_path)
    _clf = joblib.load(clf_path)
    _rules = json.loads(rules_path.read_text(encoding="utf-8"))
    _classes = _rules.get("classes") or list(_clf.classes_)


def is_ready() -> bool:
    try:
        _load()
        return True
    except FileNotFoundError:
        return False


_CONTRAST_SPLIT = re.compile(
    r"(?:[\.;!\?\n]+)|(?:,?\s*\b(?:but|however|although|though|yet|whereas|"
    r"while|despite|even though|on the other hand)\b\s*)",
    flags=re.IGNORECASE,
)


def clean_text(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r"http\S+|www\S+", " ", text)
    text = re.sub(r"@\w+", " ", text)
    text = re.sub(r"#", " ", text)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def split_clauses(text: str) -> list[str]:
    parts = _CONTRAST_SPLIT.split(str(text))
    return [p.strip() for p in parts if p and p.strip()]


def _has_phrase(cleaned: str, phrase: str) -> bool:
    if " " in phrase:
        return phrase in cleaned
    return re.search(r"\b" + re.escape(phrase) + r"\b", cleaned) is not None


def _has_any(cleaned: str, phrases: list[str]) -> bool:
    return any(_has_phrase(cleaned, p) for p in phrases)


def detect_churn(cleaned: str) -> bool:
    terms = _rules.get("churn_terms", [])
    if not terms:
        return False
    pat = "|".join(re.escape(t) for t in terms)
    return bool(re.search(pat, cleaned))


def detect_aspects(cleaned: str) -> list[str]:
    found = []
    for name, keywords in _rules.get("aspects", {}).items():
        pattern = r"(?:\b" + "|".join(re.escape(w) for w in keywords) + r"\b)"
        if re.search(pattern, cleaned):
            found.append(name)
    return found


def detect_emotion(cleaned: str) -> str:
    lex = _rules.get("emotion_lex", {})
    scores = {emo: sum(1 for k in keys if k in cleaned) for emo, keys in lex.items()}
    if not scores:
        return "neutral"
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "neutral"


def classify_complaint(cleaned: str) -> str:
    for cat, keys in _rules.get("complaint_rules", {}).items():
        for k in keys:
            if k in cleaned:
                return cat
    return "other"


def predict_sentiment(raw_clause: str) -> tuple[str, float, str, bool]:
    """Return (sentiment, confidence, cleaned_text, is_churn).

    Rule-based overrides (churn/negative > positive) on top of TF-IDF model
    so short clauses keep their semantic verdict even when model signal is weak.
    """
    _load()
    cleaned = clean_text(raw_clause)
    if not cleaned:
        return "neutral", 0.0, cleaned, False

    vec = _tfidf.transform([cleaned])
    pred = _clf.predict(vec)[0]
    conf = float(np.max(_clf.predict_proba(vec)[0]))

    is_churn = detect_churn(cleaned)
    has_neg = _has_any(cleaned, _rules.get("negative_keywords", []))
    has_pos = _has_any(cleaned, _rules.get("positive_keywords", []))

    if is_churn or has_neg:
        if pred != "negative":
            pred = "negative"
            conf = 0.95 if is_churn else 0.90
    elif has_pos:
        if pred != "positive":
            pred = "positive"
            conf = 0.90

    return pred, conf, cleaned, is_churn


def recommend_actions(
    sentiment: str,
    aspects_negative: set[str],
    churn_signal: bool,
    travel_type: str | None = None,
) -> list[str]:
    actions: list[str] = []
    if sentiment == "negative":
        if "delays" in aspects_negative:
            actions.append("Offer delay compensation and proactive rebooking")
        if "baggage" in aspects_negative:
            actions.append("Provide baggage tracking and priority handling")
        if "staff" in aspects_negative:
            actions.append("Service recovery follow-up and staff coaching")
        if "check_in" in aspects_negative:
            actions.append("Streamline check-in and boarding support")
        if "wifi" in aspects_negative:
            actions.append("Wi-Fi credit or connectivity fix")
        if "food" in aspects_negative:
            actions.append("Meal or voucher compensation")
        if "seat_comfort" in aspects_negative:
            actions.append("Seat comfort fix or seat upgrade credit")
    else:
        actions.append("Invite to loyalty program or add bonus points")
        if "seat_comfort" in aspects_negative:
            actions.append("Suggest premium seat upgrade")
        if "wifi" in aspects_negative:
            actions.append("Offer premium Wi-Fi package")

    if churn_signal:
        actions.append("Priority retention outreach")

    if travel_type and "business" in str(travel_type).lower():
        actions.append("Offer lounge access and flexible ticket options")

    if not actions:
        actions.append("General service follow-up")
    return actions


def analyze(text: str, travel_type: str | None = None) -> dict[str, Any]:
    """Full breakdown: overall, mixed flag, per-aspect verdict, per-clause table,
    emotion, complaint, churn, recommendations. Mirrors the notebook output."""
    _load()
    if not text or not str(text).strip():
        raise ValueError("text is empty")

    overall_pred, overall_conf, full_clean, full_churn = predict_sentiment(text)
    overall_emotion = detect_emotion(full_clean)
    overall_complaint = (
        classify_complaint(full_clean) if overall_pred == "negative" else "none"
    )

    clauses_raw = split_clauses(text)
    clause_rows: list[dict[str, Any]] = []
    aspect_buckets: dict[str, dict[str, list[str]]] = {}

    for cl in clauses_raw:
        sent, conf, cleaned, is_churn = predict_sentiment(cl)
        asp = detect_aspects(cleaned)
        clause_rows.append({
            "clause":     cl,
            "sentiment":  sent,
            "confidence": round(conf, 3),
            "aspects":    asp,
            "churn":      is_churn,
        })
        for a in asp:
            aspect_buckets.setdefault(a, {"positive": [], "negative": [], "neutral": []})
            aspect_buckets[a][sent].append(cl)

    churn_signal = full_churn or any(r["churn"] for r in clause_rows)
    clause_sents = {r["sentiment"] for r in clause_rows}
    is_mixed = "positive" in clause_sents and "negative" in clause_sents
    overall_verdict = "mixed" if is_mixed else overall_pred

    aspect_verdict: dict[str, str] = {}
    for a, buckets in aspect_buckets.items():
        has_pos = bool(buckets["positive"])
        has_neg = bool(buckets["negative"])
        if has_pos and has_neg:
            aspect_verdict[a] = "mixed"
        elif has_pos:
            aspect_verdict[a] = "positive"
        elif has_neg:
            aspect_verdict[a] = "negative"
        else:
            aspect_verdict[a] = "neutral"

    aspects_negative = {a for a, v in aspect_verdict.items() if v in ("negative", "mixed")}
    effective_sent = "negative" if aspects_negative else overall_pred
    recommendations = recommend_actions(
        effective_sent, aspects_negative, churn_signal, travel_type
    )

    return {
        "input":              text,
        "overall_sentiment":  overall_verdict,
        "model_sentiment":    overall_pred,
        "confidence":         round(overall_conf, 3),
        "is_mixed":           is_mixed,
        "aspect_verdict":     aspect_verdict,
        "clauses":            clause_rows,
        "emotion":            overall_emotion,
        "complaint_category": overall_complaint,
        "churn_signal":       churn_signal,
        "recommendations":    recommendations,
    }
