import pandas as pd
from sqlalchemy import create_engine
import urllib

# -----------------------------
# CONNECTION (SQL SERVER)
# -----------------------------
connection_string = urllib.parse.quote_plus(
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=localhost;"
    "DATABASE=STAGING_DB;"
    "Trusted_Connection=yes;"
)

engine = create_engine("mssql+pyodbc:///?odbc_connect=" + connection_string)

# -----------------------------
# EXTRACT
# -----------------------------
df = pd.read_sql("SELECT * FROM stg_airline_satisfaction", engine)

# -----------------------------
# GENERAL CLEANING
# -----------------------------

# 1. Remove duplicates
df = df.drop_duplicates()

# 2. ===========================
# FIX MISSING VALUES (SPECIFIC RULES)
# ===========================

# Arrival Delay → median (important column)
df['ArrivalDelay'] = df['ArrivalDelay'].fillna(df['ArrivalDelay'].median())

# FlightDistance → median
df['FlightDistance'] = df['FlightDistance'].fillna(df['FlightDistance'].median())

# Delay + rating columns → median fill
rating_cols = [
    'DepartureDelay', 'DepartureArrivalTimeConvenience',
    'EaseOfOnlineBooking', 'CheckInService', 'OnlineBoarding',
    'GateLocation', 'OnBoardService', 'SeatComfort',
    'LegRoomService', 'Cleanliness', 'FoodAndDrink',
    'InFlightService', 'InFlightWifiService',
    'InFlightEntertainment', 'BaggageHandling'
]

df[rating_cols] = df[rating_cols].fillna(df[rating_cols].median())

# 3. ===========================
# STANDARDIZE TEXT COLUMNS
# ===========================
text_cols = ['Gender', 'CustomerType', 'TypeOfTravel', 'Class', 'Satisfaction']

for col in text_cols:
    df[col] = df[col].str.upper()

# 4. ===========================
# FEATURE ENGINEERING (TARGET)
# ===========================
df['Satisfaction_Flag'] = df['Satisfaction'].map({
    'SATISFIED': 1,
    'NEUTRAL OR DISSATISFIED': 0
})

# 5. ===========================
# REMOVE UNUSED COLUMN
# ===========================
df_clean = df.drop(columns=['ID', 'Satisfaction'])

# -----------------------------
# LOAD TO CLEAN TABLE
# -----------------------------
df_clean.to_sql(
    'clean_airline_satisfaction',
    con=engine,
    if_exists='replace',
    index=False
)