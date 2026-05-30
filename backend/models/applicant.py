"""
applicant.py — Esquemas y Modelos de Aspirantes (MongoDB Colección: applicants)
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from backend.models import PyObjectId
from backend.models.user import UserRole

class ApprovalStatus(str, Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class ClientType(str, Enum):
    CLINICA = "CLINICA"
    FAMILIAR = "FAMILIAR"

class PersonalDataSchema(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    identification_number: str  # Cédula o ID nacional

class ProfessionalMetadataSchema(BaseModel):
    medical_license: Optional[str] = None
    specialty: Optional[str] = None
    institution_origin: Optional[str] = None
    
    # Campos adicionales para Clientes
    corporate_name: Optional[str] = None  # Razón social
    tax_id: Optional[str] = None          # RIT/NIT/RUT (ID Fiscal)
    client_type: Optional[ClientType] = None

class VerificationDocumentSchema(BaseModel):
    url: str
    doc_type: str

class AuditReviewSchema(BaseModel):
    reviewed_by: Optional[PyObjectId] = None
    reviewed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None

class ApplicantCreate(BaseModel):
    requested_role: UserRole
    personal_data: PersonalDataSchema
    professional_metadata: ProfessionalMetadataSchema
    verification_documents: List[VerificationDocumentSchema] = Field(default_factory=list)

class ApplicantResponse(BaseModel):
    id: PyObjectId = Field(alias="_id")
    requested_role: UserRole
    status: ApprovalStatus = ApprovalStatus.PENDING_APPROVAL
    personal_data: PersonalDataSchema
    professional_metadata: ProfessionalMetadataSchema
    verification_documents: List[VerificationDocumentSchema] = Field(default_factory=list)
    audit_review: Optional[AuditReviewSchema] = None
    submitted_at: datetime

    class Config:
        populate_by_name = True
