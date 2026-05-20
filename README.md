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

## 🌐 Web Application (React + FastAPI)

The repo also includes a web app:
- **Frontend** — React (Vite) in `react/my-app/` — landing site, AI travel-concierge chatbot, and a webcam emotion/face feature.
- **Backend** — FastAPI in `backend/main.py` (single server, port **8000**) exposing:
  - `POST /api/travel-concierge` — AI chatbot (via OpenRouter)
  - `POST /tss/auth/analyze-face` — emotion detection (DeepFace)
  - `POST /tss/auth/extract-descriptor`, `/verify-face` — face login (needs MongoDB)
  - `POST /tss/auth/send-otp`, `/verify-otp` — email OTP

### ✅ Prerequisites
- **Python 3.11**
- **Node.js 18+** and npm
- *(Optional)* **MongoDB** on `localhost:27017` — only for face login/OTP, not for the chatbot or emotion detection
- An **OpenRouter API key** — free at https://openrouter.ai/keys (for the chatbot)

### 📦 Datasets
The raw CSVs in `data/` are **not** committed (too large for GitHub). Get them from the team's shared drive and place them in `data/` before running the ML notebooks.

### 1️⃣ Backend setup (`backend/`)
```bash
cd backend
python -m venv .venv

# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt

# Configure secrets:
copy .env.example .env        # Windows  (use: cp .env.example .env on macOS/Linux)
# then edit .env and set OPENROUTER_API_KEY (and SMTP_* / MONGO_* if you need OTP/face login)

uvicorn main:app --port 8000 --reload
```
> First call to `/tss/auth/analyze-face` is slow — DeepFace downloads its model weights once, then caches them.

### 2️⃣ Frontend setup (`react/my-app/`)
```bash
cd react/my-app
npm install
npm run dev
```
Open the printed URL (default **http://localhost:5173**).

### 🔗 How they connect
The frontend calls the backend at `http://localhost:8000`. If you run the backend on a different port, update the URLs in `react/my-app/src/pages/Home.jsx` (`CHAT_API_URL` and the `analyze-face` fetch).

---
