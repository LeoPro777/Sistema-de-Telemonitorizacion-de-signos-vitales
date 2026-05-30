"""
user.py — Esquemas y Modelos de Usuario (MongoDB Colección: users)
"""

from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from backend.models import PyObjectId

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    DOCTOR = "DOCTOR"
    PATIENT = "PATIENT"
    CLIENT = "CLIENT"

class UserStatus(str, Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"

class TwoFactorSchema(BaseModel):
    enabled: bool = False
    secret: Optional[str] = None

class DeviceInfoSchema(BaseModel):
    user_agent: str
    ip_address: str

class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: UserRole
    status: UserStatus = UserStatus.PENDING
    two_factor: TwoFactorSchema = Field(default_factory=TwoFactorSchema)

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: UserRole
    two_factor: Optional[TwoFactorSchema] = Field(default_factory=TwoFactorSchema)

class UserResponse(BaseModel):
    id: PyObjectId = Field(alias="_id")
    username: str
    email: EmailStr
    role: UserRole
    status: UserStatus
    two_factor: TwoFactorSchema
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "id": "60c72b2f9b1d8b2a3c8e4d21",
                "username": "dr_smith",
                "email": "smith@clinic.com",
                "role": "DOCTOR",
                "status": "PENDING",
                "two_factor": {
                    "enabled": False,
                    "secret": None
                },
                "created_at": "2026-05-30T12:00:00Z",
                "updated_at": "2026-05-30T12:00:00Z"
            }
        }

class AuthSessionBase(BaseModel):
    user_id: PyObjectId
    refresh_token: str
    device_info: DeviceInfoSchema
    expires_at: datetime
    created_at: datetime

class LoginRequest(BaseModel):
    username_or_email: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse
    two_factor_required: bool = False
    temp_token: Optional[str] = None  # Token temporal usado si se requiere verificar 2FA

class Verify2FARequest(BaseModel):
    temp_token: str
    otp_code: str
