"""
dashboard.py — Rutas para Obtención de KPIs y Configuración de Widgets
"""

from datetime import datetime, timezone, timedelta
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Dict, Any

from backend.services.database import db_service
from backend.routes.auth import get_current_user
from backend.models.user import UserResponse, UserRole
from backend.models.dashboard import (
    DashboardConfigResponse,
    DashboardConfigUpdate,
    WidgetConfigSchema,
    DashboardKPICacheResponse,
    DashboardInitResponse
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

@router.get("/init", response_model=DashboardInitResponse)
async def get_dashboard_init(current_user: UserResponse = Depends(get_current_user)):
    """
    Inicializa el dashboard para el usuario autenticado leyendo su sesión,
    identificando su UserRole y retornando la versión del layout y la configuración.
    """
    config = await get_dashboard_config(current_user)
    return {
        "role": current_user.role,
        "layout_version": config.layout_version,
        "theme_preference": config.theme_preference,
        "visible_widgets": config.visible_widgets,
        "time_format": config.time_format
    }

async def calculate_live_kpis(user_id: ObjectId, role: UserRole) -> Dict[str, Any]:
    """
    Realiza los procesos agregados sobre la base de datos en tiempo real.
    Garantiza consistencia si el worker Celery de background no estuviese activo.
    """
    now = datetime.now(timezone.utc)
    
    if role == UserRole.ADMIN:
        # 1. Clientes Activos
        active_clients = await db_service.db.clients.count_documents({"is_active": True})
        
        # 2. Pacientes Activos
        active_patients = await db_service.db.patients.count_documents({"is_active": True})
        
        # 3. Doctores Activos
        active_doctors = await db_service.db.doctors.count_documents({"is_active": True})
        
        # 4. Dispositivos Activos
        active_devices = await db_service.db.devices.count_documents({"is_active": True})

        # 5. Obtener lista de aspirantes pendientes (para el panel reducido)
        pending_list = []
        cursor = db_service.db.applicants.find({"status": "PENDING_APPROVAL"}).limit(10)
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            if "submitted_at" in doc and isinstance(doc["submitted_at"], datetime):
                doc["submitted_at"] = doc["submitted_at"].isoformat()
            pending_list.append(doc)
            
        pending_applicants_count = await db_service.db.applicants.count_documents({"status": "PENDING_APPROVAL"})
        
        # 6. Alertas críticas activas totales
        active_alerts_count = await db_service.db.alerts.count_documents({"status": "ACTIVE"})
        
        return {
            "active_clients": active_clients,
            "active_patients": active_patients,
            "active_doctors": active_doctors,
            "active_devices": active_devices,
            "pending_applicants_count": pending_applicants_count,
            "pending_applicants_list": pending_list,
            "critical_alerts_count": active_alerts_count
        }
        
    elif role == UserRole.DOCTOR:
        doctor = await db_service.db.doctors.find_one({"user_id": user_id})
        if not doctor:
            return {
                "my_patients": 0,
                "critical_patients_count": 0,
                "critical_patients_details": [],
                "critical_alerts_count": 0
            }
            
        doctor_id = doctor["_id"]
        
        # Pacientes
        assigned_patients = []
        async for p in db_service.db.patients.find({"assigned_doctor_id": doctor_id, "is_active": True}):
            assigned_patients.append(p)
            
        my_patients = len(assigned_patients)
        
        # Obtener detalles de pacientes críticos
        critical_patients_details = []
        async for p in db_service.db.patients.find({
            "assigned_doctor_id": doctor_id,
            "is_active": True,
            "has_active_alert": True
        }):
            device_info = None
            if p.get("assigned_device_id"):
                dev = await db_service.db.devices.find_one({"_id": p["assigned_device_id"]})
                if dev:
                    device_info = {
                        "serial_number": dev.get("serial_number", ""),
                        "mac_address": dev.get("mac_address", ""),
                        "battery_percent": dev.get("hardware_metrics", {}).get("battery_percent", 100),
                        "signal_strength_dbm": dev.get("hardware_metrics", {}).get("signal_strength_dbm", -50)
                    }
            
            critical_patients_details.append({
                "id": str(p["_id"]),
                "first_name": p.get("first_name", ""),
                "last_name": p.get("last_name", ""),
                "medical_record_id": p.get("medical_record_id", ""),
                "last_telemetry_cache": p.get("last_telemetry_cache"),
                "device_info": device_info
            })
            
        critical_patients_count = len(critical_patients_details)
        
        # Alertas críticas activas reales para los pacientes de este doctor
        patient_ids = [ObjectId(p["id"]) for p in critical_patients_details]
        active_alerts_count = await db_service.db.alerts.count_documents({
            "patient_id": {"$in": patient_ids},
            "status": "ACTIVE"
        })
        
        return {
            "my_patients": my_patients,
            "critical_patients_count": critical_patients_count,
            "critical_patients_details": critical_patients_details,
            "critical_alerts_count": active_alerts_count
        }
        
    elif role == UserRole.CLIENT:
        client = await db_service.db.clients.find_one({"user_id": user_id})
        if not client:
            return {
                "client_patients": 0,
                "critical_patients_count": 0,
                "critical_patients_details": [],
                "critical_alerts_count": 0
            }
            
        client_id = client["_id"]
        
        # Pacientes
        funded_patients = []
        async for p in db_service.db.patients.find({"client_id": client_id, "is_active": True}):
            funded_patients.append(p)
            
        client_patients = len(funded_patients)
        
        # Obtener detalles de pacientes críticos
        critical_patients_details = []
        async for p in db_service.db.patients.find({
            "client_id": client_id,
            "is_active": True,
            "has_active_alert": True
        }):
            device_info = None
            if p.get("assigned_device_id"):
                dev = await db_service.db.devices.find_one({"_id": p["assigned_device_id"]})
                if dev:
                    device_info = {
                        "serial_number": dev.get("serial_number", ""),
                        "mac_address": dev.get("mac_address", ""),
                        "battery_percent": dev.get("hardware_metrics", {}).get("battery_percent", 100),
                        "signal_strength_dbm": dev.get("hardware_metrics", {}).get("signal_strength_dbm", -50)
                    }
            
            critical_patients_details.append({
                "id": str(p["_id"]),
                "first_name": p.get("first_name", ""),
                "last_name": p.get("last_name", ""),
                "medical_record_id": p.get("medical_record_id", ""),
                "last_telemetry_cache": p.get("last_telemetry_cache"),
                "device_info": device_info
            })
            
        critical_patients_count = len(critical_patients_details)
        
        # Alertas críticas activas reales para los pacientes de este cliente
        patient_ids = [ObjectId(p["id"]) for p in critical_patients_details]
        active_alerts_count = await db_service.db.alerts.count_documents({
            "patient_id": {"$in": patient_ids},
            "status": "ACTIVE"
        })
        
        return {
            "client_patients": client_patients,
            "critical_patients_count": critical_patients_count,
            "critical_patients_details": critical_patients_details,
            "critical_alerts_count": active_alerts_count
        }
    
    return {}


@router.get("/kpis", response_model=DashboardKPICacheResponse)
async def get_dashboard_kpis(current_user: UserResponse = Depends(get_current_user)):
    """
    Obtiene los KPIs del dashboard de la colección dashboard_kpi_cache.
    Si está vacío o expira (>5 minutos), calcula los datos asíncronamente en caliente.
    """
    cache_key = "admin_summary"
    if current_user.role == UserRole.DOCTOR:
        cache_key = f"doctor_{current_user.id}_summary"
    elif current_user.role == UserRole.CLIENT:
        cache_key = f"client_{current_user.id}_summary"

    cache_doc = await db_service.db.dashboard_kpi_cache.find_one({"_id": cache_key})
    
    now = datetime.now(timezone.utc)
    needs_recalculation = False
    
    if not cache_doc:
        needs_recalculation = True
    else:
        last_cached = cache_doc.get("last_cached_at")
        if last_cached:
            if last_cached.tzinfo is None:
                last_cached = last_cached.replace(tzinfo=timezone.utc)
            if (now - last_cached) > timedelta(minutes=5):
                needs_recalculation = True
                
    if needs_recalculation:
        try:
            metrics = await calculate_live_kpis(ObjectId(current_user.id), current_user.role)
            cache_doc = {
                "_id": cache_key,
                "owner_id": ObjectId(current_user.id) if current_user.role != UserRole.ADMIN else None,
                "cached_metrics": metrics,
                "last_cached_at": now
            }
            await db_service.db.dashboard_kpi_cache.update_one(
                {"_id": cache_key},
                {"$set": cache_doc},
                upsert=True
            )
        except Exception as e:
            # Fallback en caso de error para no romper la UI
            if not cache_doc:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error al calcular KPIs iniciales: {str(e)}"
                )
                
    return DashboardKPICacheResponse(**cache_doc)


