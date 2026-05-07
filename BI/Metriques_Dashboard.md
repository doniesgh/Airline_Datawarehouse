# Métriques DAX du Dashboard — Documentation

**Source** : DWH_DB (SQL Server) via vues `vw_*` + CSV ML
**Outil** : Power BI Desktop

---

## 🎯 Vue d'ensemble

Le dashboard contient **3 catégories** de métriques :

1. **🛫 Axe Satisfaction** — mesurer le ressenti passager
2. **💎 Axe Loyalty** — mesurer la fidélisation et la valeur client
3. **🤖 Axe ML** — exposer les résultats des modèles prédictifs

---

## 1. AXE SATISFACTION

### 1.1 Indicateurs principaux

| Métrique | Formule DAX | Description | Valeur actuelle |
|----------|-------------|-------------|-----------------|
| **Satisfaction Rate %** | `SELECTEDVALUE(vw_KPI_Summary[SatisfactionRatePct])` | Taux global de passagers satisfaits (Flag=1). Lit la valeur précalculée dans la vue KPI. | **43.45 %** |
| **Satisfaction Target %** | `SELECTEDVALUE(vw_KPI_Summary[SatisfactionTarget])` | Cible métier pour 2026 (constante 73.1%). | **73.1 %** |
| **Satisfaction Gap %** | `[Satisfaction Target %] - [Satisfaction Rate %]` | Écart entre la cible et le réel. Positif = travail à faire. | **+29.65 pts** |
| **Total Surveys** | `COUNTROWS(vw_Satisfaction_Analysis)` | Nombre total d'enquêtes de satisfaction (réagit aux slicers). | **129 880** |
| **Satisfied Count** | `CALCULATE([Total Surveys], vw_Satisfaction_Analysis[Satisfaction_Flag] = 1)` | Nombre de passagers satisfaits (Flag=1). | **56 428** |
| **Dynamic Satisfaction Rate %** | `DIVIDE([Satisfied Count], [Total Surveys], 0) * 100` | Version dynamique du taux de satisfaction — change avec les slicers (Class, TypeOfTravel, etc.). | **43.45 %** |

### 1.2 Indicateurs de qualité de service

| Métrique | Formule DAX | Description | Valeur actuelle |
|----------|-------------|-------------|-----------------|
| **Avg Service Score** | `AVERAGE(vw_Satisfaction_Analysis[AvgServiceScore])` | Score moyen consolidé des 14 services (sur 5). Calculé en staging. | **~3.30** |
| **Score Moyen Service** | `AVERAGE(vw_Service_Scores[Score])` | Score moyen filtrable par service (utilise la vue UNPIVOT). Permet le bar chart "score par service". | **2.5–4.5** selon service |
| **NPS Proxy** | `[Satisfied Count] - ([Total Surveys] - [Satisfied Count])` | Approximation NPS = Promoteurs - Détracteurs. Négatif = plus de détracteurs. | **-17 024** (négatif) |

### 1.3 Indicateurs visuels (statuts)

| Métrique | Formule DAX | Description | Valeur actuelle |
|----------|-------------|-------------|-----------------|
| **Satisfaction Status** | `SWITCH(TRUE(), [Dynamic Satisfaction Rate %] >= 73.1, "✅ Atteint", [Dynamic Satisfaction Rate %] >= 65, "⚠️ En progrès", "❌ Critique")` | Code couleur textuel pour les cards KPI. | **❌ Critique** |

---

## 2. AXE LOYALTY

### 2.1 Indicateurs de rétention

| Métrique | Formule DAX | Description | Valeur actuelle |
|----------|-------------|-------------|-----------------|
| **Total Members** | `SELECTEDVALUE(vw_KPI_Summary[TotalMembers])` | Nombre total de membres fidélité actifs (SCD_IsCurrent=1). Précalculé. | **16 737** |
| **Churn Rate %** | `SELECTEDVALUE(vw_KPI_Summary[ChurnRatePct])` | Taux de désabonnement (CancellationYear renseigné). Précalculé. | **12.35 %** |
| **Retention Rate %** | `100 - [Churn Rate %]` | Taux de fidélisation. **KPI clé du projet**. | **87.65 %** |
| **Retention Gap %** | `[Retention Rate %] - 40` | Écart à la cible (40%). Positif = objectif dépassé. | **+47.65 pts** ✅ |
| **Dynamic Total Members** | `COUNTROWS(vw_Customer_360)` | Version dynamique du nombre de membres — réactive aux slicers. | **16 737** |
| **Dynamic Churned Members** | `CALCULATE([Dynamic Total Members], vw_Customer_360[IsChurned] = 1)` | Membres ayant churné (filtrable). | **2 067** |
| **Dynamic Churn Rate %** | `DIVIDE([Dynamic Churned Members], [Dynamic Total Members], 0) * 100` | Churn dynamique — change avec les slicers (LoyaltyCard, Country, etc.). | **12.35 %** |

