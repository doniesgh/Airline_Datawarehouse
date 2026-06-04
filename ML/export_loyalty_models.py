"""Train churn + CLV models from DWH_DB and export everything the backend
needs to serve loyalty intelligence.

Run once (same machine as the SQL Server hosting DWH_DB):

    python ML/export_loyalty_models.py

Outputs (under backend/models/loyalty/):
    churn_model.joblib       - XGBoost classifier (post-SMOTE)
    churn_meta.joblib        - {features, cat_features, encoders, version}
    clv_model.joblib         - GradientBoostingRegressor on log(1+CLV)
    clv_calibrator.joblib    - IsotonicRegression for post-hoc calibration
    clv_meta.joblib          - {features, cat_features, encoders}

Plus a per-customer prediction file:
    data/loyalty_predictions.csv

Mirrors the notebook (ML/Airline_ML.ipynb) so the persisted artifacts behave
the same way as the validated training pipeline.
"""
from __future__ import annotations

import urllib
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.isotonic import IsotonicRegression
from sklearn.metrics import (accuracy_score, f1_score, mean_squared_error,
                             r2_score, roc_auc_score)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sqlalchemy import create_engine
import xgboost as xgb


SERVER = r"MEA-JJG4XL3\DEV3"
DATABASE = "DWH_DB"

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent
OUT_DIR = PROJECT / "backend" / "models" / "loyalty"
DATA_DIR = PROJECT / "data"
OUT_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)


def get_engine():
    params = urllib.parse.quote_plus(
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={SERVER};DATABASE={DATABASE};Trusted_Connection=yes;"
    )
    return create_engine(f"mssql+pyodbc:///?odbc_connect={params}", fast_executemany=True)


SQL_CUST = """
SELECT
    c.SK_Customer, c.LoyaltyNumber, c.Gender, c.Education, c.MaritalStatus,
    TRY_CAST(NULLIF(c.Salary, N'Unknown') AS DECIMAL(18,2)) AS Salary,
    c.CLV, c.EnrollmentType, c.EnrollmentYear, c.IsChurned,
    lc.LoyaltyCard, g.Country, g.Province, g.City
FROM dbo.DIM_CUSTOMER c
LEFT JOIN dbo.DIM_LOYALTY_CARD lc ON c.SK_LoyaltyCard = lc.SK_LoyaltyCard
LEFT JOIN dbo.DIM_GEOGRAPHY g     ON c.SK_Geography   = g.SK_Geography
WHERE c.SK_Customer > 0 AND c.SCD_IsCurrent = 1
"""

SQL_ACT = """
SELECT
    f.SK_Customer, f.TotalFlights, f.Distance,
    f.PointsAccumulated, f.PointsRedeemed, f.DollarCostPointsRedeemed,
    d.Year, d.MonthNumber AS Month
FROM dbo.FACT_FLIGHT_ACTIVITY f
LEFT JOIN dbo.DIM_DATE d ON f.SK_Date = d.SK_Date AND d.SK_Date > 0
WHERE f.SK_Customer > 0
"""


def build_dataset(engine) -> pd.DataFrame:
    df_cust = pd.read_sql(SQL_CUST, engine)
    df_act = pd.read_sql(SQL_ACT, engine)

    df_act["YearMonth"] = df_act["Year"] * 100 + df_act["Month"]
    agg = df_act.groupby("SK_Customer").agg(
        TotalFlights  = ("TotalFlights",            "sum"),
        TotalDistance = ("Distance",                "sum"),
        PointsAcc     = ("PointsAccumulated",       "sum"),
        PointsRed     = ("PointsRedeemed",          "sum"),
        DollarCost    = ("DollarCostPointsRedeemed","sum"),
        ActiveMonths  = ("TotalFlights",            "count"),
        LastYearMonth = ("YearMonth",               "max"),
    ).reset_index()

    global_ym = agg["LastYearMonth"].max()
    agg["LastYear"] = agg["LastYearMonth"] // 100
    agg["LastMonth"] = agg["LastYearMonth"] % 100
    agg["RecencyMonths"] = (
        (global_ym // 100 - agg["LastYear"]) * 12 + (global_ym % 100 - agg["LastMonth"])
    )

    df = df_cust.merge(agg, on="SK_Customer", how="left")
    for c in ["TotalFlights", "TotalDistance", "PointsAcc", "PointsRed",
              "DollarCost", "ActiveMonths", "RecencyMonths"]:
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)

    df["RedemptionRate"]    = np.where(df["PointsAcc"] > 0, df["PointsRed"] / df["PointsAcc"], 0)
    df["AvgFlightsPerMonth"]= np.where(df["ActiveMonths"] > 0, df["TotalFlights"] / df["ActiveMonths"], 0)
    df["CLV"] = pd.to_numeric(df["CLV"], errors="coerce")
    df["Salary"] = pd.to_numeric(df["Salary"], errors="coerce").fillna(df["Salary"].median() if df["Salary"].notna().any() else 0)
    return df


