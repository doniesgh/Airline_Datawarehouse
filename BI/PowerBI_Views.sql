/* ============================================================================
   POWER BI — VUES OPTIMISEES POUR LE DASHBOARD
   Source : DWH_DB
   Usage  : importer ces vues dans Power BI plutot que les tables brutes
   ============================================================================ */

USE [DWH_DB];
GO

-- ─── Nettoyage des vues existantes ─────────────────────────────────────────
IF OBJECT_ID(N'dbo.vw_Satisfaction_Analysis', N'V') IS NOT NULL DROP VIEW dbo.vw_Satisfaction_Analysis;
IF OBJECT_ID(N'dbo.vw_Customer_360',         N'V') IS NOT NULL DROP VIEW dbo.vw_Customer_360;
IF OBJECT_ID(N'dbo.vw_Service_Scores',       N'V') IS NOT NULL DROP VIEW dbo.vw_Service_Scores;
IF OBJECT_ID(N'dbo.vw_KPI_Summary',          N'V') IS NOT NULL DROP VIEW dbo.vw_KPI_Summary;
IF OBJECT_ID(N'dbo.vw_Flight_Activity_Enriched', N'V') IS NOT NULL DROP VIEW dbo.vw_Flight_Activity_Enriched;
IF OBJECT_ID(N'dbo.vw_Delay_Impact',         N'V') IS NOT NULL DROP VIEW dbo.vw_Delay_Impact;
GO

/* ============================================================================
   VUE 1 — Satisfaction enrichie (FACT + dimensions)
   Utilisation : Page 2 du dashboard (Analyse Satisfaction)
   ============================================================================ */
CREATE VIEW dbo.vw_Satisfaction_Analysis AS
SELECT
    f.SK_Satisfaction,
    f.SK_Travel,
    -- Demographique
    f.Gender,
    f.CustomerType,
    f.Age,
    CASE
        WHEN f.Age < 25                   THEN '< 25 ans'
        WHEN f.Age BETWEEN 25 AND 39      THEN '25-39 ans'
        WHEN f.Age BETWEEN 40 AND 59      THEN '40-59 ans'
        ELSE '60+ ans'
    END AS AgeBucket,
    -- Voyage
    t.TypeOfTravel,
    t.Class,
    t.TravelProfile,
    f.FlightDistance,
    CASE
        WHEN f.FlightDistance < 1000       THEN 'Court (<1000)'
        WHEN f.FlightDistance < 3000       THEN 'Moyen (1000-3000)'
        ELSE 'Long (>3000)'
    END AS DistanceBucket,
    -- Retards
    f.DepartureDelay,
    f.ArrivalDelay,
    CASE
        WHEN ISNULL(f.DepartureDelay, 0) = 0          THEN '0 - Aucun retard'
        WHEN f.DepartureDelay BETWEEN 1 AND 30        THEN '1-30 min'
        WHEN f.DepartureDelay BETWEEN 31 AND 60       THEN '31-60 min'
        ELSE '> 60 min'
    END AS DelayBucket,
    -- Scores services (14)
    f.TimeConvenience, f.OnlineBooking, f.CheckinService, f.OnlineBoarding,
    f.GateLocation, f.OnboardService, f.SeatComfort, f.LegRoom,
    f.Cleanliness, f.FoodAndDrink, f.InFlightService, f.InFlightWifi,
    f.InFlightEntertainment, f.BaggageHandling,
    -- Indicateurs derivees
    f.AvgServiceScore,
    f.Satisfaction,
    f.Satisfaction_Flag,
    -- Categorie de satisfaction lisible
    CASE
        WHEN f.Satisfaction_Flag = 1 THEN 'Satisfait'
        ELSE 'Non satisfait'
    END AS SatisfactionLabel
FROM dbo.FACT_PASSENGER_SATISFACTION f
LEFT JOIN dbo.DIM_TRAVEL t ON f.SK_Travel = t.SK_Travel AND t.SK_Travel > 0;
GO

/* ============================================================================
   VUE 2 — Customer 360 (DIM + agregat activite)
   Utilisation : Page 3 du dashboard (Loyalty)
   ============================================================================ */
