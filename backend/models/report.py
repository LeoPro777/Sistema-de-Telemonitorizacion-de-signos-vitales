"""
report.py — Esquemas y Modelos de Reportes Analíticos (Colección: generated_reports)
"""

from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from backend.models import PyObjectId

class ReportType(str, Enum):
    CLINICAL = "CLINICAL"
    MANAGEMENT = "MANAGEMENT"

class ReportStatus(str, Enum):
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class ReportCreate(BaseModel):
    report_type: ReportType
    start_date: str
    end_date: str
    patient_id: Optional[str] = None

class ReportResponse(BaseModel):
    id: PyObjectId = Field(alias="_id")
    requested_by: PyObjectId
    report_type: ReportType
    parameters: Dict[str, Any]
    status: ReportStatus
    preview_snapshot: Dict[str, Any]
    export_urls: Dict[str, str]
    created_at: datetime

    class Config:
        populate_by_name = True
