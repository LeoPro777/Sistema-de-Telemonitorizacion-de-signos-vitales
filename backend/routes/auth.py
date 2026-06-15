"""
auth.py — Rutas de Autenticación del Sistema mediante Google OAuth2 y Cookies de Sesión
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Cookie, Response, Request
from pydantic import BaseModel, EmailStr, Field
import httpx
import logging

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

async def exchange_google_code_async(code: str, redirect_uri: str) -> str:
    """
    Intercambia de forma asíncrona un código de autorización de Google por un ID Token usando HTTPX.
    """
    async with httpx.AsyncClient(verify=False) as client:
        resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code"
            },
            timeout=10.0
        )
        if resp.status_code != 200:
            logger.error(f"[exchange_google_code_async] Error de Google: {resp.text}")
            raise ValueError(f"Google OAuth error: {resp.text}")
        
        token_data = resp.json()
        id_token_val = token_data.get("id_token")
        if not id_token_val:
            raise ValueError("No se recibió token de identidad (id_token) de Google.")
        return id_token_val

async def verify_google_id_token_async(id_token_val: str) -> dict:
    """
    Verifica de forma asíncrona un token de identidad de Google (ID Token)
    usando la API tokeninfo oficial de Google. Evita bloqueos y dependencias de certificados locales.
    """
    async with httpx.AsyncClient(verify=False) as client:
        resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": id_token_val},
            timeout=10.0
        )
        if resp.status_code != 200:
            logger.warning(f"[verify_google_id_token_async] tokeninfo falló. Intentando fallback a userinfo.")
            # Fallback a llamar a la API userinfo si es un Access Token
            resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {id_token_val}"},
                timeout=10.0
            )
            if resp.status_code != 200:
                raise ValueError("Token de Google inválido, expirado o rechazado.")
        
        return resp.json()

async def get_current_user(session_id: Optional[str] = Cookie(None)) -> UserResponse:
    """
    Dependencia para obtener el usuario autenticado actual mediante la Cookie de Sesión
    """
    logger.info(f"[get_current_user] Invocando validación de sesión. Cookie session_id presente: {session_id is not None}")
    if not session_id:
        logger.warning("[get_current_user] Cookie 'session_id' no encontrada en la petición.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión no iniciada. Cookie faltante.",
        )
    
    # Decodificar y verificar la sesión cifrada/firmada
    actual_session_id = unsign_session_id(session_id)
    if not actual_session_id:
        logger.warning(f"[get_current_user] La firma de la cookie es inválida. Valor cookie cifrado: {session_id}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión inválida o expirada.",
        )
    
    logger.info(f"[get_current_user] Cookie descifrada con éxito. session_id: {actual_session_id}")
    
    # Buscar sesión en MongoDB
    session_doc = await db_service.db.auth_sessions.find_one({"session_id": actual_session_id})
    if not session_doc:
        logger.warning(f"[get_current_user] Sesión {actual_session_id} no encontrada en MongoDB.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión no encontrada en base de datos.",
        )
    
    if session_doc["expires_at"] < datetime.now(timezone.utc):
        logger.warning(f"[get_current_user] Sesión {actual_session_id} ha expirado. Expira en: {session_doc['expires_at']}")
        # Eliminar sesión expirada
        await db_service.db.auth_sessions.delete_one({"session_id": actual_session_id})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La sesión ha expirado.",
        )
    
    # Buscar usuario en MongoDB
    user_doc = await db_service.db.users.find_one({"_id": ObjectId(session_doc["user_id"])})
    if not user_doc:
        logger.error(f"[get_current_user] Usuario asociado ID {session_doc['user_id']} no encontrado.")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario asociado a la sesión no encontrado.",
        )
    
    logger.info(f"[get_current_user] Usuario autenticado con éxito: {user_doc.get('email')}")
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
    token_to_verify = req.token

    if req.code:
        # Intercambiar código de autorización por id_token
        logger.info(f"[google_login] Intercambiando código de autorización por token. redirect_uri: {req.redirect_uri}")
        try:
            token_to_verify = await exchange_google_code_async(req.code, req.redirect_uri or "http://localhost:5173/login")
        except ValueError as e:
            logger.error(f"[google_login] Error de validación al intercambiar código: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        except Exception as e:
            logger.error(f"[google_login] Error al intercambiar código: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Fallo al conectar con Google OAuth: {str(e)}"
            )

    try:
        # Validar el idinfo de forma asíncrona
        idinfo = await verify_google_id_token_async(token_to_verify)
        email = idinfo.get("email")
        google_id = idinfo.get("sub")
        first_name = idinfo.get("given_name", "")
        last_name = idinfo.get("family_name", "")
        avatar_url = idinfo.get("picture", "")
    except Exception as e:
        logger.error(f"[google_login] Fallo al verificar token de Google: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de Google inválido, expirado o rechazado."
        )

    if not email or not google_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El token de Google no contiene información de identidad suficiente."
        )

    now = datetime.now(timezone.utc)

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
        max_age=60 * 60 * 24 * 7,  # 7 días
        path="/"
    )
    logger.info(f"[google_login] Sesión creada y cookie establecida con éxito para el usuario: {email}. session_id: {session_id}")

    return LoginResponse(
        success=True,
        user=UserResponse(**user_doc)
    )

from fastapi import Form
from fastapi.responses import RedirectResponse

@router.get("/google-login-start")
async def google_login_start(request: Request):
    """
    Inicia el flujo de autenticación de Google redireccionando al usuario.
    Bypass total de iframes y bloqueos de terceros.
    """
    import urllib.parse
    forwarded_host = request.headers.get("x-forwarded-host") or "localhost:5173"
    proto = request.headers.get("x-forwarded-proto") or "http"
    redirect_uri = f"{proto}://{forwarded_host}/api/auth/google-callback"
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "prompt": "select_account"
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urllib.parse.urlencode(params, quote_via=urllib.parse.quote)}"
    return RedirectResponse(url=auth_url, status_code=303)

@router.get("/google-callback")
async def google_callback(request: Request, code: str, response: Response):
    """
    Callback de Google OAuth2. Intercambia el código por un token,
    inicia la sesión en la base de datos y redirige al dashboard con la cookie.
    """
    logger.info(f"[google_callback] Código de Google recibido. Iniciando intercambio.")
    
    forwarded_host = request.headers.get("x-forwarded-host") or "localhost:5173"
    proto = request.headers.get("x-forwarded-proto") or "http"
    redirect_uri = f"{proto}://{forwarded_host}/api/auth/google-callback"
    
    # 1. Intercambiar el código de autorización por id_token de forma asíncrona
    try:
        id_token_val = await exchange_google_code_async(code, redirect_uri)
    except Exception as e:
        logger.error(f"[google_callback] Error al comunicar con Google Token API: {e}")
        return RedirectResponse(url="/login?error=connection_failed")

    # 2. Verificar el ID Token de forma asíncrona
    try:
        idinfo = await verify_google_id_token_async(id_token_val)
        email = idinfo.get("email")
        google_id = idinfo.get("sub")
        first_name = idinfo.get("given_name", "")
        last_name = idinfo.get("family_name", "")
        avatar_url = idinfo.get("picture", "")
    except Exception as e:
        logger.error(f"[google_callback] Firma o verificación del token de Google inválida: {e}")
        return RedirectResponse(url="/login?error=invalid_token")

    if not email or not google_id:
        return RedirectResponse(url="/login?error=insufficient_info")

    now = datetime.now(timezone.utc)
    
    # 3. Buscar o crear el usuario en MongoDB
    user_doc = await db_service.db.users.find_one({
        "$or": [{"google_id": google_id}, {"email": email}]
    })

    if not user_doc:
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
        logger.info(f"[google_callback] Nuevo usuario registrado: {email}")
    else:
        await db_service.db.users.update_one(
            {"_id": user_doc["_id"]},
            {"$set": {"first_name": first_name, "last_name": last_name, "avatar_url": avatar_url, "google_id": google_id, "updated_at": now}}
        )
        user_doc = await db_service.db.users.find_one({"_id": user_doc["_id"]})
        logger.info(f"[google_callback] Datos de usuario actualizados: {email}")

    # Verificar si el usuario está suspendido o rechazado
    if user_doc["status"] == UserStatus.SUSPENDED:
        return RedirectResponse(url="/login?error=suspended")
    elif user_doc["status"] == UserStatus.REJECTED:
        return RedirectResponse(url="/login?error=rejected")

    # 4. Crear sesión
    session_id = str(ObjectId())
    session_doc = {
        "_id": ObjectId(session_id),
        "user_id": user_doc["_id"],
        "session_id": session_id,
        "device_info": {"user_agent": "browser_client", "ip_address": "127.0.0.1"},
        "expires_at": now + timedelta(days=7),
        "created_at": now
    }
    await db_service.db.auth_sessions.insert_one(session_doc)
    logger.info(f"[google_callback] Sesión de base de datos creada: {session_id}")

    # 5. Redireccionar con la cookie HTTPOnly
    target_path = "/dashboard"
    if user_doc["status"] == UserStatus.INCOMPLETE:
        target_path = "/register-select"
    elif user_doc["status"] == UserStatus.PENDING_APPROVAL:
        target_path = "/waiting-approval"
    elif user_doc["status"] == UserStatus.APPROVED:
        if user_doc["role"] == UserRole.PATIENT:
            target_path = "/patient-view"

    response = RedirectResponse(url=target_path, status_code=303)
    signed_session = sign_session_id(session_id)
    response.set_cookie(
        key="session_id",
        value=signed_session,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * 60 * 24 * 7,
        path="/"
    )
    logger.info(f"[google_callback] Cookie de sesión emitida. Redireccionando a {target_path}")
    return response

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

    now = datetime.now(timezone.utc)

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
    
    response.delete_cookie("session_id", path="/")
    return {"message": "Sesión cerrada correctamente."}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: UserResponse = Depends(get_current_user)):
    """
    Retorna el perfil del usuario autenticado actual.
    """
    return current_user


class BypassLoginRequest(BaseModel):
    email: EmailStr


@router.post("/bypass-login", response_model=LoginResponse)
async def bypass_login(req: BypassLoginRequest, response: Response):
    """
    Endpoint de desarrollo para iniciar sesión omitiendo Google OAuth.
    Busca al usuario por email; si no existe, lo crea en estado INCOMPLETE.
    Genera la sesión y establece la cookie de la misma forma que google_login.
    """
    if settings.ENVIRONMENT == "production":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bypass login no está permitido en producción."
        )

    now = datetime.now(timezone.utc)
    # Buscar usuario en DB por email
    user_doc = await db_service.db.users.find_one({"email": req.email})

    if not user_doc:
        # Registrar nuevo usuario en estado INCOMPLETE o APPROVED para cuentas especiales de bypass
        user_id = ObjectId()
        google_id = f"mock_{user_id}"
        # Generar nombre y apellido ficticios basados en el email
        parts = req.email.split('@')[0].split('.')
        first_name = parts[0].capitalize()
        last_name = parts[1].capitalize() if len(parts) > 1 else "User"
        
        role = None
        user_status = UserStatus.INCOMPLETE
        
        # Mapear roles por defecto para emails de bypass antiguos de aura.com
        if req.email == "admin@aura.com":
            role = UserRole.ADMIN
            user_status = UserStatus.APPROVED
        elif req.email == "medico@aura.com":
            role = UserRole.DOCTOR
            user_status = UserStatus.APPROVED
        elif req.email == "cliente@aura.com":
            role = UserRole.CLIENT
            user_status = UserStatus.APPROVED
        
        user_doc = {
            "_id": user_id,
            "google_id": google_id,
            "email": req.email,
            "first_name": first_name,
            "last_name": last_name,
            "avatar_url": "https://lh3.googleusercontent.com/a/default-user",
            "role": role,
            "status": user_status,
            "created_at": now,
            "updated_at": now
        }
        await db_service.db.users.insert_one(user_doc)
        logger.info(f"[bypass_login] Nuevo usuario registrado vía bypass: {req.email} con rol {role} y estado {user_status}")
    else:
        # Actualizar updated_at
        await db_service.db.users.update_one(
            {"_id": user_doc["_id"]},
            {
                "$set": {
                    "updated_at": now
                }
            }
        )
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
            "user_agent": "bypass_client",
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
        max_age=60 * 60 * 24 * 7,  # 7 días
        path="/"
    )
    logger.info(f"[bypass_login] Sesión bypass creada con éxito para: {req.email}. session_id: {session_id}")

    return LoginResponse(
        success=True,
        user=UserResponse(**user_doc)
    )