CREATE VIEW dbo.vw_Customer_360 AS
SELECT
    c.SK_Customer,
    c.LoyaltyNumber,
    -- Demographique
    c.Gender,
    c.Education,
    c.MaritalStatus,
    -- Inscription / Statut
    c.EnrollmentType,
    c.EnrollmentYear,
    c.EnrollmentMonth,
    c.EnrollmentDate,
    c.CancellationYear,
    c.CancellationMonth,
    c.IsChurned,
    CASE WHEN c.IsChurned = 1 THEN 'Churned' ELSE 'Actif' END AS ChurnStatus,
    -- Customer Lifetime Value
    c.CLV,
    CASE
        WHEN c.CLV < 5000                THEN 'Bronze (<5K)'
        WHEN c.CLV BETWEEN 5000 AND 10000 THEN 'Silver (5-10K)'
        WHEN c.CLV BETWEEN 10001 AND 15000 THEN 'Gold (10-15K)'
        ELSE 'Platinum (>15K)'
    END AS CLVTier,
    -- Carte fidelite
    lc.LoyaltyCard,
    -- Geographie
    g.Country,
    g.Province,
    g.City,
    g.PostalCode,
    -- Agregat activite
    ISNULL(act.TotalFlights,        0) AS TotalFlights,
    ISNULL(act.TotalDistance,       0) AS TotalDistance,
    ISNULL(act.TotalPointsAcc,      0) AS TotalPointsAcc,
    ISNULL(act.TotalPointsRed,      0) AS TotalPointsRed,
    ISNULL(act.TotalDollarCost,     0) AS TotalDollarCost,
    ISNULL(act.ActiveMonths,        0) AS ActiveMonths,
    act.LastActivityYear,
    -- Indicateurs derives
    CAST(ISNULL(act.TotalPointsRed, 0) * 100.0 /
         NULLIF(act.TotalPointsAcc, 0) AS DECIMAL(5,2)) AS RedemptionRatePct
FROM dbo.DIM_CUSTOMER c
LEFT JOIN dbo.DIM_LOYALTY_CARD lc ON c.SK_LoyaltyCard = lc.SK_LoyaltyCard
LEFT JOIN dbo.DIM_GEOGRAPHY    g  ON c.SK_Geography   = g.SK_Geography
LEFT JOIN (
    SELECT
        SK_Customer,
        SUM(TotalFlights)               AS TotalFlights,
        SUM(Distance)                   AS TotalDistance,
        SUM(PointsAccumulated)          AS TotalPointsAcc,
        SUM(PointsRedeemed)             AS TotalPointsRed,
        SUM(DollarCostPointsRedeemed)   AS TotalDollarCost,
        COUNT(*)                        AS ActiveMonths,
        MAX(d.Year)                     AS LastActivityYear
    FROM dbo.FACT_FLIGHT_ACTIVITY f
    LEFT JOIN dbo.DIM_DATE d ON f.SK_Date = d.SK_Date
    WHERE f.SK_Customer > 0
    GROUP BY SK_Customer
) act ON c.SK_Customer = act.SK_Customer
WHERE c.SK_Customer > 0
  AND c.SCD_IsCurrent = 1;
GO

/* ============================================================================
   VUE 3 — Scores services (format long / unpivot)
   Utilisation : graphiques par service (bar chart, heatmap)
   ============================================================================ */
CREATE VIEW dbo.vw_Service_Scores AS
SELECT
    SK_Satisfaction,
    SK_Travel,
    Satisfaction_Flag,
    Service,
    Score
FROM (
    SELECT SK_Satisfaction, SK_Travel, Satisfaction_Flag,
           TimeConvenience, OnlineBooking, CheckinService, OnlineBoarding,
           GateLocation, OnboardService, SeatComfort, LegRoom,
           Cleanliness, FoodAndDrink, InFlightService, InFlightWifi,
           InFlightEntertainment, BaggageHandling
    FROM dbo.FACT_PASSENGER_SATISFACTION
) src
UNPIVOT (
    Score FOR Service IN (
        TimeConvenience, OnlineBooking, CheckinService, OnlineBoarding,
        GateLocation, OnboardService, SeatComfort, LegRoom,
        Cleanliness, FoodAndDrink, InFlightService, InFlightWifi,
        InFlightEntertainment, BaggageHandling
    )
) unpvt
WHERE Score > 0;
GO