### 2.2 Indicateurs de valeur client (CLV)

| Métrique | Formule DAX | Description | Valeur actuelle |
|----------|-------------|-------------|-----------------|
| **Avg CLV** | `AVERAGE(vw_Customer_360[CLV])` | Customer Lifetime Value moyen — valeur économique d'un client. | **6 900 $** |
| **Total CLV** | `SUM(vw_Customer_360[CLV])` | CLV cumulé du portefeuille — patrimoine client total. | **115 M$** |

### 2.3 Statut

| Métrique | Formule DAX | Description | Valeur actuelle |
|----------|-------------|-------------|-----------------|
| **Retention Status** | `SWITCH(TRUE(), [Retention Rate %] >= 40, "✅ Atteint", [Retention Rate %] >= 35, "⚠️ En progrès", "❌ Critique")` | Code couleur textuel. | **✅ Atteint** |

---

## 3. AXE ACTIVITÉ DE VOL

### 3.1 Volumes

| Métrique | Formule DAX | Description | Valeur actuelle |
|----------|-------------|-------------|-----------------|
| **Total Flights** | `SUM(vw_Flight_Activity_Enriched[TotalFlights])` | Nombre total de vols effectués sur la période (somme des vols par membre × mois). | **509 K** |
| **Total Distance** | `SUM(vw_Flight_Activity_Enriched[Distance])` | Distance totale parcourue par tous les membres. | **~750 M km** |
| **Avg Flights per Member** | `DIVIDE([Total Flights], [Dynamic Total Members], 0)` | Vols moyens par membre actif (indicateur d'engagement). | **~30 vols** |

### 3.2 Programme de points

| Métrique | Formule DAX | Description | Valeur actuelle |
|----------|-------------|-------------|-----------------|
| **Total Points Accumulated** | `SUM(vw_Flight_Activity_Enriched[PointsAccumulated])` | Points fidélité gagnés au total. | **~1.2 Md** |
| **Total Points Redeemed** | `SUM(vw_Flight_Activity_Enriched[PointsRedeemed])` | Points utilisés pour des récompenses. | **~50 M** |
| **Redemption Rate %** | `DIVIDE([Total Points Redeemed], [Total Points Accumulated], 0) * 100` | % des points accumulés qui sont effectivement utilisés. **Indicateur d'attractivité du programme**. | **~4–5 %** |

---

## 4. AXE ML (depuis CSV)

### 4.1 Performance des modèles

| Métrique | Formule DAX | Description | Valeur actuelle |
|----------|-------------|-------------|-----------------|
| **ROC AUC** | `AVERAGE(ml_model_performance[ROC_AUC])` | Aire sous la courbe ROC moyenne — capacité prédictive (1 = parfait). | **0.97** (XGBoost) |
| **F1 Score** | `AVERAGE(ml_model_performance[F1_Score])` | Moyenne harmonique précision/recall. | **0.95** (XGBoost) |

### 4.2 Clusters Satisfaction

| Métrique | Formule DAX | Description | Valeur actuelle |
|----------|-------------|-------------|-----------------|
| **Cluster Members** | `COUNTROWS(ml_clusters_satisfaction)` | Nombre de passagers dans le cluster sélectionné. | **129 880** (total) |
| **Satisfaction Rate par Cluster** | `DIVIDE(CALCULATE([Cluster Members], ml_clusters_satisfaction[Satisfaction_Flag] = 1), [Cluster Members], 0) * 100` | Taux de satisfaction au sein de chaque cluster. | **0–95 %** selon cluster |

### 4.3 Segments RFM Loyalty

| Métrique | Formule DAX | Description | Valeur actuelle |
|----------|-------------|-------------|-----------------|
| **Members par Segment** | `COUNTROWS(ml_segments_loyalty)` | Nombre de clients par segment RFM (Premium / Régulier / Inactif). | **3 segments** |
| **Avg CLV par Segment** | `AVERAGE(ml_segments_loyalty[CLV])` | CLV moyen par segment — utilité business. | Variable selon segment |

---

## 5. Tableau de bord — Quelles métriques sur quelle page ?

| Métrique | Page 1 (Globale) | Page 2 (Satisfaction) | Page 3 (Loyalty) | Page 4 (ML) |
|----------|:----------------:|:---------------------:|:----------------:|:------------:|
| Satisfaction Rate % | ✅ Card | ✅ Card | | |
| Satisfaction Gap % | ✅ Texte | | | |
| Total Surveys | | ✅ KPI | | |
| Score Moyen Service | | ✅ Bar chart | | |
| Avg Service Score | | ✅ Card | | |
| Dynamic Satisfaction Rate % | | ✅ Filtré | | |
| NPS Proxy | | ✅ Card | | |
| Retention Rate % | ✅ Card | | ✅ Card | |
| Churn Rate % | | | ✅ Card + bar | |
| Avg CLV | ✅ Card | | ✅ Card | |
| Total Flights | ✅ Card | | ✅ Card | |
| Redemption Rate % | | | ✅ Bar chart | |
| Total Members | | | ✅ Card | |
| ROC AUC | | | | ✅ Card |
| Satisfaction Rate par Cluster | | | | ✅ Bar |
| Avg CLV par Segment | | | | ✅ Bar |

---

## 6. Synthèse des KPIs Métier

### Tableau de scores actuels vs cibles

| KPI | Actuel | Cible | Gap | Statut |
|-----|--------|-------|-----|--------|
| Satisfaction Rate | **43.45 %** | 73.1 % | -29.65 pts | 🔴 **Critique** |
| Retention Rate | **87.65 %** | 40 % | +47.65 pts | 🟢 **Excellent** |
| Avg CLV | **6 900 $** | (pas de cible) | n/a | ℹ️ Référence |
| NPS Proxy | **-17 024** | > 0 | Négatif | 🟠 **À surveiller** |
| Redemption Rate | **~5 %** | (pas de cible) | n/a | ℹ️ Faible engagement programme |

### Lecture stratégique pour le jury

> Le dashboard révèle un **paradoxe** : la rétention est excellente (87.65% vs cible 40%) mais la satisfaction est très en deçà de la cible (43.45% vs 73.1%). Cela suggère que les passagers restent par défaut (programme captif), pas par enthousiasme. **Risque** : si un concurrent émerge, le churn pourrait exploser. **Action** : prioriser l'amélioration des services notés < 3.5 (Page 2).

---

## 7. Notes techniques

### Différence entre les mesures "statiques" et "dynamiques"

- **Statiques** (`SELECTEDVALUE(vw_KPI_Summary[...])`) : lisent une valeur précalculée. **Ne réagissent PAS aux slicers**. Utiles pour la Page 1 (vue exécutive).
- **Dynamiques** (`COUNTROWS`, `CALCULATE`, `DIVIDE`) : se recalculent selon les filtres actifs. Utiles pour les pages d'analyse (2, 3, 4).

### Pourquoi `vw_KPI_Summary` ?

Une vue avec **une seule ligne** contenant tous les KPIs précalculés :
- 🚀 **Performance** : 1 row, calculs faits côté SQL Server
- 📊 **Cohérence** : mêmes valeurs partout (pas de DAX divergent)
- 🛠 **Simplicité** : `SELECTEDVALUE(...)` est trivial à écrire

### Pourquoi le `CASE Satisfaction_Flag` dans les vues ?

La vue `vw_Satisfaction_Analysis` calcule `SatisfactionLabel` à partir du **Flag** (BIT) et non du texte `Satisfaction` :
- 🛡️ **Robustesse** : protégé contre l'erreur ETL où le texte avait des valeurs erronées (Class)
- ✅ **Cohérence** : le Flag est calculé dès le staging et toujours fiable

---

*Airline Analytics — Documentation des métriques | Esprit 3A — 2026*
