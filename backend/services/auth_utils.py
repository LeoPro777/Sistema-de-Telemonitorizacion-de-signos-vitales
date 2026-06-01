"""
auth_utils.py — Utilidades de hashing y gestión de JWT tokens
"""

from datetime import datetime, timedelta
from typing import Optional, Union
from jose import jwt, JWTError
from passlib.context import CryptContext
from backend.config import settings

# Contexto de encriptación usando bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica si una contraseña en texto plano coincide con su hash
    """
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """
    Genera el hash bcrypt de una contraseña
    """
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crea un JSON Web Token de acceso
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=60) # 1 hora por defecto en desarrollo
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crea un JSON Web Token de refresco
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7) # 7 días por defecto
        
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def decode_token(token: str) -> Optional[dict]:
    """
    Decodifica un token JWT y retorna su payload si es válido
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload
    except JWTError:
        return None

def sign_session_id(session_id: str) -> str:
    """
    Firma el session_id usando JWT con una expiración de 7 días.
    """
    return create_access_token({"session_id": session_id}, expires_delta=timedelta(days=7))

def unsign_session_id(signed_session: str) -> Optional[str]:
    """
    Decodifica el session_id firmado y valida su firma.
    """
    payload = decode_token(signed_session)
    if payload:
        return payload.get("session_id")
    return None