/* ============================================================================
   VUE 4 — KPI Summary (1 seule ligne avec tous les KPIs cles)
   Utilisation : cartes KPI sur Page 1
   ============================================================================ */
CREATE VIEW dbo.vw_KPI_Summary AS
SELECT
    -- Satisfaction
    (SELECT COUNT(*)               FROM dbo.FACT_PASSENGER_SATISFACTION) AS TotalSurveys,
    (SELECT SUM(CAST(Satisfaction_Flag AS INT))
                                   FROM dbo.FACT_PASSENGER_SATISFACTION) AS SatisfiedCount,
    CAST((SELECT AVG(CAST(Satisfaction_Flag AS DECIMAL(5,4)))
          FROM dbo.FACT_PASSENGER_SATISFACTION) * 100 AS DECIMAL(5,2))   AS SatisfactionRatePct,
    73.1                                                                  AS SatisfactionTarget,

    -- Loyalty
    (SELECT COUNT(*) FROM dbo.DIM_CUSTOMER WHERE SK_Customer > 0 AND SCD_IsCurrent = 1) AS TotalMembers,
    (SELECT SUM(CAST(IsChurned AS INT)) FROM dbo.DIM_CUSTOMER
     WHERE SK_Customer > 0 AND SCD_IsCurrent = 1)                                       AS ChurnedMembers,
    CAST((SELECT AVG(CAST(IsChurned AS DECIMAL(5,4))) FROM dbo.DIM_CUSTOMER
          WHERE SK_Customer > 0 AND SCD_IsCurrent = 1) * 100 AS DECIMAL(5,2))           AS ChurnRatePct,
    40                                                                                  AS RetentionTarget,

    -- Activite
    (SELECT SUM(TotalFlights)              FROM dbo.FACT_FLIGHT_ACTIVITY)               AS TotalFlights,
    (SELECT SUM(PointsAccumulated)         FROM dbo.FACT_FLIGHT_ACTIVITY)               AS TotalPointsAcc,
    (SELECT SUM(PointsRedeemed)            FROM dbo.FACT_FLIGHT_ACTIVITY)               AS TotalPointsRed,

    -- CLV
    (SELECT AVG(CLV) FROM dbo.DIM_CUSTOMER WHERE SK_Customer > 0 AND SCD_IsCurrent = 1) AS AvgCLV,
    (SELECT SUM(CLV) FROM dbo.DIM_CUSTOMER WHERE SK_Customer > 0 AND SCD_IsCurrent = 1) AS TotalCLV;
GO

/* ============================================================================
   VUE 5 — Flight Activity enrichie (avec dimensions)
   ============================================================================ */
CREATE VIEW dbo.vw_Flight_Activity_Enriched AS
SELECT
    f.SK_Activity,
    f.SK_Customer,
    f.SK_Date,
    f.SK_LoyaltyCard,
    f.SK_Geography,
    -- Mesures
    f.TotalFlights,
    f.Distance,
    f.PointsAccumulated,
    f.PointsRedeemed,
    f.DollarCostPointsRedeemed,
    -- Date
    d.DateValue, d.Year, d.Quarter, d.QuarterLabel,
    d.MonthNumber, d.MonthName, d.IsWeekend,
    -- Carte
    lc.LoyaltyCard,
    -- Geographie
    g.Country, g.Province, g.City
FROM dbo.FACT_FLIGHT_ACTIVITY f
LEFT JOIN dbo.DIM_DATE         d  ON f.SK_Date         = d.SK_Date
LEFT JOIN dbo.DIM_LOYALTY_CARD lc ON f.SK_LoyaltyCard  = lc.SK_LoyaltyCard
LEFT JOIN dbo.DIM_GEOGRAPHY    g  ON f.SK_Geography    = g.SK_Geography
WHERE f.SK_Customer > 0;
GO

