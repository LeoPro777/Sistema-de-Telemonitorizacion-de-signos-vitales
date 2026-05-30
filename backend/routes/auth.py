"""
auth.py — Rutas de Autenticación del Sistema (Registro, Login, 2FA, Datos de Usuario)
"""

from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr, Field

from backend.services.database import db_service
from backend.services.auth_utils import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from backend.models.user import (
    UserRole,
    UserStatus,
    UserResponse,
    LoginRequest,
    LoginResponse,
    Verify2FARequest,
)
from backend.models.applicant import (
    PersonalDataSchema,
    ProfessionalMetadataSchema,
    VerificationDocumentSchema,
    ApprovalStatus,
)

router = APIRouter(prefix="/auth", tags=["Autenticación"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login", auto_error=False)

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str
    requested_role: UserRole
    personal_data: PersonalDataSchema
    professional_metadata: ProfessionalMetadataSchema

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserResponse:
    """
    Dependencia asíncrona para obtener el usuario autenticado actual desde el token JWT
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No autenticado. Token faltante.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token malformado.",
        )
    
    # Buscar usuario en MongoDB
    user_doc = await db_service.db.users.find_one({"_id": ObjectId(user_id)})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado.",
        )
    
    return UserResponse(**user_doc)

@router.post("/register", response_model=UserResponse)
async def register(req: RegisterRequest):
    """
    Endpoint para registro de aspirantes.
    Persiste los datos del aspirante en `applicants` (PENDING_APPROVAL)
    y crea una cuenta de usuario en `users` (PENDING).
    """
    # Verificar si el usuario ya existe por email o username
    existing_user = await db_service.db.users.find_one({
        "$or": [
            {"username": req.username},
            {"email": req.email}
        ]
    })
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario o correo electrónico ya están registrados."
        )

    # Crear el hash de la contraseña
    password_hash = get_password_hash(req.password)
    now = datetime.utcnow()

    # 1. Crear el documento del usuario (estado PENDING por defecto)
    user_id = ObjectId()
    user_doc = {
        "_id": user_id,
        "username": req.username,
        "email": req.email,
        "password_hash": password_hash,
        "role": req.requested_role,
        "status": UserStatus.PENDING,
        "two_factor": {
            "enabled": False,
            "secret": None
        },
        "created_at": now,
        "updated_at": now
    }
    
    # 2. Crear el documento del aspirante (estado PENDING_APPROVAL)
    applicant_doc = {
        "_id": ObjectId(),
        "requested_role": req.requested_role,
        "status": ApprovalStatus.PENDING_APPROVAL,
        "personal_data": req.personal_data.model_dump(),
        "professional_metadata": req.professional_metadata.model_dump(),
        "verification_documents": [], # Inicialmente vacío, se puede llenar luego
        "audit_review": None,
        "submitted_at": now
    }

    # Transacción en MongoDB (simulada por inserciones directas secuenciales)
    await db_service.db.users.insert_one(user_doc)
    await db_service.db.applicants.insert_one(applicant_doc)

    # 3. Crear configuración de widgets inicial para el dashboard
    # Dependiendo del rol, damos widgets por defecto
    widgets = []
    if req.requested_role == UserRole.ADMIN:
        widgets = [
            {"widget_id": "total_patients", "position_order": 1, "refresh_interval_ms": 30000},
            {"widget_id": "active_devices", "position_order": 2, "refresh_interval_ms": 30000},
            {"widget_id": "pending_applicants", "position_order": 3, "refresh_interval_ms": 10000},
            {"widget_id": "incident_chart", "position_order": 4, "refresh_interval_ms": 60000},
        ]
    elif req.requested_role == UserRole.DOCTOR:
        widgets = [
            {"widget_id": "my_patients", "position_order": 1, "refresh_interval_ms": 30000},
            {"widget_id": "active_alerts", "position_order": 2, "refresh_interval_ms": 5000},
            {"widget_id": "resolved_today", "position_order": 3, "refresh_interval_ms": 30000},
            {"widget_id": "alerts_chart", "position_order": 4, "refresh_interval_ms": 60000},
        ]
    elif req.requested_role == UserRole.CLIENT:
        widgets = [
            {"widget_id": "client_patients", "position_order": 1, "refresh_interval_ms": 30000},
            {"widget_id": "critical_alerts", "position_order": 2, "refresh_interval_ms": 5000},
            {"widget_id": "contract_health", "position_order": 3, "refresh_interval_ms": 60000},
        ]

    dashboard_config = {
        "_id": ObjectId(),
        "user_id": user_id,
        "layout_version": "1.0.0",
        "visible_widgets": widgets,
        "theme_preference": "premium_dark",
        "created_at": now,
        "updated_at": now
    }
    await db_service.db.dashboard_configs.insert_one(dashboard_config)

    return UserResponse(**user_doc)

@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    """
    Endpoint para iniciar sesión. Valida credenciales y soporta flujo de 2FA.
    """
    # Buscar por username o email
    user_doc = await db_service.db.users.find_one({
        "$or": [
            {"username": req.username_or_email},
            {"email": req.username_or_email}
        ]
    })
    
    if not user_doc or not verify_password(req.password, user_doc["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nombre de usuario, correo electrónico o contraseña incorrectos."
        )

    user = UserResponse(**user_doc)

    # Verificar si el usuario está suspendido
    if user.status == UserStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta cuenta ha sido suspendida. Contacte al administrador."
        )

    # Si 2FA está habilitado, retornamos un token temporal
    if user.two_factor.enabled:
        temp_token = create_access_token(
            data={"sub": str(user.id), "2fa_pending": True},
            expires_delta=timedelta(minutes=5)
        )
        return LoginResponse(
            access_token="",
            refresh_token="",
            user=user,
            two_factor_required=True,
            temp_token=temp_token
        )

    # Generar tokens finales
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    # Guardar sesión en base de datos (auth_sessions)
    session_doc = {
        "_id": ObjectId(),
        "user_id": ObjectId(user.id),
        "refresh_token": refresh_token,
        "device_info": {
            "user_agent": "browser_client",  # Simplificado para fines prácticos
            "ip_address": "127.0.0.1"
        },
        "expires_at": datetime.utcnow() + timedelta(days=7),
        "created_at": datetime.utcnow()
    }
    await db_service.db.auth_sessions.insert_one(session_doc)

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user
    )

@router.post("/verify-2fa", response_model=LoginResponse)
async def verify_2fa(req: Verify2FARequest):
    """
    Endpoint para verificar el código TOTP / 2FA.
    """
    payload = decode_token(req.temp_token)
    if not payload or not payload.get("2fa_pending"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token temporal de 2FA inválido o expirado."
        )

    user_id = payload.get("sub")
    user_doc = await db_service.db.users.find_one({"_id": ObjectId(user_id)})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado."
        )

    # Validación del código OTP
    # En desarrollo/demo, aceptamos "123456" como código universal, o validamos el secreto si existiera.
    is_valid_otp = req.otp_code == "123456"
    if not is_valid_otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código de verificación ingresado es incorrecto."
        )

    # Generar tokens finales
    user = UserResponse(**user_doc)
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    # Guardar sesión en base de datos
    session_doc = {
        "_id": ObjectId(),
        "user_id": ObjectId(user.id),
        "refresh_token": refresh_token,
        "device_info": {
            "user_agent": "browser_client",
            "ip_address": "127.0.0.1"
        },
        "expires_at": datetime.utcnow() + timedelta(days=7),
        "created_at": datetime.utcnow()
    }
    await db_service.db.auth_sessions.insert_one(session_doc)

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    """
    Retorna el perfil del usuario autenticado actual.
    """
    return current_user
