"""
dashboard.py — Esquemas y Modelos del Menú Principal / Dashboard (MongoDB)
"""

from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field
from backend.models import PyObjectId

class WidgetConfigSchema(BaseModel):
    widget_id: str
    position_order: int
    refresh_interval_ms: int

class DashboardConfigBase(BaseModel):
    layout_version: str = "1.0.0"
    visible_widgets: List[WidgetConfigSchema] = Field(default_factory=list)
    theme_preference: str = "premium_dark"

class DashboardConfigCreate(DashboardConfigBase):
    user_id: PyObjectId

class DashboardConfigResponse(DashboardConfigBase):
    id: PyObjectId = Field(alias="_id")
    user_id: PyObjectId

    class Config:
        populate_by_name = True

class DashboardConfigUpdate(BaseModel):
    layout_version: Optional[str] = None
    visible_widgets: Optional[List[WidgetConfigSchema]] = None
    theme_preference: Optional[str] = None

class DashboardKPICacheResponse(BaseModel):
    id: str = Field(alias="_id")
    owner_id: Optional[PyObjectId] = None
    cached_metrics: Dict[str, int]
    last_cached_at: datetime

    class Config:
        populate_by_name = True
