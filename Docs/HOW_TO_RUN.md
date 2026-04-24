# How to Run — Airline Analytics SSIS Pipeline

**Projet :** Airline Analytics Data Warehouse  

---

## Prérequis

| Outil | Version testée | Rôle |
|---|---|---|
| SQL Server | 2019 / 2022 (Express ou +) | Moteur de base de données |
| SQL Server Management Studio (SSMS) | 19+ | Vérification et requêtes |
| Visual Studio | 2022 | Exécution des packages SSIS |
| Extension SSIS | SQL Server Integration Services Projects 2022 | Chargée dans VS |
| OLE DB Driver | MSOLEDBSQL 18/19 | Connexion SSIS → SQL Server |

---

## Étape 1 — Ouvrir le projet dans Visual Studio

1. Ouvrir **Visual Studio 2022**
2. **Fichier → Ouvrir → Projet/Solution**
3. Naviguer vers :
   ```
   ...\Airline_Datawarehouse\Airline_DWH\Airline_DWH.sln
   ```
4. Le projet s'ouvre avec 7 packages dans l'Explorateur de solutions :
   ```
   Airline_DWH
   ├── Master.dtsx
   ├── 00_Create_Database.dtsx
   ├── 01_Load_Staging.dtsx
   ├── 02_Populate_Dimensions.dtsx
   ├── 03_Populate_Facts.dtsx
   ├── 04_Finalize.dtsx
   └── Package.dtsx
   ```

---

## Étape 2 — Changer le nom du serveur SQL (si machine différente)

> **Si vous tournez sur `MEA-JJG4XL3\DEV3`, passez directement à l'Étape 3.**

Le nom du serveur est présent dans **6 packages**. Il faut le modifier dans chacun.

### Procédure (même opération à répéter 6 fois)

Pour chaque package listé ci-dessous :

1. **Double-cliquer** sur le package dans l'Explorateur de solutions
2. Dans le **Gestionnaire de connexions** (panneau en bas), double-cliquer sur `Airline_DWH`
3. Dans la fenêtre qui s'ouvre, changer **`Data Source`** :
   ```
   Avant : MEA-JJG4XL3\DEV3
   Après : VOTRE_SERVEUR\VOTRE_INSTANCE
             (ex: localhost\SQLEXPRESS  ou  .\DEV3  ou  DESKTOP-ABC\SQL2022)
   ```
4. Cliquer **Tester la connexion** → doit afficher "Test de connexion réussi"
5. Cliquer **OK**

### Packages à modifier

| Package | Connexion à changer |
|---|---|
| `Master.dtsx` | Airline_DWH → `Data Source=...` |
| `00_Create_Database.dtsx` | Airline_DWH → `Data Source=...` |
| `01_Load_Staging.dtsx` | Airline_DWH → `Data Source=...` |
| `02_Populate_Dimensions.dtsx` | Airline_DWH → `Data Source=...` |
| `03_Populate_Facts.dtsx` | Airline_DWH → `Data Source=...` |
| `04_Finalize.dtsx` | Airline_DWH → `Data Source=...` |

> **Authentification :** Windows (SSPI) est utilisée par défaut. Si vous utilisez SQL Server Auth, cochez "Utiliser l'authentification SQL Server" et saisissez login/mot de passe.

---

## Étape 3 — Changer les chemins des fichiers CSV (si dossier différent)

> **Si les CSV sont encore dans `C:\Users\RaedCHARRAD\Desktop\...`, passez à l'Étape 4.**

Les 4 chemins de fichiers CSV sont dans **`01_Load_Staging.dtsx`**, dans 4 tâches BULK INSERT.

### Procédure

1. **Double-cliquer** sur `01_Load_Staging.dtsx`
2. Pour chacune des 4 tâches suivantes, **double-cliquer** sur la tâche → onglet **Instruction SQL** → modifier le chemin dans `BULK INSERT ... FROM '...'` :

| Tâche | Fichier CSV | Chemin actuel |
|---|---|---|
| `SQL_BulkLoad_Satisfaction` | `airline_passenger_satisfaction.csv` | `C:\Users\RaedCHARRAD\Desktop\esprit\3eme\Mission entreprise 2\Airline_Datawarehouse\data\` |
| `SQL_BulkLoad_Activity` | `Customer Flight Activity.csv` | même dossier |
| `SQL_BulkLoad_Customer` | `Customer Loyalty History.csv` | même dossier |
| `SQL_BulkLoad_Date` | `Calendar.csv` | même dossier |

**Remplacer uniquement la partie dossier**, garder le nom du fichier :
```sql
-- Avant
FROM 'C:\Users\RaedCHARRAD\Desktop\esprit\3eme\Mission entreprise 2\Airline_Datawarehouse\data\Calendar.csv'

