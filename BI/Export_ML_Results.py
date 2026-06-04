"""
Export des résultats ML pour Power BI
======================================
Génère 4 fichiers CSV à importer dans Power BI (Page 4 — ML Insights) :
  1. ml_clusters_satisfaction.csv  — assignation cluster par passager
  2. ml_feature_importance.csv     — importance des features (XGBoost)
  3. ml_model_performance.csv      — métriques des modèles
  4. ml_segments_loyalty.csv       — segments RFM par client

Usage :
    cd ML/
    python ../BI/Export_ML_Results.py
"""

import pandas as pd
import numpy as np
import urllib
import os
from sqlalchemy import create_engine, text
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, f1_score, roc_auc_score, r2_score, mean_squared_error
from sklearn.cluster import KMeans
from sklearn.impute import SimpleImputer
import xgboost as xgb
from imblearn.over_sampling import SMOTE
import warnings
warnings.filterwarnings('ignore')

# ─── Configuration ───────────────────────────────────────────────────────────
SERVER   = r"MEA-JJG4XL3\DEV3"
DATABASE = "DWH_DB"
OUT_DIR  = os.path.join(os.path.dirname(__file__), "ml_exports")
os.makedirs(OUT_DIR, exist_ok=True)

params = urllib.parse.quote_plus(
    f"DRIVER={{ODBC Driver 17 for SQL Server}};"
    f"SERVER={SERVER};DATABASE={DATABASE};Trusted_Connection=yes;"
)
engine = create_engine(f"mssql+pyodbc:///?odbc_connect={params}")

print("=" * 60)
print("   EXPORT DES RESULTATS ML POUR POWER BI")
print("=" * 60)
print(f"Source : {SERVER} / {DATABASE}")
print(f"Sortie : {OUT_DIR}\n")

# ─── 1. Chargement des données depuis DWH_DB ────────────────────────────────
print("[1/5] Chargement des donnees depuis DWH_DB...")

df_sat = pd.read_sql("""
    SELECT f.SK_Satisfaction, f.Gender, f.CustomerType, f.Age, f.FlightDistance,
           f.DepartureDelay, f.ArrivalDelay,
           f.TimeConvenience, f.OnlineBooking, f.CheckinService, f.OnlineBoarding,
           f.GateLocation, f.OnboardService, f.SeatComfort, f.LegRoom,
           f.Cleanliness, f.FoodAndDrink, f.InFlightService, f.InFlightWifi,
           f.InFlightEntertainment, f.BaggageHandling,
           f.Satisfaction_Flag, t.TypeOfTravel, t.Class
    FROM dbo.FACT_PASSENGER_SATISFACTION f
    LEFT JOIN dbo.DIM_TRAVEL t ON f.SK_Travel = t.SK_Travel AND t.SK_Travel > 0
""", engine)
print(f"      Satisfaction : {len(df_sat):,} lignes")

df_loy = pd.read_sql("""
    SELECT c.SK_Customer, c.LoyaltyNumber, c.CLV, c.IsChurned,
           c.EnrollmentYear, c.EnrollmentType,
           lc.LoyaltyCard
    FROM dbo.DIM_CUSTOMER c
    LEFT JOIN dbo.DIM_LOYALTY_CARD lc ON c.SK_LoyaltyCard = lc.SK_LoyaltyCard
    WHERE c.SK_Customer > 0 AND c.SCD_IsCurrent = 1
""", engine)

act_agg = pd.read_sql("""
    SELECT SK_Customer,
           SUM(TotalFlights) AS TotalFlights,
           SUM(Distance) AS TotalDistance,
           SUM(PointsAccumulated) AS PointsAcc,
           SUM(PointsRedeemed) AS PointsRed,
           SUM(DollarCostPointsRedeemed) AS DollarCost
    FROM dbo.FACT_FLIGHT_ACTIVITY
    WHERE SK_Customer > 0
    GROUP BY SK_Customer
""", engine)

df_loy = df_loy.merge(act_agg, on='SK_Customer', how='left').fillna(0)
df_loy['CLV'] = pd.to_numeric(df_loy['CLV'], errors='coerce').fillna(0)
print(f"      Loyalty      : {len(df_loy):,} membres")

# ─── 2. Clustering Satisfaction (K-Means K=4) ───────────────────────────────
print("\n[2/5] K-Means clustering passagers...")

score_cols = ['TimeConvenience','OnlineBooking','CheckinService','OnlineBoarding',
              'GateLocation','OnboardService','SeatComfort','LegRoom',
              'Cleanliness','FoodAndDrink','InFlightService','InFlightWifi',
              'InFlightEntertainment','BaggageHandling']

X_cl = df_sat[score_cols].copy()
for col in score_cols:
    median_nz = df_sat[col][df_sat[col] > 0].median()
    X_cl[col] = X_cl[col].replace(0, median_nz)
X_cl.fillna(X_cl.median(), inplace=True)

