"""
devices.py — Rutas REST de Gestión de Dispositivos (Módulo 5: Inventario Técnico IoT)
"""

import logging
import asyncio
from datetime import datetime, timezone
from typing import Optional, List
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field

from backend.services.database import db_service
from backend.routes.auth import get_current_user
from backend.models.user import UserResponse, UserRole
from backend.models.__init__ import PyObjectId

logger = logging.getLogger("app.devices")
router = APIRouter(prefix="/devices", tags=["Gestión de Dispositivos (M5)"])

# --- ENUMS EN CÓDIGO ---
# (Basados en databaseschema.md)
# OperationalStatus: AVAILABLE, ASSIGNED, MAINTENANCE
# ApprovalStatus: PENDING_APPROVAL, APPROVED, REJECTED

# --- ESQUEMAS PYDANTIC ---
class HardwareMetricsSchema(BaseModel):
    battery_percent: int = Field(100, ge=0, le=100)
    signal_strength_dbm: int = Field(-50, ge=-110, le=-30)
    last_ping_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ApprovalDetailsSchema(BaseModel):
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[PyObjectId] = None

class DeviceCreate(BaseModel):
    serial_number: str
    mac_address: str
    model_version: str

class DeviceUpdate(BaseModel):
    model_version: Optional[str] = None
    is_active: Optional[bool] = None
    operational_status: Optional[str] = None # AVAILABLE, ASSIGNED, MAINTENANCE
    hardware_metrics: Optional[HardwareMetricsSchema] = None
    has_hardware_alert: Optional[bool] = None

# --- RUTAS ---

@router.get("")
async def get_devices(
    current_user: UserResponse = Depends(get_current_user),
    search: Optional[str] = Query(None, description="Buscar por número de serie o MAC"),
    operational_status: Optional[str] = Query(None, description="Filtrar por estado operacional (AVAILABLE, ASSIGNED, MAINTENANCE)"),
    approval_status: Optional[str] = Query(None, description="Filtrar por estado de aprobación (PENDING_APPROVAL, APPROVED, REJECTED)"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1)
):
    """
    Lista los dispositivos IoT registrados con soporte para búsqueda, filtros operacionales/aprobación y paginación.
    Solo accesible para Administradores (o Doctores en caso de requerirse visualización).
    """
    # En un caso de uso estricto, limitamos a ADMIN
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para ver el inventario técnico de dispositivos."
        )

    query = {}

    # Búsqueda por serial o MAC
    if search:
        query["$or"] = [
            {"serial_number": {"$regex": search, "$options": "i"}},
            {"mac_address": {"$regex": search, "$options": "i"}}
        ]

    # Filtro operacional
    if operational_status:
        query["operational_status"] = operational_status

    # Filtro aprobación
    if approval_status:
        query["approval_status"] = approval_status

    # Paginación
    skip = (page - 1) * limit
    cursor = db_service.db.devices.find(query).skip(skip).limit(limit)
    devices_list = []

    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if doc.get("approval_details") and doc["approval_details"].get("reviewed_by"):
            doc["approval_details"]["reviewed_by"] = str(doc["approval_details"]["reviewed_by"])
        devices_list.append(doc)

    total_count = await db_service.db.devices.count_documents(query)

    return {
        "devices": devices_list,
        "total": total_count,
        "page": page,
        "limit": limit
    }


