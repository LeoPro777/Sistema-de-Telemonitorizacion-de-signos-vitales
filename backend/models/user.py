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
    INCOMPLETE = "incomplete"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    SUSPENDED = "suspended"

class TelemetryStatus(str, Enum):
    NORMAL = "NORMAL"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"

class DeviceInfoSchema(BaseModel):
    user_agent: str
    ip_address: str

class UserBase(BaseModel):
    google_id: str
    email: EmailStr
    first_name: str
    last_name: str
    avatar_url: str
    role: Optional[UserRole] = None
    status: UserStatus = UserStatus.INCOMPLETE

class UserCreate(BaseModel):
    google_id: str
    email: EmailStr
    first_name: str
    last_name: str
    avatar_url: str
    role: Optional[UserRole] = None

class UserResponse(BaseModel):
    id: PyObjectId = Field(alias="_id")
    google_id: Optional[str] = None
    email: EmailStr
    first_name: str = ""
    last_name: str = ""
    avatar_url: str = ""
    role: Optional[UserRole] = None
    status: UserStatus
    created_at: datetime
    updated_at: datetime
    from pydantic import field_validator
    @field_validator('role', mode='before')
    def parse_role(cls, v):
        if v == "None" or v == "" or v is None:
            return None
        if isinstance(v, str):
            v_up = v.upper()
            if v_up in [e.value for e in UserRole]:
                return UserRole(v_up)
        return v

    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "id": "60c72b2f9b1d8b2a3c8e4d21",
                "google_id": "11223344556677889900",
                "email": "smith@clinic.com",
                "first_name": "Pedro",
                "last_name": "Smith",
                "avatar_url": "https://lh3.googleusercontent.com/a/AATXAJ...",
                "role": "DOCTOR",
                "status": "approved",
                "created_at": "2026-05-30T12:00:00Z",
                "updated_at": "2026-05-30T12:00:00Z"
            }
        }

class AuthSessionBase(BaseModel):
    user_id: PyObjectId
    session_id: str
    device_info: DeviceInfoSchema
    expires_at: datetime
    created_at: datetime

class GoogleLoginRequest(BaseModel):
    token: Optional[str] = None
    code: Optional[str] = None
    redirect_uri: Optional[str] = None

class LoginResponse(BaseModel):
    success: bool
    user: UserResponse