scaler_cl = StandardScaler()
X_scaled = scaler_cl.fit_transform(X_cl)

K = 4
km = KMeans(n_clusters=K, random_state=42, n_init=10)
df_sat['Cluster'] = km.fit_predict(X_scaled)

# Profil de chaque cluster
cluster_labels = {}
for c in range(K):
    sub = df_sat[df_sat['Cluster'] == c]
    avg = sub[score_cols].mean().mean()
    sat_pct = sub['Satisfaction_Flag'].mean() * 100
    if avg >= 4.0 and sat_pct >= 70:
        label = f"Cluster {c} - Très Satisfaits (Premium)"
    elif avg >= 3.5 and sat_pct >= 50:
        label = f"Cluster {c} - Satisfaits (Standards)"
    elif avg >= 3.0:
        label = f"Cluster {c} - Mitigés (à fidéliser)"
    else:
        label = f"Cluster {c} - Insatisfaits (critiques)"
    cluster_labels[c] = label

df_sat['ClusterLabel'] = df_sat['Cluster'].map(cluster_labels)

# Export
out1 = os.path.join(OUT_DIR, "ml_clusters_satisfaction.csv")
df_sat[['SK_Satisfaction','Cluster','ClusterLabel','Satisfaction_Flag']].to_csv(
    out1, index=False, encoding='utf-8-sig')
print(f"      -> {out1} ({len(df_sat):,} lignes)")

# ─── 3. Feature Importance Satisfaction ─────────────────────────────────────
print("\n[3/5] Feature importance XGBoost...")

cat_cols = ['Gender','CustomerType','TypeOfTravel','Class']
df_ml = df_sat.copy()
le = LabelEncoder()
for col in cat_cols:
    if col in df_ml.columns and df_ml[col].notna().any():
        df_ml[col + '_enc'] = le.fit_transform(df_ml[col].fillna('Unknown'))

feature_cols = score_cols + [c + '_enc' for c in cat_cols if c + '_enc' in df_ml.columns]
feature_cols += ['Age','FlightDistance','DepartureDelay','ArrivalDelay']
feature_cols = [c for c in feature_cols if c in df_ml.columns]

X = df_ml[feature_cols].copy()
y = df_ml['Satisfaction_Flag'].astype(int)
X = pd.DataFrame(SimpleImputer(strategy='median').fit_transform(X), columns=feature_cols)
for col in score_cols:
    median_nz = df_sat[col][df_sat[col] > 0].median()
    X[col] = X[col].replace(0, median_nz)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

scale_pw = (y_train == 0).sum() / (y_train == 1).sum()
xgb_m = xgb.XGBClassifier(n_estimators=300, max_depth=6, learning_rate=0.05,
                          scale_pos_weight=scale_pw, eval_metric='logloss',
                          random_state=42, n_jobs=-1)
xgb_m.fit(X_train, y_train)

fi_df = pd.DataFrame({
    'Feature': feature_cols,
    'Importance': xgb_m.feature_importances_,
    'Category': ['Service Score' if f in score_cols else
                 'Demographic' if f in ['Age'] or f.endswith('_enc') else
                 'Flight Info' for f in feature_cols]
}).sort_values('Importance', ascending=False)

out2 = os.path.join(OUT_DIR, "ml_feature_importance.csv")
fi_df.to_csv(out2, index=False, encoding='utf-8-sig')
print(f"      -> {out2} ({len(fi_df)} features)")

# ─── 4. Performance des modèles ─────────────────────────────────────────────
print("\n[4/5] Performance des modeles...")

# Logistic Regression
scaler = StandardScaler()
X_tr_sc = scaler.fit_transform(X_train)
X_te_sc = scaler.transform(X_test)
lr = LogisticRegression(max_iter=1000, class_weight='balanced', random_state=42)
lr.fit(X_tr_sc, y_train)

# Random Forest
rf = RandomForestClassifier(n_estimators=200, max_depth=12, class_weight='balanced',
                             random_state=42, n_jobs=-1)
rf.fit(X_train, y_train)

models_perf = []
for name, model, X_te in [('Logistic Regression', lr, X_te_sc),
                           ('Random Forest',       rf, X_test),
                           ('XGBoost',             xgb_m, X_test)]:
    y_pred = model.predict(X_te)
    y_prob = model.predict_proba(X_te)[:,1]
    models_perf.append({
        'Model': name,
        'Task' : 'Satisfaction Classification',
        'Accuracy': round(accuracy_score(y_test, y_pred), 3),
        'F1_Score': round(f1_score(y_test, y_pred), 3),
        'ROC_AUC' : round(roc_auc_score(y_test, y_prob), 3)
    })

# Churn Prediction
df_ch = df_loy.copy()
for col in ['LoyaltyCard','EnrollmentType']:
    df_ch[col + '_enc'] = LabelEncoder().fit_transform(df_ch[col].fillna('Unknown'))

