"""
doctors.py — Rutas REST de Gestión de Doctores (Módulo 6: Gestión de Doctores)
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
from backend.models.__init__ import PyObjectId

logger = logging.getLogger("app.doctors")
router = APIRouter(prefix="/doctors", tags=["Gestión de Doctores (M6)"])

# --- ESQUEMAS PYDANTIC ---
class ContactSchema(BaseModel):
    phone: str
    office_location: str

class DoctorUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    specialty: Optional[str] = None
    contact: Optional[ContactSchema] = None
    is_active: Optional[bool] = None
    view_type: Optional[str] = None # CARDS, LIST (para ui_preferences)

# --- RUTAS ---

@router.get("")
async def get_doctors(
    current_user: UserResponse = Depends(get_current_user),
    search: Optional[str] = Query(None, description="Buscar por nombre, licencia médica o ID interno"),
    specialty: Optional[str] = Query(None, description="Filtrar por especialidad médica"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1)
):
    """
    Obtiene la lista de doctores registrados.
    Soporta búsqueda semántica, filtrado por especialidad y paginación.
    Solo accesible para Administradores y Doctores.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.DOCTOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tiene permisos para ver el personal médico."
        )

    query = {}

    # Búsqueda semántica (Nombre, Apellido, Licencia o ID interno de personal)
    if search:
        query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"license_number": {"$regex": search, "$options": "i"}},
            {"internal_staff_id": {"$regex": search, "$options": "i"}}
        ]

    # Filtro por especialidad
    if specialty:
        query["specialty"] = specialty

    # Paginación
    skip = (page - 1) * limit
    cursor = db_service.db.doctors.find(query).skip(skip).limit(limit)
    doctors_list = []

    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if doc.get("user_id"):
            doc["user_id"] = str(doc["user_id"])
        doctors_list.append(doc)

    total_count = await db_service.db.doctors.count_documents(query)

    return {
        "doctors": doctors_list,
        "total": total_count,
        "page": page,
        "limit": limit
    }


@router.get("/specialties")
async def get_specialties(current_user: UserResponse = Depends(get_current_user)):
    """
    Retorna la lista de todas las especialidades médicas únicas registradas.
    Permite poblar filtros en el frontend.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.DOCTOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado."
        )

    specialties = await db_service.db.doctors.distinct("specialty")
    # Filtrar None o vacíos
    specialties = [s for s in specialties if s]
    return {"specialties": specialties}


@router.get("/{id}")
async def get_doctor_detail(id: str, current_user: UserResponse = Depends(get_current_user)):
    """
    Retorna la ficha técnica y de contacto detallada de un médico específico.
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.DOCTOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado."
        )

    doctor = await db_service.db.doctors.find_one({"_id": ObjectId(id)})
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor no encontrado."
        )

    doctor["_id"] = str(doctor["_id"])
    if doctor.get("user_id"):
        doctor["user_id"] = str(doctor["user_id"])

    # 1. Contar pacientes asignados de forma dinámica y exacta para consistencia eventual
    active_patients_count = await db_service.db.patients.count_documents({
        "assigned_doctor_id": ObjectId(id),
        "is_active": True
    })
    
    # Sincronizar el campo en caché por si hay diferencias de concurrencia
    await db_service.db.doctors.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"active_patients_count": active_patients_count}}
    )
    
    doctor["active_patients_count"] = active_patients_count

    # 2. Agregar registros de auditoría de actividad del médico desde audit_logs
    # (Mapea logs del motor donde el actor sea el user_id de este doctor)
    audit_cursor = db_service.db.audit_logs.find({
        "actor.user_id": ObjectId(doctor["user_id"])
    }).sort("timestamp", -1).limit(5)
    
    audit_logs = []
    async for log in audit_cursor:
        log["_id"] = str(log["_id"])
        log["actor"]["user_id"] = str(log["actor"]["user_id"])
        audit_logs.append(log)
        
    doctor["audit_logs"] = audit_logs

    return doctor


@router.put("/{id}")
async def update_doctor(
    id: str,
    req: DoctorUpdate,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Actualiza la ficha del médico.
    Soporta la deactivación lógica. Al desactivar:
    - Cambia is_active a False en la colección doctors.
    - Sincroniza y cambia el status a SUSPENDED en la colección users para denegar su acceso inmediato.
    """
    if current_user.role != UserRole.ADMIN and str(current_user.id) != id:
        # Un doctor solo puede editarse a sí mismo; el Admin puede editar a cualquiera
        # Buscamos si el ID proveído corresponde al user_id del doctor
        doctor_doc = await db_service.db.doctors.find_one({"_id": ObjectId(id)})
        if not doctor_doc or str(doctor_doc.get("user_id")) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos para modificar este perfil médico."
            )

    doctor = await db_service.db.doctors.find_one({"_id": ObjectId(id)})
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor no encontrado."
        )

    update_payload = {}
    if req.first_name is not None:
        update_payload["first_name"] = req.first_name
    if req.last_name is not None:
        update_payload["last_name"] = req.last_name
    if req.specialty is not None:
        update_payload["specialty"] = req.specialty
    if req.contact is not None:
        update_payload["contact"] = req.contact.model_dump()
    if req.view_type is not None:
        update_payload["ui_preferences.view_type"] = req.view_type

    if req.is_active is not None:
        update_payload["is_active"] = req.is_active
        # Si se desactiva, bloqueamos el acceso en la colección `users`
        new_user_status = UserStatus.ACTIVE if req.is_active else UserStatus.SUSPENDED
        await db_service.db.users.update_one(
            {"_id": ObjectId(doctor["user_id"])},
            {"$set": {"status": new_user_status, "updated_at": datetime.utcnow()}}
        )
        logger.info(f"Sincronización del estado del usuario {doctor['user_id']} a {new_user_status} por deactivación médica.")

    if not update_payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se proporcionaron campos para actualizar."
        )

    await db_service.db.doctors.update_one(
        {"_id": ObjectId(id)},
        {"$set": update_payload}
    )

    return {"message": "Médico actualizado exitosamente."}
