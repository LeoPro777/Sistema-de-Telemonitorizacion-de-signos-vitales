"""
profile.py — Esquemas y Modelos de Perfil de Usuario (MongoDB Colección: user_profiles)
"""

from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from backend.models import PyObjectId

class PersonalDataSchema(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    address: str
    identification_number: str

class PersonalDataUpdateSchema(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    identification_number: Optional[str] = None

class UserProfileBase(BaseModel):
    google_avatar_url: Optional[str] = None
    personal_data: PersonalDataSchema
    role_specific_data: Dict[str, Any] = Field(default_factory=dict)

class UserProfileUpdate(BaseModel):
    google_avatar_url: Optional[str] = None
    personal_data: Optional[PersonalDataUpdateSchema] = None
    role_specific_data: Optional[Dict[str, Any]] = None

class UserProfileResponse(UserProfileBase):
    id: PyObjectId = Field(alias="_id")
    user_id: PyObjectId
    updated_at: datetime

    class Config:
        populate_by_name = True
