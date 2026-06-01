"""
auth.py — Rutas de Autenticación del Sistema mediante Google OAuth2 y Cookies de Sesión
"""

from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Cookie, Response
from pydantic import BaseModel, EmailStr, Field
import httpx
import logging
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from backend.config import settings
from backend.services.database import db_service
from backend.services.auth_utils import (
    sign_session_id,
    unsign_session_id,
)
from backend.models.user import (
    UserRole,
    UserStatus,
    UserResponse,
    GoogleLoginRequest,
    LoginResponse,
)
from backend.models.applicant import (
    PersonalDataSchema,
    ProfessionalMetadataSchema,
    ApprovalStatus,
)

logger = logging.getLogger("app.auth")
router = APIRouter(prefix="/auth", tags=["Autenticación"])

class OnboardingRequest(BaseModel):
    role: UserRole
    personal_data: PersonalDataSchema
    professional_metadata: ProfessionalMetadataSchema

async def get_current_user(session_id: Optional[str] = Cookie(None)) -> UserResponse:
    """
    Dependencia para obtener el usuario autenticado actual mediante la Cookie de Sesión
    """
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión no iniciada. Cookie faltante.",
        )
    
    # Decodificar y verificar la sesión cifrada/firmada
    actual_session_id = unsign_session_id(session_id)
    if not actual_session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida o expirada.",
        )
    
    # Buscar sesión en MongoDB
    session_doc = await db_service.db.auth_sessions.find_one({"session_id": actual_session_id})
    if not session_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión no encontrada en base de datos.",
        )
    
    if session_doc["expires_at"] < datetime.utcnow():
        # Eliminar sesión expirada
        await db_service.db.auth_sessions.delete_one({"session_id": actual_session_id})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La sesión ha expirado.",
        )
    
    # Buscar usuario en MongoDB
    user_doc = await db_service.db.users.find_one({"_id": ObjectId(session_doc["user_id"])})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario asociado a la sesión no encontrado.",
        )
    
    return UserResponse(**user_doc)

@router.post("/google-login", response_model=LoginResponse)
async def google_login(req: GoogleLoginRequest, response: Response):
    """
    Endpoint para iniciar sesión mediante Google OAuth2.
    Recibe el token de Google, valida la firma, busca o registra al usuario
    y emite la cookie cifrada en la cabecera.
    """
    email = None
    google_id = None
    first_name = ""
    last_name = ""
    avatar_url = ""

    try:
        # Validar el idinfo con Google Auth
        idinfo = id_token.verify_oauth2_token(
            req.token, 
            google_requests.Request(), 
            settings.GOOGLE_CLIENT_ID
        )
        email = idinfo.get("email")
        google_id = idinfo.get("sub")
        first_name = idinfo.get("given_name", "")
        last_name = idinfo.get("family_name", "")
        avatar_url = idinfo.get("picture", "")
    except ValueError as e:
        logger.warning(f"Fallo al verificar token nativo de Google: {e}. Intentando llamada a userinfo.")
        # Fallback a llamar a la API userinfo si es un Access Token
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {req.token}"}
            )
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token de Google inválido o expirado."
                )
            userinfo = resp.json()
            email = userinfo.get("email")
            google_id = userinfo.get("sub")
            first_name = userinfo.get("given_name", "")
            last_name = userinfo.get("family_name", "")
            avatar_url = userinfo.get("picture", "")

    if not email or not google_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token de Google no contiene información de identidad suficiente."
        )

    now = datetime.utcnow()

    # Buscar usuario en DB por email o google_id
    user_doc = await db_service.db.users.find_one({
        "$or": [
            {"google_id": google_id},
            {"email": email}
        ]
    })

    if not user_doc:
        # Registrar nuevo usuario en estado INCOMPLETE
        user_id = ObjectId()
        user_doc = {
            "_id": user_id,
            "google_id": google_id,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "avatar_url": avatar_url,
            "role": None,
            "status": UserStatus.INCOMPLETE,
            "created_at": now,
            "updated_at": now
        }
        await db_service.db.users.insert_one(user_doc)
        logger.info(f"Usuario registrado en modo incompleto vía Google: {email}")
    else:
        # Actualizar datos de Google por si cambiaron
        await db_service.db.users.update_one(
            {"_id": user_doc["_id"]},
            {
                "$set": {
                    "first_name": first_name,
                    "last_name": last_name,
                    "avatar_url": avatar_url,
                    "google_id": google_id, # Asegurar que esté mapeado
                    "updated_at": now
                }
            }
        )
        # Recargar documento
        user_doc = await db_service.db.users.find_one({"_id": user_doc["_id"]})

    # Verificar si el usuario está suspendido o rechazado
    if user_doc["status"] == UserStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta cuenta ha sido suspendida. Contacte al administrador."
        )
    elif user_doc["status"] == UserStatus.REJECTED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Su solicitud de registro ha sido rechazada."
        )

    # Generar sesión en base de datos
    session_id = str(ObjectId())
    session_doc = {
        "_id": ObjectId(session_id),
        "user_id": user_doc["_id"],
        "session_id": session_id,
        "device_info": {
            "user_agent": "browser_client",
            "ip_address": "127.0.0.1"
        },
        "expires_at": now + timedelta(days=7),
        "created_at": now
    }
    await db_service.db.auth_sessions.insert_one(session_doc)

    # Firmar el session_id y emitir la cookie HTTPOnly
    signed_session = sign_session_id(session_id)
    response.set_cookie(
        key="session_id",
        value=signed_session,
        httponly=True,
        secure=False,  # Permitido en localhost para desarrollo
        samesite="lax",
        max_age=60 * 60 * 24 * 7  # 7 días
    )

    return LoginResponse(
        success=True,
        user=UserResponse(**user_doc)
    )