@router.get("/{id}")
async def get_device_detail(id: str, current_user: UserResponse = Depends(get_current_user)):
    """
    Retorna los detalles técnicos de un dispositivo específico.
    Incluye la caja de texto reactiva que lee en background el paciente asignado en la colección `patients`.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado."
        )

    device = await db_service.db.devices.find_one({"_id": ObjectId(id)})
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispositivo no encontrado."
        )

    device["_id"] = str(device["_id"])
    if device.get("approval_details") and device["approval_details"].get("reviewed_by"):
        device["approval_details"]["reviewed_by"] = str(device["approval_details"]["reviewed_by"])

    # 1. Resolver reactivamente el paciente asignado para evitar redundancia
    # Buscamos en la colección de pacientes el que tenga assigned_device_id == id
    assigned_patient = await db_service.db.patients.find_one({"assigned_device_id": ObjectId(id)})
    
    patient_info = None
    if assigned_patient:
        patient_info = {
            "id": str(assigned_patient["_id"]),
            "first_name": assigned_patient.get("first_name", ""),
            "last_name": assigned_patient.get("last_name", ""),
            "medical_record_id": assigned_patient.get("medical_record_id", "")
        }
    
    device["assigned_patient"] = patient_info

    # 2. Agregar un historial de alertas simulado/real para la bitácora
    # Buscamos en la colección de alertas de este dispositivo
    cursor = db_service.db.alerts.find({"device_id": ObjectId(id)}).sort("created_at", -1).limit(5)
    alerts_history = []
    async for alert in cursor:
        alert["_id"] = str(alert["_id"])
        alert["patient_id"] = str(alert["patient_id"])
        alert["device_id"] = str(alert["device_id"])
        if alert.get("resolved_by"):
            alert["resolved_by"] = str(alert["resolved_by"])
        alerts_history.append(alert)
    
    device["alerts_history"] = alerts_history

    return device


@router.post("/provision")
async def provision_device(req: DeviceCreate, current_user: UserResponse = Depends(get_current_user)):
    """
    Crea una solicitud de provisión técnica para un nuevo dispositivo (desde la fábrica del chip).
    El estado inicial es PENDING_APPROVAL.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden solicitar provisión de hardware."
        )

    # Verificar si ya existe por serial o MAC
    existing = await db_service.db.devices.find_one({
        "$or": [
            {"serial_number": req.serial_number},
            {"mac_address": req.mac_address}
        ]
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un dispositivo con este número de serie o dirección MAC."
        )

    new_device = {
        "serial_number": req.serial_number,
        "mac_address": req.mac_address,
        "model_version": req.model_version,
        "is_active": True,
        "approval_status": "PENDING_APPROVAL",
        "approval_details": {
            "submitted_at": datetime.now(timezone.utc),
            "reviewed_at": None,
            "reviewed_by": None
        },
        "operational_status": "MAINTENANCE",  # En mantenimiento o no disponible hasta que se apruebe
        "hardware_metrics": {
            "battery_percent": 100,
            "signal_strength_dbm": -50,
            "last_ping_at": datetime.now(timezone.utc)
        },
        "has_hardware_alert": False
    }

    result = await db_service.db.devices.insert_one(new_device)
    new_device["_id"] = str(result.inserted_id)
    return new_device


@router.post("/{id}/approve")
async def approve_device(id: str, current_user: UserResponse = Depends(get_current_user)):
    """
    Aprueba la solicitud de provisión de un dispositivo.
    UX REQUISITO: Simula un delay de 1.5s que bloquea la interfaz mostrando animación de procesamiento.
    Cambia el approval_status a APPROVED e inicializa el hardware como AVAILABLE.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden autorizar provisiones de hardware."
        )

    device = await db_service.db.devices.find_one({"_id": ObjectId(id)})
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispositivo no encontrado."
        )

    if device.get("approval_status") == "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El dispositivo ya ha sido aprobado."
        )

    # --- SIMULACIÓN DEL DELAY EXIGIDO EN UI/UX SPEC 5.3 ---
    logger.info(f"Iniciando provisión técnica física del microcontrolador {device['mac_address']}. Esperando 1.5s...")
    await asyncio.sleep(1.5)

    update_payload = {
        "approval_status": "APPROVED",
        "operational_status": "AVAILABLE",
        "approval_details.reviewed_at": datetime.now(timezone.utc),
        "approval_details.reviewed_by": ObjectId(current_user.id)
    }

    await db_service.db.devices.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_payload}
    )

    logger.info(f"Dispositivo {device['mac_address']} aprobado con éxito.")
    return {"message": "Dispositivo aprobado y disponible para asignación clínica."}


@router.post("/{id}/reject")
async def reject_device(id: str, current_user: UserResponse = Depends(get_current_user)):
    """
    Rechaza la solicitud de provisión de un dispositivo.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo los administradores pueden rechazar provisiones de hardware."
        )

    device = await db_service.db.devices.find_one({"_id": ObjectId(id)})
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispositivo no encontrado."
        )

    await db_service.db.devices.update_one(
        {"_id": ObjectId(id)},
        {
            "$set": {
                "approval_status": "REJECTED",
                "operational_status": "MAINTENANCE",
                "approval_details.reviewed_at": datetime.now(timezone.utc),
                "approval_details.reviewed_by": ObjectId(current_user.id)
            }
        }
    )

    return {"message": "Solicitud de provisión técnica rechazada."}


@router.put("/{id}")
async def update_device(
    id: str,
    req: DeviceUpdate,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Actualiza la configuración o estado del dispositivo.
    Permite modificar firmware/model_version o desactivar lógicamente (is_active = False).
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden editar especificaciones técnicas de hardware."
        )

    device = await db_service.db.devices.find_one({"_id": ObjectId(id)})
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dispositivo no encontrado."
        )

    update_payload = {}
    if req.model_version is not None:
        update_payload["model_version"] = req.model_version
    if req.is_active is not None:
        update_payload["is_active"] = req.is_active
    if req.operational_status is not None:
        update_payload["operational_status"] = req.operational_status
    if req.has_hardware_alert is not None:
        update_payload["has_hardware_alert"] = req.has_hardware_alert
    if req.hardware_metrics is not None:
        update_payload["hardware_metrics"] = req.hardware_metrics.model_dump()

    if not update_payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se proporcionaron campos para actualizar."
        )

    await db_service.db.devices.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_payload}
    )

    return {"message": "Dispositivo actualizado con éxito."}
