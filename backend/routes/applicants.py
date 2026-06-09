"""
applicants.py — Rutas para Onboarding de Aspirantes y Aprobación Administrativa
"""

from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import Optional, List

from backend.services.database import db_service
from backend.routes.auth import get_current_user
from backend.models.user import UserResponse, UserStatus, UserRole
from backend.models.applicant import ApplicantResponse, ApprovalStatus, ClientType

router = APIRouter(prefix="/applicants", tags=["Onboarding / Aspirantes"])

class ReviewRequest(BaseModel):
    status: ApprovalStatus
    rejection_reason: Optional[str] = None

@router.get("")
async def get_applicants(
    current_user: UserResponse = Depends(get_current_user),
    status_filter: Optional[ApprovalStatus] = Query(None, alias="status", description="Filtrar por estado (PENDING_APPROVAL, APPROVED, REJECTED)"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1)
):
    """
    Obtiene la lista de solicitudes de aspirantes registradas en el sistema.
    Ordenada cronológicamente descendente por fecha de envío.
    Solo accesible para Administradores.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso restringido a administradores."
        )

    query = {}
    if status_filter:
        query["status"] = status_filter.value

    skip = (page - 1) * limit
    cursor = db_service.db.applicants.find(query).sort("submitted_at", -1).skip(skip).limit(limit)
    applicants_list = []

    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        if doc.get("audit_review") and doc["audit_review"].get("reviewed_by"):
            doc["audit_review"]["reviewed_by"] = str(doc["audit_review"]["reviewed_by"])
        applicants_list.append(doc)

    total_count = await db_service.db.applicants.count_documents(query)

    return {
        "applicants": applicants_list,
        "total": total_count,
        "page": page,
        "limit": limit
    }

@router.get("/status", response_model=ApplicantResponse)

async def get_applicant_status(current_user: UserResponse = Depends(get_current_user)):
    """
    Retorna el estado de la solicitud de onboarding del usuario actual.
    Utiliza el email del usuario logueado para buscar en la colección `applicants`.
    """
    applicant_doc = await db_service.db.applicants.find_one({
        "personal_data.email": current_user.email
    })
    
    if not applicant_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se encontró una solicitud de onboarding para este usuario."
        )
        
    return ApplicantResponse(**applicant_doc)

@router.post("/{email}/review")
async def review_applicant(email: str, req: ReviewRequest):
    """
    Simula la acción de un Administrador aprobando/rechazando a un aspirante.
    Muta el estado del aspirante en `applicants` y activa el usuario en `users`.
    Además, crea el perfil correspondiente en `doctors` o `clients` si se aprueba.
    """
    # 1. Buscar al aspirante
    applicant_doc = await db_service.db.applicants.find_one({"personal_data.email": email})
    if not applicant_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aspirante no encontrado."
        )

    # 2. Buscar al usuario asociado
    user_doc = await db_service.db.users.find_one({"email": email})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario asociado no encontrado."
        )

    now = datetime.now(timezone.utc)

    # 3. Actualizar la solicitud del aspirante
    audit_review = {
        "reviewed_by": None,  # Simulado
        "reviewed_at": now,
        "rejection_reason": req.rejection_reason if req.status == ApprovalStatus.REJECTED else None
    }
    
    await db_service.db.applicants.update_one(
        {"_id": applicant_doc["_id"]},
        {
            "$set": {
                "status": req.status,
                "audit_review": audit_review
            }
        }
    )

    # 4. Actualizar el estado del usuario
    user_status = UserStatus.APPROVED if req.status == ApprovalStatus.APPROVED else UserStatus.PENDING_APPROVAL
    if req.status == ApprovalStatus.REJECTED:
        user_status = UserStatus.REJECTED
        
    await db_service.db.users.update_one(
        {"_id": user_doc["_id"]},
        {
            "$set": {
                "status": user_status.value,
                "updated_at": now
            }
        }
    )

    # 5. Si es APROBADO, crear su entidad correspondiente en doctors o clients
    if req.status == ApprovalStatus.APPROVED:
        role = user_doc["role"]
        personal = applicant_doc["personal_data"]
        metadata = applicant_doc["professional_metadata"]

        if role == UserRole.DOCTOR:
            # Crear perfil de doctor
            doctor_doc = {
                "_id": ObjectId(),
                "user_id": user_doc["_id"],
                "is_active": True,
                "ui_preferences": {"view_type": "CARDS"},
                "license_number": metadata.get("medical_license", "LIC-DEMO-123"),
                "internal_staff_id": f"STAFF-{personal['identification_number'][-4:]}",
                "first_name": personal["first_name"],
                "last_name": personal["last_name"],
                "specialty": metadata.get("specialty", "Medicina General"),
                "contact": {
                    "phone": personal["phone"],
                    "office_location": "Consultorio 301, Clinica Central"
                },
                "active_patients_count": 0,
                "created_at": now,
                "updated_at": now
            }
            # Guardar si no existe
            await db_service.db.doctors.update_one(
                {"user_id": user_doc["_id"]},
                {"$setOnInsert": doctor_doc},
                upsert=True
            )

        elif role == UserRole.CLIENT:
            # Crear perfil de cliente
            client_doc = {
                "_id": ObjectId(),
                "user_id": user_doc["_id"],
                "is_active": True,
                "status": "APPROVED",
                "client_type": metadata.get("client_type", ClientType.CLINICA),
                "corporate_name": metadata.get("corporate_name", f"{personal['first_name']} Familia"),
                "tax_id": metadata.get("tax_id", f"TAX-{personal['identification_number']}"),
                "contact_info": {
                    "phone": personal["phone"],
                    "address": "Dirección registrada de Onboarding",
                    "emergency_email": personal["email"]
                },
                "ui_preferences": {"view_type": "CARDS"},
                "summary_cache": {
                    "assigned_patients_count": 0,
                    "active_critical_alerts": 0,
                    "contract_health_percent": 100
                },
                "created_at": now,
                "updated_at": now
            }
            await db_service.db.clients.update_one(
                {"user_id": user_doc["_id"]},
                {"$setOnInsert": client_doc},
                upsert=True
            )

    return {
        "message": f"Solicitud del aspirante evaluada exitosamente como {req.status}.",
        "email": email,
        "new_status": req.status
    }