async def invalidate_dashboard_kpis(patient_id):
    """
    Elimina del caché de KPIs las entradas del administrador, del médico asignado 
    y del cliente asignado al paciente. Esto obliga a recalcular los datos en la 
    siguiente petición del frontend.
    """
    try:
        p_id = ObjectId(patient_id) if isinstance(patient_id, str) else patient_id
        patient = await db_service.db.patients.find_one({"_id": p_id})
        if not patient:
            return

        # Claves de caché que deben ser invalidadas
        keys_to_delete = ["admin_summary"]

        doc_id = patient.get("assigned_doctor_id")
        if doc_id:
            d_id = ObjectId(doc_id) if isinstance(doc_id, str) else doc_id
            doctor = await db_service.db.doctors.find_one({"_id": d_id})
            if doctor and doctor.get("user_id"):
                keys_to_delete.append(f"doctor_{doctor['user_id']}_summary")

        cl_id = patient.get("client_id")
        if cl_id:
            c_id = ObjectId(cl_id) if isinstance(cl_id, str) else cl_id
            client = await db_service.db.clients.find_one({"_id": c_id})
            if client and client.get("user_id"):
                keys_to_delete.append(f"client_{client['user_id']}_summary")

        await db_service.db.dashboard_kpi_cache.delete_many({"_id": {"$in": keys_to_delete}})
    except Exception as e:
        import logging
        logging.getLogger("app.dashboard").error(
            f"Error al invalidar caché de KPIs del dashboard para el paciente {patient_id}: {e}"
        )