@router.post("/onboarding", response_model=UserResponse)
async def onboarding(req: OnboardingRequest, current_user: UserResponse = Depends(get_current_user)):
    """
    Endpoint para completar el registro de onboarding.
    Solo accesible para usuarios en estado 'incomplete'.
    Genera el registro en 'applicants' y cambia el estado del usuario a 'pending_approval'.
    """
    if current_user.status != UserStatus.INCOMPLETE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El onboarding ya ha sido completado por este usuario."
        )

    now = datetime.utcnow()

    # 1. Crear el registro en applicants en estado PENDING_APPROVAL
    applicant_doc = {
        "_id": ObjectId(),
        "requested_role": req.role,
        "status": ApprovalStatus.PENDING_APPROVAL,
        "personal_data": req.personal_data.model_dump(),
        "professional_metadata": req.professional_metadata.model_dump(),
        "verification_documents": [],
        "audit_review": None,
        "submitted_at": now
    }
    await db_service.db.applicants.insert_one(applicant_doc)

    # 2. Actualizar el usuario con su nuevo rol y estado 'pending_approval'
    await db_service.db.users.update_one(
        {"_id": ObjectId(current_user.id)},
        {
            "$set": {
                "role": req.role,
                "status": UserStatus.PENDING_APPROVAL,
                "updated_at": now
            }
        }
    )

    # 3. Inicializar configuración de widgets del Dashboard para el usuario
    widgets = []
    if req.role == UserRole.ADMIN:
        widgets = [
            {"widget_id": "total_patients", "position_order": 1, "refresh_interval_ms": 30000},
            {"widget_id": "active_devices", "position_order": 2, "refresh_interval_ms": 30000},
            {"widget_id": "pending_applicants", "position_order": 3, "refresh_interval_ms": 10000},
            {"widget_id": "incident_chart", "position_order": 4, "refresh_interval_ms": 60000},
        ]
    elif req.role == UserRole.DOCTOR:
        widgets = [
            {"widget_id": "my_patients", "position_order": 1, "refresh_interval_ms": 30000},
            {"widget_id": "active_alerts", "position_order": 2, "refresh_interval_ms": 5000},
            {"widget_id": "resolved_today", "position_order": 3, "refresh_interval_ms": 30000},
            {"widget_id": "alerts_chart", "position_order": 4, "refresh_interval_ms": 60000},
        ]
    elif req.role == UserRole.CLIENT:
        widgets = [
            {"widget_id": "client_patients", "position_order": 1, "refresh_interval_ms": 30000},
            {"widget_id": "critical_alerts", "position_order": 2, "refresh_interval_ms": 5000},
            {"widget_id": "contract_health", "position_order": 3, "refresh_interval_ms": 60000},
        ]

    # Eliminar configuración de widgets existente si hubiera
    await db_service.db.dashboard_configs.delete_many({"user_id": ObjectId(current_user.id)})
    
    dashboard_config = {
        "_id": ObjectId(),
        "user_id": ObjectId(current_user.id),
        "layout_version": "1.0.0",
        "visible_widgets": widgets,
        "theme_preference": "premium_dark",
        "created_at": now,
        "updated_at": now
    }
    await db_service.db.dashboard_configs.insert_one(dashboard_config)

    # Cargar usuario actualizado
    updated_user = await db_service.db.users.find_one({"_id": ObjectId(current_user.id)})
    return UserResponse(**updated_user)

@router.post("/logout")
async def logout(response: Response, session_id: Optional[str] = Cookie(None)):
    """
    Cierra la sesión del usuario eliminándola de la base de datos y borrando la cookie.
    """
    if session_id:
        actual_session_id = unsign_session_id(session_id)
        if actual_session_id:
            await db_service.db.auth_sessions.delete_many({"session_id": actual_session_id})
    
    response.delete_cookie("session_id")
    return {"message": "Sesión cerrada correctamente."}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    """
    Retorna el perfil del usuario autenticado actual.
    """
    return current_user

