"""
profile.py — Rutas para la Gestión de Perfil de Usuario
"""

from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional

from backend.services.database import db_service
from backend.routes.auth import get_current_user
from backend.models.user import UserResponse
from backend.models.profile import (
    UserProfileResponse,
    UserProfileUpdate
)

router = APIRouter(prefix="/profile", tags=["Perfiles de Usuario"])

@router.get("", response_model=UserProfileResponse)
async def get_user_profile(current_user: UserResponse = Depends(get_current_user)):
    """
    Obtiene el expediente de perfil del usuario autenticado actual.
    Si no existe, se inicializa uno por defecto utilizando las credenciales de la cuenta principal.
    """
    profile = await db_service.db.user_profiles.find_one({"user_id": ObjectId(current_user.id)})
    
    if not profile:
        now = datetime.utcnow()
        # Generamos datos semilla a partir de la cuenta principal del usuario
        default_profile = {
            "user_id": ObjectId(current_user.id),
            "google_avatar_url": f"https://api.dicebear.com/7.x/adventurer/svg?seed={current_user.username}",
            "personal_data": {
                "first_name": current_user.username.split('_')[0].capitalize(),
                "last_name": current_user.username.split('_')[1].capitalize() if '_' in current_user.username else "Usuario",
                "email": current_user.email,
                "phone": "+56 9 8765 4321",
                "address": "Av. Vitacura 1230, Santiago, Chile",
                "identification_number": "12.345.678-9"
            },
            "role_specific_data": {},
            "updated_at": now
        }
        
        # Enriquecer rol-specific data si es necesario
        if current_user.role == "DOCTOR":
            default_profile["role_specific_data"] = {
                "medical_license": "LIC-99011-CL",
                "specialty": "Cardiología Clínica",
                "office_location": "Consultorio 402, Ala Sur"
            }
        elif current_user.role == "CLIENT":
            default_profile["role_specific_data"] = {
                "tax_id": "76.123.456-K",
                "corporate_name": "Clínicas Médicas Integrales S.A.",
                "client_type": "CLINICA"
            }
        elif current_user.role == "PATIENT":
            default_profile["role_specific_data"] = {
                "clinical_id": "CLI-2026-990"
            }

        res = await db_service.db.user_profiles.insert_one(default_profile)
        default_profile["_id"] = res.inserted_id
        profile = default_profile

    return UserProfileResponse(**profile)


@router.put("", response_model=UserProfileResponse)
async def update_user_profile(
    req: UserProfileUpdate,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Actualiza la información del perfil del usuario (datos de contacto, avatar o datos específicos del rol).
    Soporta actualizaciones parciales y valida las entradas de forma reactiva.
    """
    profile = await db_service.db.user_profiles.find_one({"user_id": ObjectId(current_user.id)})
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Perfil de usuario no encontrado. Obtenga el perfil primero para inicializarlo."
        )

    update_query = {}
    
    # 1. google_avatar_url
    if req.google_avatar_url is not None:
        update_query["google_avatar_url"] = req.google_avatar_url

    # 2. personal_data (parcial)
    if req.personal_data is not None:
        personal_data_dump = req.personal_data.model_dump(exclude_unset=True)
        for key, val in personal_data_dump.items():
            update_query[f"personal_data.{key}"] = val

    # 3. role_specific_data (parcial)
    if req.role_specific_data is not None:
        for key, val in req.role_specific_data.items():
            update_query[f"role_specific_data.{key}"] = val

    if not update_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar al menos un campo para actualizar en el perfil."
        )

    # Actualizamos el timestamp de actualización
    update_query["updated_at"] = datetime.utcnow()

    res = await db_service.db.user_profiles.find_one_and_update(
        {"user_id": ObjectId(current_user.id)},
        {"$set": update_query},
        return_document=True
    )

    if not res:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo actualizar el perfil del usuario."
        )

    return UserProfileResponse(**res)