-- Après (exemple)
FROM 'C:\MonDossier\data\Calendar.csv'
```

> **Important :** Le compte SQL Server (`NT SERVICE\MSSQLSERVER` ou `sa`) doit avoir accès en lecture au dossier contenant les CSV. En cas d'erreur "impossible d'accéder", vérifiez les permissions Windows sur le dossier `data\`.

---

## Étape 4 — Vérifier les droits SQL Server

Le pipeline crée deux bases de données (`STAGING_DB` et `DWH_DB`). Le compte doit être **sysadmin** ou avoir les droits `CREATE DATABASE`, `CREATE TABLE`, `BULK INSERT`.

Dans SSMS, vérifier :
```sql
SELECT IS_SRVROLEMEMBER('sysadmin');  -- doit retourner 1
```

---

## Étape 5 — Exécuter le pipeline

1. Dans l'Explorateur de solutions, **clic droit sur `Master.dtsx`**
2. Cliquer **Exécuter le package**
3. Visual Studio ouvre la vue d'exécution — les tâches deviennent **vertes** au fur et à mesure

### Durée approximative

| Phase | Durée estimée |
|---|---|
| 00_Create_Database | < 5 secondes |
| 01_Load_Staging (BULK INSERT + transform) | 30 – 90 secondes |
| 02_Populate_Dimensions | 10 – 30 secondes |
| 03_Populate_Facts | 30 – 60 secondes |
| 04_Finalize (index + stats) | 10 – 20 secondes |
| **Total** | **~2 à 3 minutes** |

### Résultats attendus dans la sortie de VS

```
Staging OK | Satisfaction:129880 Activity:392936 Customer:16737 Date:2557
DWH OK | DIM_DATE:2557 DIM_LCARD:3 DIM_GEO:55 DIM_CUST:16737 DIM_TRAVEL:6 FACT_SAT:129880 FACT_ACT:392936
```

---

## Étape 6 — Vérifier dans SSMS

Ouvrir SSMS, se connecter au serveur, puis exécuter :

```sql
USE DWH_DB;
SELECT tbl, rows FROM (
    SELECT 'DIM_DATE'             tbl, COUNT(*) rows FROM dbo.DIM_DATE          WHERE SK_Date > 0
    UNION ALL SELECT 'DIM_LOYALTY_CARD',  COUNT(*) FROM dbo.DIM_LOYALTY_CARD    WHERE SK_LoyaltyCard > 0
    UNION ALL SELECT 'DIM_GEOGRAPHY',     COUNT(*) FROM dbo.DIM_GEOGRAPHY        WHERE SK_Geography > 0
    UNION ALL SELECT 'DIM_CUSTOMER',      COUNT(*) FROM dbo.DIM_CUSTOMER         WHERE SK_Customer > 0
    UNION ALL SELECT 'DIM_TRAVEL',        COUNT(*) FROM dbo.DIM_TRAVEL           WHERE SK_Travel > 0
    UNION ALL SELECT 'FACT_SAT',          COUNT(*) FROM dbo.FACT_PASSENGER_SATISFACTION
    UNION ALL SELECT 'FACT_ACTIVITY',     COUNT(*) FROM dbo.FACT_FLIGHT_ACTIVITY
) x ORDER BY tbl;
```

**Résultats attendus :**

| tbl | rows |
|---|---|
| DIM_CUSTOMER | 16 737 |
| DIM_DATE | 2 557 |
| DIM_GEOGRAPHY | 55 |
| DIM_LOYALTY_CARD | 3 |
| DIM_TRAVEL | 6 |
| FACT_ACTIVITY | 392 936 |
| FACT_SAT | 129 880 |

---

## Étape 7 — Générer le diagramme dans SSMS (optionnel)

1. Exécuter d'abord ce script pour changer le propriétaire de DWH_DB (nécessaire si créée par un compte Azure AD) :
   ```sql
   ALTER AUTHORIZATION ON DATABASE::DWH_DB TO sa;
   ALTER AUTHORIZATION ON DATABASE::STAGING_DB TO sa;
   ```

2. Si les contraintes FK ne sont pas encore créées, les ajouter :
   ```sql
   USE DWH_DB;
   ALTER TABLE dbo.FACT_PASSENGER_SATISFACTION
       ADD CONSTRAINT FK_FactSat_Date     FOREIGN KEY (SK_Date)      REFERENCES dbo.DIM_DATE(SK_Date),
           CONSTRAINT FK_FactSat_Customer FOREIGN KEY (SK_Customer)  REFERENCES dbo.DIM_CUSTOMER(SK_Customer),
           CONSTRAINT FK_FactSat_Travel   FOREIGN KEY (SK_Travel)    REFERENCES dbo.DIM_TRAVEL(SK_Travel),
           CONSTRAINT FK_FactSat_Geo      FOREIGN KEY (SK_Geography) REFERENCES dbo.DIM_GEOGRAPHY(SK_Geography);
   ALTER TABLE dbo.FACT_FLIGHT_ACTIVITY
       ADD CONSTRAINT FK_FactAct_Customer    FOREIGN KEY (SK_Customer)    REFERENCES dbo.DIM_CUSTOMER(SK_Customer),
           CONSTRAINT FK_FactAct_Date        FOREIGN KEY (SK_Date)        REFERENCES dbo.DIM_DATE(SK_Date),
           CONSTRAINT FK_FactAct_LoyaltyCard FOREIGN KEY (SK_LoyaltyCard) REFERENCES dbo.DIM_LOYALTY_CARD(SK_LoyaltyCard),
           CONSTRAINT FK_FactAct_Geo         FOREIGN KEY (SK_Geography)   REFERENCES dbo.DIM_GEOGRAPHY(SK_Geography);
   ALTER TABLE dbo.DIM_CUSTOMER
       ADD CONSTRAINT FK_DimCust_LoyaltyCard FOREIGN KEY (SK_LoyaltyCard) REFERENCES dbo.DIM_LOYALTY_CARD(SK_LoyaltyCard),
           CONSTRAINT FK_DimCust_Geo         FOREIGN KEY (SK_Geography)   REFERENCES dbo.DIM_GEOGRAPHY(SK_Geography);
   ```

3. Dans SSMS : **DWH_DB → Database Diagrams → clic droit → New Database Diagram** → ajouter les 7 tables → sauvegarder

---

## Résolution des problèmes fréquents

| Erreur | Cause | Solution |
|---|---|---|
| `"Échec de l'exécution — erreurs de build"` au démarrage | DWH_DB n'existe pas encore lors de la validation SSIS | Normal si `DelayValidation=True` est manquant — vérifier que chaque package a `DTS:DelayValidation="True"` |
| `"Niveau de protection différent"` | Un package a `ProtectionLevel=1` au lieu de `0` | Ouvrir le package .dtsx en éditeur XML et vérifier `DTS:ProtectionLevel="0"` |
| `"Impossible d'accéder au fichier CSV"` | Chemin incorrect ou droits insuffisants | Vérifier le chemin dans les 4 tâches BulkLoad de `01_Load_Staging.dtsx` + droits en lecture sur le dossier |
| `"Login failed"` ou `"Cannot open database"` | Mauvais serveur ou authentification | Corriger `Data Source=` dans les 6 Gestionnaires de connexions (Étape 2) |
| `"Données seraient tronquées"` | Colonne trop étroite | Vérifier que `QuarterLabel` est `NVARCHAR(20)` dans `00_Create_Database.dtsx` |
| `"Impossible d'obtenir des informations... AzureAD"` lors du diagramme | DWH_DB possédée par un compte Azure AD | Exécuter `ALTER AUTHORIZATION ON DATABASE::DWH_DB TO sa` |
| Tous les SK sont `-1` dans les FACT | Les DIM sont vides ou les lookups échouent | Vérifier que `02_Populate_Dimensions.dtsx` a bien tourné avant `03_Populate_Facts.dtsx` |
| `"Projet non valide"` à l'ouverture du .sln | Fichier `.dtproj` corrompu ou `ProtectionLevel` incohérent | Ouvrir `Airline_DWH.dtproj` en XML et vérifier que tous les packages ont `ProtectionLevel="0"` |

---

## Récapitulatif des deux seuls fichiers à modifier pour une autre machine

```
SERVEUR SQL  →  6 fichiers (double-clic → Gestionnaire de connexions → Airline_DWH)
  Master.dtsx, 00_Create_Database.dtsx, 01_Load_Staging.dtsx,
  02_Populate_Dimensions.dtsx, 03_Populate_Facts.dtsx, 04_Finalize.dtsx

CHEMINS CSV  →  1 fichier uniquement (01_Load_Staging.dtsx)
  SQL_BulkLoad_Satisfaction  →  chemin vers airline_passenger_satisfaction.csv
  SQL_BulkLoad_Activity      →  chemin vers Customer Flight Activity.csv
  SQL_BulkLoad_Customer      →  chemin vers Customer Loyalty History.csv
  SQL_BulkLoad_Date          →  chemin vers Calendar.csv
```

---

*Airline Analytics DWH — Esprit Engineering, 3ème année — 2026-04-24*
