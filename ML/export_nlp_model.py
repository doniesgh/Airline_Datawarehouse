"""Retrain the airline NLP sentiment model and persist all artifacts the
backend needs.

Run once after the notebook has been validated:

    python ML/export_nlp_model.py

Outputs (under backend/models/):
    nlp_tfidf.joblib   - fitted TF-IDF vectoriser
    nlp_clf.joblib     - LogisticRegression classifier
    nlp_rules.json     - aspects, complaint_rules, emotion_lex, churn_terms,
                         POSITIVE_KEYWORDS, NEGATIVE_KEYWORDS, classes_

Mirrors the training pipeline of ML/Airline_NLP.ipynb so the FastAPI
service stays a thin wrapper over the same artefacts.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, f1_score
from sklearn.model_selection import train_test_split


ASPECTS = {
    "food":         ["food", "meal", "snack", "drink", "beverage", "catering"],
    "delays":       ["delay", "delayed", "late", "cancel", "cancelled", "canceled",
                     "reschedule", "missed", "waiting", "hold"],
    "staff":        ["staff", "crew", "attendant", "service", "agent", "desk",
                     "support", "help"],
    "seat_comfort": ["seat", "legroom", "leg room", "recline", "comfort", "cabin",
                     "space"],
    "baggage":      ["baggage", "bag", "luggage", "lost", "claim", "carry-on",
                     "carryon"],
    "check_in":     ["check-in", "check in", "boarding", "gate", "security", "tsa",
                     "counter"],
    "wifi":         ["wifi", "wi-fi", "internet", "connection", "online"],
}

COMPLAINT_RULES = {
    "delays_cancellations": ["delay", "delayed", "late", "cancel", "cancelled",
                             "canceled", "missed", "reschedule"],
    "baggage_issues":       ["baggage", "bag", "luggage", "lost", "claim", "damaged"],
    "staff_service":        ["rude", "staff", "crew", "attendant", "agent",
                             "support", "service", "help"],
    "seat_comfort":         ["seat", "legroom", "recline", "comfort", "space"],
    "check_in_boarding":    ["check-in", "check in", "boarding", "gate", "counter",
                             "security", "tsa"],
    "food_quality":         ["food", "meal", "snack", "drink", "beverage"],
    "wifi_entertainment":   ["wifi", "wi-fi", "internet", "entertainment", "tv"],
    "booking_refund":       ["booking", "booked", "reservation", "refund", "charge",
                             "fee", "price", "pricing"],
}

EMOTION_LEX = {
    "frustration": ["frustrat", "annoy", "upset", "fed up", "tired of", "irritat"],
    "anger":       ["angry", "furious", "mad", "rage", "pissed", "outrage"],
    "satisfaction":["happy", "pleased", "great", "amazing", "love", "excellent",
                    "awesome", "delight"],
    "stress":      ["stress", "anxious", "worried", "panic", "nervous", "pressure"],
}

CHURN_TERMS = [
    "never fly", "never again", "wont fly", "won't fly", "stop flying",
    "switch", "boycott", "cancel membership", "close account",
    "refund", "chargeback", "take my business", "lost my business",
]

POSITIVE_KEYWORDS = [
    "loyal customer", "loyalty", "love", "loved", "great", "excellent",
    "amazing", "friendly", "wonderful", "fantastic", "awesome", "delighted",
    "outstanding", "superb", "perfect", "best experience", "recommend",
    "thank you", "appreciate", "pleased",
]
NEGATIVE_KEYWORDS = [
    "disappointing", "disappointed", "terrible", "horrible", "awful",
    "worst", "ruined", "unhelpful", "rude", "frustrating", "annoying",
    "useless", "waste of money", "nightmare", "appalling", "ridiculous",
]


def clean_text(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r"http\S+|www\S+", " ", text)
    text = re.sub(r"@\w+", " ", text)
    text = re.sub(r"#", " ", text)
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def load_corpus(data_dir: Path) -> pd.DataFrame:
    reviews_path = data_dir / "AirlineReviews.csv"
    tweets_path = data_dir / "Tweets.csv"
    if not reviews_path.exists() or not tweets_path.exists():
        raise FileNotFoundError(f"Missing CSVs in {data_dir}")

    df_reviews = pd.read_csv(reviews_path, low_memory=False)
    df_tweets = pd.read_csv(tweets_path, low_memory=False)

    text_cols = [c for c in ["Title", "Review"] if c in df_reviews.columns]
    df_reviews["text"] = (df_reviews[text_cols].fillna("").astype(str)
                          .agg(" ".join, axis=1).str.strip())
    score = pd.to_numeric(df_reviews.get("OverallScore"), errors="coerce")
    df_reviews["label"] = pd.cut(score, bins=[-1, 4, 6, 10],
                                 labels=["negative", "neutral", "positive"])
    rec = df_reviews.get("Recommended")
    if rec is not None:
        rec = rec.astype(str).str.lower()
        df_reviews.loc[df_reviews["label"].isna(), "label"] = rec.map(
            {"yes": "positive", "no": "negative"})
    df_reviews = df_reviews[["text", "label"]]

    df_tweets = df_tweets.rename(columns={"airline_sentiment": "label"})
    df_tweets["label"] = df_tweets["label"].astype(str).str.lower()
    df_tweets = df_tweets[df_tweets["label"].isin(["negative", "neutral", "positive"])]
    df_tweets["text"] = df_tweets["text"].astype(str)
    df_tweets = df_tweets[["text", "label"]]

    df = pd.concat([df_reviews, df_tweets], ignore_index=True)
    df["text"] = df["text"].fillna("").str.strip()
    df = df[df["text"].str.len() > 0].reset_index(drop=True)
    return df


def main() -> None:
    here = Path(__file__).resolve().parent
    project_root = here.parent
    data_dir = project_root / "data"
    out_dir = project_root / "backend" / "models"
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"[1/4] Loading corpus from {data_dir} ...")
    df = load_corpus(data_dir)
    print(f"      rows={len(df):,}  label distribution:\n{df['label'].value_counts()}")

    print("[2/4] Cleaning & splitting ...")
    df["text_clean"] = df["text"].map(clean_text)
    X = df["text_clean"]
    y = df["label"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print("[3/4] Fitting TF-IDF + LogisticRegression ...")
    tfidf = TfidfVectorizer(ngram_range=(1, 2), min_df=3, max_features=15000,
                            stop_words="english")
    X_train_vec = tfidf.fit_transform(X_train)
    X_test_vec = tfidf.transform(X_test)

    clf = LogisticRegression(max_iter=2000, class_weight="balanced")
    clf.fit(X_train_vec, y_train)

    y_pred = clf.predict(X_test_vec)
    print(f"      accuracy={accuracy_score(y_test, y_pred):.3f}  "
          f"f1_weighted={f1_score(y_test, y_pred, average='weighted'):.3f}")
    print(classification_report(y_test, y_pred))

    print(f"[4/4] Saving artifacts to {out_dir} ...")
    joblib.dump(tfidf, out_dir / "nlp_tfidf.joblib")
    joblib.dump(clf,   out_dir / "nlp_clf.joblib")
    rules = {
        "aspects":           ASPECTS,
        "complaint_rules":   COMPLAINT_RULES,
        "emotion_lex":       EMOTION_LEX,
        "churn_terms":       CHURN_TERMS,
        "positive_keywords": POSITIVE_KEYWORDS,
        "negative_keywords": NEGATIVE_KEYWORDS,
        "classes":           list(clf.classes_),
    }
    (out_dir / "nlp_rules.json").write_text(
        json.dumps(rules, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print("Done.")


if __name__ == "__main__":
    main()
