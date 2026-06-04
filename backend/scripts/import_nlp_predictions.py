"""Import data/nlp_predictions.csv into MongoDB collection ``nlp_feedback``.

Run once after the notebook has produced the CSV:

    python backend/scripts/import_nlp_predictions.py

Reuses backend/mongo_bridge.py for the connection so the same MONGO_URI /
MONGO_DB env vars apply.
"""
from __future__ import annotations

import math
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
BACKEND_DIR = HERE.parent
PROJECT_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

import mongo_bridge  # noqa: E402

CSV_PATH = PROJECT_ROOT / "data" / "nlp_predictions.csv"
COLLECTION = "nlp_feedback"
BATCH = 2000

ASPECT_COLS = [
    "aspect_food", "aspect_delays", "aspect_staff", "aspect_seat_comfort",
    "aspect_baggage", "aspect_check_in", "aspect_wifi",
]


def _bool(v) -> bool:
    if isinstance(v, bool):
        return v
    s = str(v).strip().lower()
    return s in ("true", "1", "yes", "y")


def _sanitize(rec: dict) -> dict:
    """Replace NaT, NaN and pandas NA with None so pymongo can encode the doc."""
    out = {}
    for k, v in rec.items():
        if v is None:
            out[k] = None
        elif isinstance(v, float) and math.isnan(v):
            out[k] = None
        elif isinstance(v, pd.Timestamp):
            out[k] = v.to_pydatetime() if not pd.isna(v) else None
        else:
            try:
                if pd.isna(v):
                    out[k] = None
                    continue
            except (TypeError, ValueError):
                pass
            out[k] = v
    return out


def main(drop_first: bool = True) -> None:
    if not CSV_PATH.exists():
        raise FileNotFoundError(
            f"{CSV_PATH} not found. Run the NLP notebook export cell first."
        )

    print(f"[1/3] Reading {CSV_PATH} ...")
    df = pd.read_csv(CSV_PATH, low_memory=False)
    print(f"      rows={len(df):,}  cols={len(df.columns)}")

    for c in ASPECT_COLS:
        if c in df.columns:
            df[c] = df[c].map(_bool)
    if "churn_signal" in df.columns:
        df["churn_signal"] = df["churn_signal"].map(_bool)
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce")

    db = mongo_bridge._get_db()
    col = db[COLLECTION]
    if drop_first:
        print(f"[2/3] Dropping existing {COLLECTION} ...")
        col.drop()

    print(f"[3/3] Inserting in batches of {BATCH} ...")
    records = df.to_dict(orient="records")
    total = 0
    for i in range(0, len(records), BATCH):
        chunk = [_sanitize(r) for r in records[i:i + BATCH]]
        col.insert_many(chunk, ordered=False)
        total += len(chunk)
        print(f"      inserted {total:,}/{len(records):,}")

    col.create_index("pred_sentiment")
    col.create_index("airline")
    col.create_index("churn_signal")
    col.create_index("user_id")
    col.create_index("date")
    print("Done. Indexes created on pred_sentiment, airline, churn_signal, user_id, date.")


if __name__ == "__main__":
    main()
