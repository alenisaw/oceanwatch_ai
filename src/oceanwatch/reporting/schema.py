from datetime import datetime

from pydantic import BaseModel, Field


class SourceInfo(BaseModel):
    image_id: str
    sensor: str
    channels: list[str]


class Centroid(BaseModel):
    x: int
    y: int


class MaskSummary(BaseModel):
    regions_detected: int = Field(ge=0)
    largest_region_ratio: float = Field(ge=0.0, le=1.0)
    centroid: Centroid | None = None


class ModelInfo(BaseModel):
    segmentation_model: str
    reporting_mode: str
    runtime: str


class IncidentReport(BaseModel):
    incident_id: str
    created_at: datetime
    source: SourceInfo
    incident_type: str
    risk_level: str
    confidence: float = Field(ge=0.0, le=1.0)
    affected_pixel_ratio: float = Field(ge=0.0, le=1.0)
    estimated_area_km2: float | None = None
    mask_summary: MaskSummary
    uncertainty: list[str]
    recommended_actions: list[str]
    model: ModelInfo
    report: str
