/****** Object:  Table [dbo].[clean_airline_satisfaction]    Script Date: 22/04/2026 17:07:35 ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[clean_airline_satisfaction](
	[Gender] [varchar](max) NULL,
	[Age] [bigint] NULL,
	[CustomerType] [varchar](max) NULL,
	[TypeOfTravel] [varchar](max) NULL,
	[Class] [varchar](max) NULL,
	[FlightDistance] [bigint] NULL,
	[DepartureDelay] [bigint] NULL,
	[ArrivalDelay] [bigint] NULL,
	[DepartureArrivalTimeConvenience] [bigint] NULL,
	[EaseOfOnlineBooking] [bigint] NULL,
	[CheckInService] [bigint] NULL,
	[OnlineBoarding] [bigint] NULL,
	[GateLocation] [bigint] NULL,
	[OnBoardService] [bigint] NULL,
	[SeatComfort] [bigint] NULL,
	[LegRoomService] [bigint] NULL,
	[Cleanliness] [bigint] NULL,
	[FoodAndDrink] [bigint] NULL,
	[InFlightService] [bigint] NULL,
	[InFlightWifiService] [bigint] NULL,
	[InFlightEntertainment] [bigint] NULL,
	[BaggageHandling] [bigint] NULL,
	[Satisfaction_Flag] [bigint] NULL
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO