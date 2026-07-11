"""
users.py — Rutas para la gestión de preferencias del usuario (Product Tours)
"""

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from backend.services.database import db_service
from backend.routes.auth import get_current_user
from backend.models.user import UserResponse, UserPreferencesUpdate

router = APIRouter(prefix="/users", tags=["Usuarios"])

@router.patch("/me/preferences", response_model=UserResponse)
async def update_user_preferences(
    req: UserPreferencesUpdate,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Registra que el usuario ha completado o saltado un tour interactivo (product tour).
    Añade el ID del tour a la lista completed_tours en la base de datos de manera atómica.
    """
    user = await db_service.db.users.find_one_and_update(
        {"_id": ObjectId(current_user.id)},
        {"$addToSet": {"completed_tours": req.completed_tour}},
        return_document=True
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado en la base de datos."
        )
    return UserResponse(**user)

@router.post("/me/preferences/reset", response_model=UserResponse)
async def reset_user_tours(
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Restablece todas las preferencias de tours completados del usuario.
    Permite reproducir todos los product tours interactivos de nuevo.
    """
    user = await db_service.db.users.find_one_and_update(
        {"_id": ObjectId(current_user.id)},
        {"$set": {"completed_tours": []}},
        return_document=True
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado en la base de datos."
        )
    return UserResponse(**user)