CHURN_NUM = ["CLV", "TotalFlights", "TotalDistance", "PointsAcc", "PointsRed",
             "DollarCost", "ActiveMonths", "RedemptionRate", "AvgFlightsPerMonth",
             "EnrollmentYear"]
CHURN_CAT = ["LoyaltyCard", "EnrollmentType", "MaritalStatus", "Education", "Gender"]

CLV_NUM = ["Salary", "EnrollmentYear", "TotalFlights", "TotalDistance",
           "PointsAcc", "PointsRed", "DollarCost", "ActiveMonths",
           "RedemptionRate", "AvgFlightsPerMonth", "RecencyMonths"]
CLV_CAT = ["LoyaltyCard", "EnrollmentType", "MaritalStatus", "Education", "Gender"]


def fit_encoders(df: pd.DataFrame, cat_cols: list[str]) -> dict[str, LabelEncoder]:
    encoders = {}
    for c in cat_cols:
        le = LabelEncoder()
        vals = df[c].fillna("Unknown").astype(str).tolist() + ["Unknown"]
        le.fit(vals)
        encoders[c] = le
    return encoders


def transform_cat(df: pd.DataFrame, encoders: dict[str, LabelEncoder]) -> pd.DataFrame:
    out = df.copy()
    for c, le in encoders.items():
        vals = out[c].fillna("Unknown").astype(str)
        known = set(le.classes_)
        vals = vals.where(vals.isin(known), "Unknown")
        out[f"{c}_enc"] = le.transform(vals)
    return out


def train_churn(df: pd.DataFrame) -> dict:
    cat_enc = fit_encoders(df, CHURN_CAT)
    dfe = transform_cat(df, cat_enc)
    feats = CHURN_NUM + [f"{c}_enc" for c in CHURN_CAT]
    X = dfe[feats].fillna(dfe[feats].median())
    y = dfe["IsChurned"].astype(int)

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2,
                                              random_state=42, stratify=y)
    X_res, y_res = SMOTE(random_state=42).fit_resample(X_tr, y_tr)

    model = xgb.XGBClassifier(
        n_estimators=300, max_depth=6, learning_rate=0.05,
        eval_metric="logloss", random_state=42, n_jobs=-1,
    )
    model.fit(X_res, y_res)
    pred = model.predict(X_te)
    prob = model.predict_proba(X_te)[:, 1]
    print(f"[churn] acc={accuracy_score(y_te, pred):.3f}  "
          f"f1={f1_score(y_te, pred):.3f}  auc={roc_auc_score(y_te, prob):.3f}")

    return {"model": model, "encoders": cat_enc, "features": feats,
            "num_features": CHURN_NUM, "cat_features": CHURN_CAT}


def train_clv(df: pd.DataFrame) -> dict:
    dfc = df[df["CLV"].notna() & (df["CLV"] > 0)].copy()
    cat_enc = fit_encoders(dfc, CLV_CAT)
    dfe = transform_cat(dfc, cat_enc)

    feats = CLV_NUM + [f"{c}_enc" for c in CLV_CAT]
    X = dfe[feats].fillna(dfe[feats].median())
    y_raw = dfe["CLV"].astype(float)
    y = np.log1p(y_raw)

    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)
    y_tr_raw = np.expm1(y_tr)
    y_te_raw = np.expm1(y_te)

    model = GradientBoostingRegressor(
        n_estimators=300, max_depth=4, learning_rate=0.05, random_state=42,
    )
    model.fit(X_tr, y_tr)

    train_pred_raw = np.maximum(1, np.expm1(model.predict(X_tr)))
    calibrator = IsotonicRegression(out_of_bounds="clip")
    calibrator.fit(train_pred_raw, y_tr_raw)

    test_pred_raw = np.maximum(1, np.expm1(model.predict(X_te)))
    test_pred_cal = calibrator.predict(test_pred_raw)
    print(f"[clv]   r2_raw={r2_score(y_te_raw, test_pred_raw):+.3f}  "
          f"r2_cal={r2_score(y_te_raw, test_pred_cal):+.3f}  "
          f"rmse_cal=${np.sqrt(mean_squared_error(y_te_raw, test_pred_cal)):,.0f}")

    return {"model": model, "calibrator": calibrator, "encoders": cat_enc,
            "features": feats, "num_features": CLV_NUM, "cat_features": CLV_CAT}


