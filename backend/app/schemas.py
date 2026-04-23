"""Request and response schemas.

All API shapes live in one file so that changes are easy to review and
schema drift between routes is obvious at a glance.
"""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "healthy"
    service: str = "farm-assistant"
    environment: str
    version: str = "0.1.0"


class ErrorBody(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorBody




class FarmLocation(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: str | None = None
    geo_address: str | None = None


class FarmLandSize(BaseModel):
    value: float = Field(..., gt=0)
    unit: Literal["acres", "hectares"]


class FarmBudget(BaseModel):
    amount: float = Field(..., gt=0)
    currency: str = "USD"


class CreateFarmRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    location: FarmLocation
    land_size: FarmLandSize
    budget: FarmBudget



AnalysisStatus = Literal["pending", "processing", "completed", "failed"]




class WeatherAnalysis(BaseModel):
    status: AnalysisStatus = "pending"
    average_temperature: float | None = None
    total_precipitation: float | None = None
    average_humidity: float | None = None
    average_wind_speed: float | None = None
    seasonal_pattern: str | None = None
    analyzed_at: datetime | None = None
    error: str | None = None



class Recommendations(BaseModel):
    status: AnalysisStatus = "pending"
    suggested_crops: list[str] = Field(default_factory=list)
    farming_techniques: list[str] = Field(default_factory=list)
    required_services: list[str] = Field(default_factory=list)
    report: str | None = None
    generated_at: datetime | None = None
    error: str | None = None



class Farm(BaseModel):
    id: str
    user_id: str
    name: str
    location: FarmLocation
    land_size: FarmLandSize
    budget: FarmBudget
    weather_analysis: WeatherAnalysis = Field(default_factory=WeatherAnalysis)
    recommendations: Recommendations = Field(default_factory=Recommendations)
    created_at: datetime
    updated_at: datetime



class AnalysisStatusResponse(BaseModel):
    farm_id: str
    weather_analysis: WeatherAnalysis
    recommendations: Recommendations

# ---- Chat ----

ChatRole = Literal["user", "assistant"]


class ChatMessage(BaseModel):
    id: str
    farm_id: str
    user_id: str
    role: ChatRole
    content: str
    created_at: datetime


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class ChatHistoryResponse(BaseModel):
    farm_id: str
    messages: list[ChatMessage]