"""
support.py — Rutas para el Centro de Ayuda y Tickets de Soporte
"""

from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional

from backend.services.database import db_service
from backend.routes.auth import get_current_user
from backend.models.user import UserResponse
from backend.models.support import (
    HelpArticleResponse,
    HelpArticleCreate,
    SupportTicketCreate,
    SupportTicketResponse,
    ArticleFormat,
    TicketStatus
)

router = APIRouter(prefix="/support", tags=["Centro de Ayuda y Soporte"])

@router.get("/articles", response_model=List[HelpArticleResponse])
async def get_articles(
    q: Optional[str] = Query(None, description="Término de búsqueda semántica o por palabras clave"),
    category: Optional[str] = Query(None, description="Categoría del artículo"),
    format_type: Optional[ArticleFormat] = Query(None, description="Formato del artículo (FAQ o GUIDE)"),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Obtiene los artículos de ayuda publicados. Permite filtrar por término de búsqueda, categoría y formato.
    """
    query = {"is_published": True}

    if category:
        query["category"] = category
    if format_type:
        query["format_type"] = format_type

    if q:
        # Intentamos usar búsqueda de texto si el índice de texto está creado,
        # de lo contrario, caemos en búsqueda regex para mayor robustez local
        try:
            query["$text"] = {"$search": q}
            articles = await db_service.db.help_articles.find(query).to_list(100)
        except Exception:
            # Fallback en caso de que no exista el índice de texto en el entorno local
            if "$text" in query:
                del query["$text"]
            query["$or"] = [
                {"title": {"$regex": q, "$options": "i"}},
                {"content": {"$regex": q, "$options": "i"}},
                {"search_keywords": {"$regex": q, "$options": "i"}}
            ]
            articles = await db_service.db.help_articles.find(query).to_list(100)
    else:
        articles = await db_service.db.help_articles.find(query).to_list(100)

    return [HelpArticleResponse(**art) for art in articles]


@router.get("/articles/autocomplete")
async def autocomplete_articles(
    q: str = Query(..., min_length=1, description="Texto de búsqueda para autocompletado rápido"),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Endpoint para tipo-ahead. Devuelve sugerencias de títulos y slugs de artículos que coinciden con el texto de búsqueda.
    """
    query = {
        "is_published": True,
        "title": {"$regex": q, "$options": "i"}
    }
    articles = await db_service.db.help_articles.find(
        query, 
        {"title": 1, "slug": 1, "category": 1, "format_type": 1}
    ).limit(6).to_list(6)

    # Mapear a formato simple
    return [
        {
            "title": art["title"],
            "slug": art["slug"],
            "category": art["category"],
            "format_type": art["format_type"]
        }
        for art in articles
    ]


@router.get("/articles/{slug_or_id}", response_model=HelpArticleResponse)
async def get_article_detail(
    slug_or_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Obtiene el detalle completo de un artículo de ayuda usando el slug o el ID físico.
    """
    query = {"is_published": True}
    
    if ObjectId.is_valid(slug_or_id):
        query["$or"] = [{"_id": ObjectId(slug_or_id)}, {"slug": slug_or_id}]
    else:
        query["slug"] = slug_or_id

    article = await db_service.db.help_articles.find_one(query)
    
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artículo de ayuda no encontrado o no publicado."
        )
        
    return HelpArticleResponse(**article)


@router.post("/articles/{id}/vote", response_model=HelpArticleResponse)
async def vote_article(
    id: str,
    vote_type: str = Query(..., regex="^(useful|not_useful)$", description="Tipo de voto: useful o not_useful"),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Realiza una votación atómica incrementando el contador de utilidad correspondiente en help_articles.
    """
    if not ObjectId.is_valid(id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El identificador de artículo proporcionado no es válido."
        )

    field = "feedback_counters.useful_votes" if vote_type == "useful" else "feedback_counters.not_useful_votes"
    
    res = await db_service.db.help_articles.find_one_and_update(
        {"_id": ObjectId(id)},
        {"$inc": {field: 1}, "$set": {"updated_at": datetime.utcnow()}},
        return_document=True
    )

    if not res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Artículo no encontrado."
        )

    return HelpArticleResponse(**res)


@router.post("/tickets", response_model=SupportTicketResponse, status_code=status.HTTP_218_2FA_REQUIRED or status.HTTP_201_CREATED)
async def create_support_ticket(
    req: SupportTicketCreate,
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Crea y registra una nueva solicitud de soporte técnico en la colección support_tickets.
    """
    now = datetime.utcnow()
    ticket_doc = {
        "user_id": ObjectId(current_user.id),
        "user_role_snapshot": current_user.role,
        "subject": req.subject,
        "message": req.message,
        "status": TicketStatus.OPEN,
        "priority": req.priority,
        "created_at": now,
        "updated_at": now
    }
    
    res = await db_service.db.support_tickets.insert_one(ticket_doc)
    ticket_doc["_id"] = res.inserted_id
    
    return SupportTicketResponse(**ticket_doc)