def predict_dataset(df: pd.DataFrame, churn: dict, clv: dict) -> pd.DataFrame:
    dfc = transform_cat(df, churn["encoders"])
    X_ch = dfc[churn["features"]].fillna(dfc[churn["features"]].median())
    churn_proba = churn["model"].predict_proba(X_ch)[:, 1]

    dfv = transform_cat(df, clv["encoders"])
    X_clv = dfv[clv["features"]].fillna(dfv[clv["features"]].median())
    clv_pred_raw = np.maximum(1, np.expm1(clv["model"].predict(X_clv)))
    clv_pred = clv["calibrator"].predict(clv_pred_raw)

    out = df[["SK_Customer", "LoyaltyNumber", "LoyaltyCard", "Country", "Province", "City",
              "Gender", "Education", "MaritalStatus", "EnrollmentType",
              "EnrollmentYear", "CLV", "IsChurned",
              "TotalFlights", "TotalDistance", "PointsAcc", "PointsRed",
              "ActiveMonths", "RedemptionRate", "AvgFlightsPerMonth"]].copy()
    out["CLV_predicted"] = np.round(clv_pred, 2)
    out["churn_proba"]   = np.round(churn_proba, 3)
    out["risk_tier"] = pd.cut(
        out["churn_proba"], bins=[-0.01, 0.33, 0.66, 1.01],
        labels=["low", "medium", "high"],
    ).astype(str)

    clv_q = out["CLV"].quantile([0.5, 0.75, 0.9])
    def _segment(v):
        if pd.isna(v) or v <= 0:  return "Inactive"
        if v >= clv_q[0.9]:       return "Premium"
        if v >= clv_q[0.75]:      return "Engaged"
        if v >= clv_q[0.5]:       return "Casual"
        return "At risk"
    out["segment"] = out["CLV"].map(_segment)

    def _action(row):
        if row.risk_tier == "high" and row.CLV >= clv_q[0.75]:
            return "Priority retention call — high-value churn risk"
        if row.risk_tier == "high":
            return "Send personalised win-back offer"
        if row.risk_tier == "medium" and row.CLV >= clv_q[0.9]:
            return "VIP outreach + bonus points"
        if row.risk_tier == "medium":
            return "Re-engagement email + double-points week"
        if row.CLV >= clv_q[0.9]:
            return "Upgrade to Aurora — premium benefits"
        return "Newsletter + targeted promotions"
    out["recommended_action"] = out.apply(_action, axis=1)
    return out


def main() -> None:
    print("[1/4] Connecting to DWH ...")
    engine = get_engine()

    print("[2/4] Building dataset ...")
    df = build_dataset(engine)
    print(f"      customers={len(df):,}")

    print("[3/4] Training churn + CLV ...")
    churn = train_churn(df)
    clv = train_clv(df)

    joblib.dump(churn["model"], OUT_DIR / "churn_model.joblib")
    joblib.dump({"encoders": churn["encoders"], "features": churn["features"],
                 "num_features": churn["num_features"],
                 "cat_features": churn["cat_features"]},
                OUT_DIR / "churn_meta.joblib")

    joblib.dump(clv["model"], OUT_DIR / "clv_model.joblib")
    joblib.dump(clv["calibrator"], OUT_DIR / "clv_calibrator.joblib")
    joblib.dump({"encoders": clv["encoders"], "features": clv["features"],
                 "num_features": clv["num_features"],
                 "cat_features": clv["cat_features"]},
                OUT_DIR / "clv_meta.joblib")
    print(f"      artifacts -> {OUT_DIR}")

    print("[4/4] Predicting per-customer + exporting CSV ...")
    preds = predict_dataset(df, churn, clv)
    out_csv = DATA_DIR / "loyalty_predictions.csv"
    preds.to_csv(out_csv, index=False, encoding="utf-8-sig")
    print(f"      {len(preds):,} rows -> {out_csv}")
    print("Done.")


if __name__ == "__main__":
    main()
