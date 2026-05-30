"""
support.py — Esquemas y Modelos de Soporte y Artículos de Ayuda (MongoDB Colecciones: help_articles, support_tickets)
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from backend.models import PyObjectId

class ArticleFormat(str, Enum):
    FAQ = "FAQ"
    GUIDE = "GUIDE"

class TicketStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    CLOSED = "CLOSED"

class TicketPriority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class FeedbackCounters(BaseModel):
    useful_votes: int = 0
    not_useful_votes: int = 0

class HelpArticleBase(BaseModel):
    title: str
    slug: str
    format_type: ArticleFormat
    category: str
    content: str
    media_urls: List[str] = Field(default_factory=list)
    search_keywords: List[str] = Field(default_factory=list)
    feedback_counters: FeedbackCounters = Field(default_factory=FeedbackCounters)
    is_published: bool = True

class HelpArticleCreate(HelpArticleBase):
    pass

class HelpArticleResponse(HelpArticleBase):
    id: PyObjectId = Field(alias="_id")
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True

class SupportTicketCreate(BaseModel):
    subject: str
    message: str
    priority: TicketPriority = TicketPriority.MEDIUM

class SupportTicketResponse(BaseModel):
    id: PyObjectId = Field(alias="_id")
    user_id: PyObjectId
    user_role_snapshot: str
    subject: str
    message: str
    status: TicketStatus
    priority: TicketPriority
    created_at: datetime
    updated_at: datetime

    class Config:
        populate_by_name = True
