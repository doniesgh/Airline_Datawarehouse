"""Import data/loyalty_predictions.csv into MongoDB collection
``loyalty_customers``. Re-runnable: drops and re-creates the collection.

Run after ML/export_loyalty_models.py has produced the CSV.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
BACKEND_DIR = HERE.parent
PROJECT_ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

import mongo_bridge  # noqa: E402

CSV_PATH = PROJECT_ROOT / "data" / "loyalty_predictions.csv"
COLLECTION = "loyalty_customers"
BATCH = 2000


def _sanitize(rec: dict) -> dict:
    out = {}
    for k, v in rec.items():
        if v is None:
            out[k] = None
        elif isinstance(v, float) and math.isnan(v):
            out[k] = None
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
            f"{CSV_PATH} not found. Run: python ML/export_loyalty_models.py"
        )

    print(f"[1/3] Reading {CSV_PATH} ...")
    df = pd.read_csv(CSV_PATH, low_memory=False)
    print(f"      rows={len(df):,}  cols={len(df.columns)}")

    if "IsChurned" in df.columns:
        df["IsChurned"] = df["IsChurned"].fillna(0).astype(int)
    for c in ("CLV", "CLV_predicted", "churn_proba"):
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")

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

    col.create_index("SK_Customer")
    col.create_index("LoyaltyCard")
    col.create_index([("churn_proba", -1)])
    col.create_index([("CLV", -1)])
    col.create_index("risk_tier")
    col.create_index("segment")
    print("Done.")


if __name__ == "__main__":
    main()
