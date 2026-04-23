CREATE DATABASE DWH_DB;
GO

CREATE TABLE Dim_Customer (
    CustomerID INT IDENTITY PRIMARY KEY,
    Gender VARCHAR(50),
    Age INT,
    CustomerType VARCHAR(50)
);

CREATE TABLE Dim_Travel (
    TravelID INT IDENTITY PRIMARY KEY,
    TypeOfTravel VARCHAR(50),
    Class VARCHAR(50)
);

CREATE TABLE Fact_Satisfaction (
    FactID INT IDENTITY PRIMARY KEY,
    CustomerID INT,
    TravelID INT,
    FlightDistance INT,
    DepartureDelay INT,
    ArrivalDelay INT,
    Satisfaction_Flag INT,
    FOREIGN KEY (CustomerID) REFERENCES Dim_Customer(CustomerID),
    FOREIGN KEY (TravelID) REFERENCES Dim_Travel(TravelID)
);
 /****** Remplissage Dim_Customer ******/

INSERT INTO Dim_Customer (Gender, Age, CustomerType)
SELECT DISTINCT Gender, Age, CustomerType
FROM STAGING_DB.dbo.clean_airline_satisfaction;

 /****** Remplissage  Dim_Travel ******/

INSERT INTO Dim_Travel (TypeOfTravel, Class)
SELECT DISTINCT TypeOfTravel, Class
FROM STAGING_DB.dbo.clean_airline_satisfaction;

 /****** Charger la table de faits ******/

INSERT INTO Fact_Satisfaction (
    CustomerID,
    TravelID,
    FlightDistance,
    DepartureDelay,
    ArrivalDelay,
    Satisfaction_Flag
)
SELECT 
    c.CustomerID,
    t.TravelID,
    s.FlightDistance,
    s.DepartureDelay,
    s.ArrivalDelay,
    s.Satisfaction_Flag
FROM STAGING_DB.dbo.clean_airline_satisfaction s
JOIN Dim_Customer c
    ON s.Gender = c.Gender
    AND s.Age = c.Age
    AND s.CustomerType = c.CustomerType
JOIN Dim_Travel t
    ON s.TypeOfTravel = t.TypeOfTravel
    AND s.Class = t.Class;