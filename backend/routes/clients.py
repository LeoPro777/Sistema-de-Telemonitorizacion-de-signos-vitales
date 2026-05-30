"""
clients.py — Rutas REST de Gestión de Clientes (Módulo 7: Clínicas o Familiares)
"""

import logging
from datetime import datetime
from typing import Optional, List
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field

from backend.services.database import db_service
from backend.routes.auth import get_current_user
from backend.models.user import UserResponse, UserRole, UserStatus
from backend.models.applicant import ClientType
from backend.models.__init__ import PyObjectId

logger = logging.getLogger("app.clients")
router = APIRouter(prefix="/clients", tags=["Gestión de Clientes (M7)"])

# --- ESQUEMAS PYDANTIC ---
class ContactInfoSchema(BaseModel):
    phone: str
    address: str
    emergency_email: str

class SummaryCacheSchema(BaseModel):
    assigned_patients_count: int = 0
    active_critical_alerts: int = 0
    contract_health_percent: int = 100

class ClientUpdate(BaseModel):
    corporate_name: Optional[str] = None
    tax_id: Optional[str] = None
    client_type: Optional[ClientType] = None
    contact_info: Optional[ContactInfoSchema] = None
    is_active: Optional[bool] = None
    contract_health_percent: Optional[int] = Field(None, ge=0, le=100)

# --- RUTAS ---

@router.get("")
async def get_clients(
    current_user: UserResponse = Depends(get_current_user),
    search: Optional[str] = Query(None, description="Buscar por Razón Social o Identificación Fiscal (Tax ID)"),
    client_type: Optional[ClientType] = Query(None, description="Filtrar por tipo (CLINICA, FAMILIAR)"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1)
):
    """
    Lista las cuentas de clientes (Clínicas o Fondeos Familiares) registradas.
    Soporta búsquedas semánticas, filtros por tipo de cliente y paginación NoSQL.
    Solo accesible para Administradores.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores tienen privilegios para consultar las cuentas de clientes."
        )

    query = {}

    # Búsqueda semántica por tax_id o razón social
    if search:
        query["$or"] = [
            {"corporate_name": {"$regex": search, "$options": "i"}},
            {"tax_id": {"$regex": search, "$options": "i"}}
        ]

    # Filtro por tipo de cliente
    if client_type:
        query["client_type"] = client_type

    # Paginación
    skip = (page - 1) * limit
    cursor = db_service.db.clients.find(query).skip(skip).limit(limit)
    clients_list = []

    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if doc.get("user_id"):
            doc["user_id"] = str(doc["user_id"])
        clients_list.append(doc)

    total_count = await db_service.db.clients.count_documents(query)

    return {
        "clients": clients_list,
        "total": total_count,
        "page": page,
        "limit": limit
    }


@router.get("/{id}")
async def get_client_detail(id: str, current_user: UserResponse = Depends(get_current_user)):
    """
    Retorna la ficha técnica y de contacto detallada de un cliente.
    Resuelve reactivamente la lista de pacientes asociados consultando la colección `patients`.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado."
        )

    client = await db_service.db.clients.find_one({"_id": ObjectId(id)})
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cuenta de cliente no encontrada."
        )

    client["_id"] = str(client["_id"])
    if client.get("user_id"):
        client["user_id"] = str(client["user_id"])

    # 1. Obtener la lista tabular de pacientes asociados reactivamente
    patient_cursor = db_service.db.patients.find({"client_id": ObjectId(id)})
    linked_patients = []
    
    active_critical_alerts_count = 0
    assigned_patients_count = 0

    async for pat in patient_cursor:
        assigned_patients_count += 1
        if pat.get("has_active_alert"):
            active_critical_alerts_count += 1
            
        pat_data = {
            "id": str(pat["_id"]),
            "first_name": pat.get("first_name", ""),
            "last_name": pat.get("last_name", ""),
            "medical_record_id": pat.get("medical_record_id", ""),
            "national_id": pat.get("national_id", ""),
            "is_active": pat.get("is_active", True),
            "has_active_alert": pat.get("has_active_alert", False),
            "last_telemetry": pat.get("last_telemetry_cache", {})
        }
        linked_patients.append(pat_data)

    # 2. Sincronizar el caché de summary_cache por si hay desfasajes concurrentes
    contract_health = client.get("summary_cache", {}).get("contract_health_percent", 100)
    
    summary_cache = {
        "assigned_patients_count": assigned_patients_count,
        "active_critical_alerts": active_critical_alerts_count,
        "contract_health_percent": contract_health
    }
    
    await db_service.db.clients.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"summary_cache": summary_cache}}
    )
    
    client["summary_cache"] = summary_cache
    client["patients"] = linked_patients

    return client


@router.put("/{id}")
async def update_client(
    id: str,
    req: ClientUpdate,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Actualiza la ficha técnica o estado contractual del cliente.
    Soporta deactivación lógica. Al desactivar:
    - Modifica `is_active = False` en clients.
    - Sincroniza y cambia el status del usuario a SUSPENDED en la colección `users` para revocar sus accesos.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden modificar cuentas de clientes."
        )

    client = await db_service.db.clients.find_one({"_id": ObjectId(id)})
    if not client:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente no encontrado."
        )

    update_payload = {}
    if req.corporate_name is not None:
        update_payload["corporate_name"] = req.corporate_name
    if req.tax_id is not None:
        update_payload["tax_id"] = req.tax_id
    if req.client_type is not None:
        update_payload["client_type"] = req.client_type.value
    if req.contact_info is not None:
        update_payload["contact_info"] = req.contact_info.model_dump()
    
    if req.contract_health_percent is not None:
        update_payload["summary_cache.contract_health_percent"] = req.contract_health_percent

    if req.is_active is not None:
        update_payload["is_active"] = req.is_active
        # Sincronizar suspensión técnica del usuario
        new_status = UserStatus.ACTIVE if req.is_active else UserStatus.SUSPENDED
        await db_service.db.users.update_one(
            {"_id": ObjectId(client["user_id"])},
            {"$set": {"status": new_status, "updated_at": datetime.utcnow()}}
        )
        logger.info(f"Sincronización del cliente {id} a estado de usuario: {new_status}")

    if not update_payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se indicaron campos para modificar."
        )

    await db_service.db.clients.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_payload}
    )

    return {"message": "Cuenta de cliente modificada con éxito."}