/* ============================================================================
   VUE 6 — Impact des retards sur la satisfaction
   Utilisation : graphique dedicacé Page 2
   ============================================================================ */
CREATE VIEW dbo.vw_Delay_Impact AS
SELECT
    CASE
        WHEN ISNULL(DepartureDelay, 0) = 0          THEN '0 - Aucun retard'
        WHEN DepartureDelay BETWEEN 1 AND 30        THEN '1-30 min'
        WHEN DepartureDelay BETWEEN 31 AND 60       THEN '31-60 min'
        WHEN DepartureDelay BETWEEN 61 AND 120      THEN '61-120 min'
        ELSE '> 120 min'
    END AS DelayBucket,
    CASE
        WHEN ISNULL(DepartureDelay, 0) = 0          THEN 1
        WHEN DepartureDelay BETWEEN 1 AND 30        THEN 2
        WHEN DepartureDelay BETWEEN 31 AND 60       THEN 3
        WHEN DepartureDelay BETWEEN 61 AND 120      THEN 4
        ELSE 5
    END AS BucketOrder,
    COUNT(*)                                                                AS Total,
    SUM(CAST(Satisfaction_Flag AS INT))                                     AS Satisfied,
    CAST(AVG(CAST(Satisfaction_Flag AS DECIMAL(5,4))) * 100 AS DECIMAL(5,2)) AS SatisfactionRatePct,
    AVG(CAST(AvgServiceScore AS DECIMAL(5,2)))                              AS AvgScore
FROM dbo.FACT_PASSENGER_SATISFACTION
GROUP BY
    CASE
        WHEN ISNULL(DepartureDelay, 0) = 0          THEN '0 - Aucun retard'
        WHEN DepartureDelay BETWEEN 1 AND 30        THEN '1-30 min'
        WHEN DepartureDelay BETWEEN 31 AND 60       THEN '31-60 min'
        WHEN DepartureDelay BETWEEN 61 AND 120      THEN '61-120 min'
        ELSE '> 120 min'
    END,
    CASE
        WHEN ISNULL(DepartureDelay, 0) = 0          THEN 1
        WHEN DepartureDelay BETWEEN 1 AND 30        THEN 2
        WHEN DepartureDelay BETWEEN 31 AND 60       THEN 3
        WHEN DepartureDelay BETWEEN 61 AND 120      THEN 4
        ELSE 5
    END;
GO

/* ============================================================================
   TEST RAPIDE — verifier que les vues retournent des donnees
   ============================================================================ */
PRINT '═══════════════════════════════════════════════════';
PRINT '   VERIFICATION DES VUES POWER BI';
PRINT '═══════════════════════════════════════════════════';

DECLARE @cnt INT;

SELECT @cnt = COUNT(*) FROM dbo.vw_Satisfaction_Analysis;
PRINT 'vw_Satisfaction_Analysis    : ' + CAST(@cnt AS VARCHAR) + ' lignes';

SELECT @cnt = COUNT(*) FROM dbo.vw_Customer_360;
PRINT 'vw_Customer_360             : ' + CAST(@cnt AS VARCHAR) + ' lignes';

SELECT @cnt = COUNT(*) FROM dbo.vw_Service_Scores;
PRINT 'vw_Service_Scores           : ' + CAST(@cnt AS VARCHAR) + ' lignes';

SELECT @cnt = COUNT(*) FROM dbo.vw_KPI_Summary;
PRINT 'vw_KPI_Summary              : ' + CAST(@cnt AS VARCHAR) + ' lignes (1 attendue)';

SELECT @cnt = COUNT(*) FROM dbo.vw_Flight_Activity_Enriched;
PRINT 'vw_Flight_Activity_Enriched : ' + CAST(@cnt AS VARCHAR) + ' lignes';

SELECT @cnt = COUNT(*) FROM dbo.vw_Delay_Impact;
PRINT 'vw_Delay_Impact             : ' + CAST(@cnt AS VARCHAR) + ' buckets';

PRINT '═══════════════════════════════════════════════════';
PRINT '   AFFICHAGE DU KPI SUMMARY';
PRINT '═══════════════════════════════════════════════════';
SELECT * FROM dbo.vw_KPI_Summary;
GO
