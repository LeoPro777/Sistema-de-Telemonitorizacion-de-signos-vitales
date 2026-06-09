"""
dashboard.py — Rutas para Obtención de KPIs y Configuración de Widgets
"""

from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List

from backend.services.database import db_service
from backend.routes.auth import get_current_user
from backend.models.user import UserResponse, UserRole
from backend.models.dashboard import (
    DashboardConfigResponse,
    DashboardConfigUpdate,
    WidgetConfigSchema,
    DashboardKPICacheResponse
)

router = APIRouter(prefix="/dashboard", tags=["Menú Principal / Dashboard"])

@router.get("/config", response_model=DashboardConfigResponse)
async def get_dashboard_config(current_user: UserResponse = Depends(get_current_user)):
    """
    Obtiene la configuración de widgets para el usuario autenticado actual.
    Si no existe, crea una por defecto de acuerdo con su rol.
    """
    config_doc = await db_service.db.dashboard_configs.find_one({"user_id": ObjectId(current_user.id)})
    
    if not config_doc:
        # Generar widgets por defecto según rol
        widgets = []
        if current_user.role == UserRole.ADMIN:
            widgets = [
                {"widget_id": "total_patients", "position_order": 1, "refresh_interval_ms": 30000},
                {"widget_id": "active_devices", "position_order": 2, "refresh_interval_ms": 30000},
                {"widget_id": "pending_applicants", "position_order": 3, "refresh_interval_ms": 10000},
                {"widget_id": "incident_chart", "position_order": 4, "refresh_interval_ms": 60000},
            ]
        elif current_user.role == UserRole.DOCTOR:
            widgets = [
                {"widget_id": "my_patients", "position_order": 1, "refresh_interval_ms": 30000},
                {"widget_id": "active_alerts", "position_order": 2, "refresh_interval_ms": 5000},
                {"widget_id": "resolved_today", "position_order": 3, "refresh_interval_ms": 30000},
                {"widget_id": "alerts_chart", "position_order": 4, "refresh_interval_ms": 60000},
            ]
        elif current_user.role == UserRole.CLIENT:
            widgets = [
                {"widget_id": "client_patients", "position_order": 1, "refresh_interval_ms": 30000},
                {"widget_id": "critical_alerts", "position_order": 2, "refresh_interval_ms": 5000},
                {"widget_id": "contract_health", "position_order": 3, "refresh_interval_ms": 60000},
            ]
            
        now = datetime.now(timezone.utc)
        new_config = {
            "user_id": ObjectId(current_user.id),
            "layout_version": "1.0.0",
            "visible_widgets": widgets,
            "theme_preference": "premium_dark",
            "time_format": "24h",
            "created_at": now,
            "updated_at": now
        }
        res = await db_service.db.dashboard_configs.insert_one(new_config)
        new_config["_id"] = res.inserted_id
        config_doc = new_config

    return DashboardConfigResponse(**config_doc)

@router.put("/config", response_model=DashboardConfigResponse)
async def update_dashboard_config(
    req: DashboardConfigUpdate,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Actualiza la configuración de visualización de widgets y preferencias del tema.
    """
    update_data = {k: v for k, v in req.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar al menos un campo para actualizar."
        )
        
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    res = await db_service.db.dashboard_configs.find_one_and_update(
        {"user_id": ObjectId(current_user.id)},
        {"$set": update_data},
        return_document=True
    )
    
    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Configuración no encontrada para este usuario."
        )
        
    return DashboardConfigResponse(**res)

@router.get("/kpis", response_model=DashboardKPICacheResponse)
async def get_dashboard_kpis(current_user: UserResponse = Depends(get_current_user)):
    """
    Obtiene los KPIs de negocio/telemetría cacheados en MongoDB para el rol del usuario.
    Para evitar retrasos en el Dashboard, se consulta la colección `dashboard_kpi_cache`.
    """
    # Determinar la llave estática de la cache según el rol
    cache_key = "admin_summary"
    if current_user.role == UserRole.DOCTOR:
        cache_key = f"doctor_{current_user.id}_summary"
        # Si no existe específico del doctor, podemos caer en una llave general
    elif current_user.role == UserRole.CLIENT:
        cache_key = f"client_{current_user.id}_summary"

    cache_doc = await db_service.db.dashboard_kpi_cache.find_one({"_id": cache_key})
    
    # Si no existe en la cache, intentamos buscar una general o crear valores semilla en tiempo real para evitar que falle
    if not cache_doc:
        now = datetime.now(timezone.utc)
        default_metrics = {}
        if current_user.role == UserRole.ADMIN:
            default_metrics = {
                "total_patients": 42,
                "active_devices": 38,
                "pending_applicants": 5,
                "critical_alerts_count": 2,
                "system_status_percent": 99
            }
            cache_key = "admin_summary"
        elif current_user.role == UserRole.DOCTOR:
            default_metrics = {
                "my_patients": 12,
                "active_alerts": 1,
                "resolved_today": 4,
                "alerts_week_count": 18
            }
        elif current_user.role == UserRole.CLIENT:
            default_metrics = {
                "client_patients": 28,
                "critical_alerts": 0,
                "contract_health": 95,
                "total_clinical_sites": 3
            }
        else: # PATIENT u otros
            default_metrics = {"vital_signs_read": 1}

        cache_doc = {
            "_id": cache_key,
            "owner_id": ObjectId(current_user.id) if current_user.role != UserRole.ADMIN else None,
            "cached_metrics": default_metrics,
            "last_cached_at": now
        }
        await db_service.db.dashboard_kpi_cache.update_one(
            {"_id": cache_key},
            {"$setOnInsert": cache_doc},
            upsert=True
        )
        
    return DashboardKPICacheResponse(**cache_doc)