feat_ch = ['CLV','TotalFlights','TotalDistance','PointsAcc','PointsRed','DollarCost',
            'EnrollmentYear','LoyaltyCard_enc','EnrollmentType_enc']
X_ch = df_ch[feat_ch].fillna(0)
y_ch = df_ch['IsChurned'].astype(int)
X_ch_tr, X_ch_te, y_ch_tr, y_ch_te = train_test_split(X_ch, y_ch, test_size=0.2,
                                                       random_state=42, stratify=y_ch)
smote = SMOTE(random_state=42)
X_ch_res, y_ch_res = smote.fit_resample(X_ch_tr, y_ch_tr)

xgb_ch = xgb.XGBClassifier(n_estimators=300, max_depth=6, learning_rate=0.05,
                             eval_metric='logloss', random_state=42, n_jobs=-1)
xgb_ch.fit(X_ch_res, y_ch_res)
y_ch_pred = xgb_ch.predict(X_ch_te)
y_ch_prob = xgb_ch.predict_proba(X_ch_te)[:,1]

models_perf.append({
    'Model': 'XGBoost (SMOTE)',
    'Task' : 'Churn Prediction',
    'Accuracy': round(accuracy_score(y_ch_te, y_ch_pred), 3),
    'F1_Score': round(f1_score(y_ch_te, y_ch_pred), 3),
    'ROC_AUC' : round(roc_auc_score(y_ch_te, y_ch_prob), 3)
})

# CLV Regression
df_clv = df_loy[df_loy['CLV'] > 0].copy()
for col in ['LoyaltyCard','EnrollmentType']:
    df_clv[col + '_enc'] = LabelEncoder().fit_transform(df_clv[col].fillna('Unknown'))
feat_clv = ['TotalFlights','TotalDistance','PointsAcc','PointsRed','DollarCost',
            'EnrollmentYear','LoyaltyCard_enc','EnrollmentType_enc']
X_clv = df_clv[feat_clv].fillna(0)
y_clv = df_clv['CLV']
X_clv_tr, X_clv_te, y_clv_tr, y_clv_te = train_test_split(X_clv, y_clv, test_size=0.2, random_state=42)
rf_reg = RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)
rf_reg.fit(X_clv_tr, y_clv_tr)
clv_pred = rf_reg.predict(X_clv_te)

models_perf.append({
    'Model': 'Random Forest Regressor',
    'Task' : 'CLV Prediction',
    'Accuracy': round(r2_score(y_clv_te, clv_pred), 3),
    'F1_Score': round(np.sqrt(mean_squared_error(y_clv_te, clv_pred)), 0),
    'ROC_AUC' : 0
})

perf_df = pd.DataFrame(models_perf)
out3 = os.path.join(OUT_DIR, "ml_model_performance.csv")
perf_df.to_csv(out3, index=False, encoding='utf-8-sig')
print(f"      -> {out3} ({len(perf_df)} modeles)")

# ─── 5. Segments RFM Loyalty ────────────────────────────────────────────────
print("\n[5/5] Segmentation RFM clients...")

rfm_feat = ['CLV','TotalFlights','PointsAcc','PointsRed','DollarCost']
rfm = df_loy[rfm_feat].fillna(0)
rfm_scaled = StandardScaler().fit_transform(rfm)

K_RFM = 3
km_rfm = KMeans(n_clusters=K_RFM, random_state=42, n_init=10)
df_loy['Segment'] = km_rfm.fit_predict(rfm_scaled)

# Labelliser les segments par CLV moyen
seg_clv = df_loy.groupby('Segment')['CLV'].mean().sort_values(ascending=False)
labels_rfm = {}
seg_names = ['Premium', 'Regulier', 'Inactif']
for i, seg_id in enumerate(seg_clv.index):
    labels_rfm[seg_id] = f"Segment {seg_id} - {seg_names[i] if i < len(seg_names) else 'Autre'}"
df_loy['SegmentLabel'] = df_loy['Segment'].map(labels_rfm)

out4 = os.path.join(OUT_DIR, "ml_segments_loyalty.csv")
df_loy[['SK_Customer','LoyaltyNumber','LoyaltyCard','CLV','TotalFlights',
         'IsChurned','Segment','SegmentLabel']].to_csv(out4, index=False, encoding='utf-8-sig')
print(f"      -> {out4} ({len(df_loy):,} membres)")

# ─── Récapitulatif ──────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("   EXPORT TERMINE")
print("=" * 60)
print(f"\nFichiers crees dans : {OUT_DIR}\n")
for f in os.listdir(OUT_DIR):
    fp = os.path.join(OUT_DIR, f)
    size_kb = os.path.getsize(fp) / 1024
    print(f"  - {f:<40s} ({size_kb:>8.1f} KB)")

print("\nDans Power BI Desktop :")
print("  Accueil -> Obtenir des donnees -> Texte/CSV")
print("  Importer chaque fichier comme nouvelle table")
print("  Joindre via SK_Satisfaction (cluster) ou SK_Customer (segment)")
