# ✈️ Airline Passenger Satisfaction – ETL & Data Warehouse Project

## 📌 Project Overview

This project is an end-to-end **ETL (Extract, Transform, Load) pipeline** built to analyze airline passenger satisfaction data.

The goal is to transform raw data into a **clean and structured dataset** ready for business intelligence analysis using Power BI.

---

## 🧱 Project Architecture
## 🛠️ Technologies Used

- SQL Server (Staging Database)
- SSIS (Data Flow Tasks)
- Python (Pandas, SQLAlchemy)
- Power BI (Visualization)
- Git & GitHub (Version Control)

---

## 📂 Dataset Description

The dataset contains **31,866 airline passenger records** including:

- Customer demographics
- Flight information
- Service quality ratings
- Satisfaction level

---

## 🗄️ Database Structure

### 🔹 Staging Table
`stg_airline_satisfaction`

Used to store raw data directly from CSV files without transformation.

### 🔹 Clean Table
`clean_airline_satisfaction`

Final cleaned dataset used for analysis and reporting.

---

## 🧹 Data Cleaning Process

The following transformations were applied using Python (Pandas):

### ✔ Data Quality Handling
- Removed duplicate records
- Handled missing values using median imputation
- Standardized text values (uppercase formatting)

### ✔ Feature Engineering
- Created binary target variable:
  - `Satisfaction_Flag`
    - SATISFIED → 1  
    - NEUTRAL OR DISSATISFIED → 0  

### ✔ Column Standardization
- Gender, Customer Type, Travel Type, Class normalized
- Numeric rating columns validated and cleaned

### ✔ Column Removal
- Removed unnecessary `ID` column for analysis

---

## 📊 Final Dataset Features

- Customer demographics (Gender, Age, Type)
- Flight details (Distance, Delays)
- Service quality ratings (1–5 scale)
- Satisfaction label (binary)

---

## ⚙️ ETL Pipeline Workflow

1. **Extract**
   - Load CSV files into SQL Server staging tables

2. **Transform**
   - Clean data using Python (Pandas)
   - Handle missing values and inconsistencies
   - Apply feature engineering

3. **Load**
   - Store cleaned data into SQL Server clean table

---

## 📈 Business Objectives

- Analyze factors influencing passenger satisfaction
- Identify key service improvements
- Build interactive dashboards in Power BI
- Support data-driven decision making

---

## 📊 Power BI Use Cases

- Satisfaction rate by class
- Delay impact on customer satisfaction
- Service quality performance analysis
- Customer segmentation

---
