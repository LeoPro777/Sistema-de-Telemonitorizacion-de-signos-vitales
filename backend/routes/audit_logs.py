"""
audit_logs.py — Endpoints para consulta, búsqueda avanzada y exportación de logs de auditoría forense (Módulo 12)
"""

import csv
import json
from datetime import datetime
from io import StringIO
from typing import Optional, List
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse

from backend.services.database import db_service
from backend.routes.auth import get_current_user
from backend.models.user import UserResponse, UserRole

router = APIRouter(prefix="/audit-logs", tags=["Auditoría Forense (Módulo 12)"])

def build_query(
    log_type: Optional[str] = None,
    criticality: Optional[str] = None,
    search: Optional[str] = None,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    last_id: Optional[str] = None
) -> dict:
    query = {}
    
    if log_type:
        query["log_type"] = log_type
        
    if criticality:
        query["criticality"] = criticality

    # Filtro temporal UTC
    if start_time or end_time:
        time_query = {}
        if start_time:
            time_query["$gte"] = start_time
        if end_time:
            time_query["$lte"] = end_time
        query["timestamp"] = time_query

    # Búsqueda inteligente
    if search:
        search_regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"event_action": search_regex},
            {"actor.username": search_regex},
            {"actor.ip_address": search_regex},
            {"device_id": search_regex},
            {"mac_address": search_regex}
        ]

    # Paginación basada en cursor (_id de MongoDB)
    if last_id:
        try:
            query["_id"] = {"$lt": ObjectId(last_id)}
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El formato del cursor last_id es inválido."
            )
            
    return query

def clean_doc(doc):
    doc["_id"] = str(doc["_id"])
    if doc.get("actor") and doc["actor"].get("user_id"):
        doc["actor"]["user_id"] = str(doc["actor"]["user_id"])
    return doc

@router.get("", response_model=dict)
async def get_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    last_id: Optional[str] = Query(None, description="Cursor _id del último registro recibido"),
    log_type: Optional[str] = Query(None, description="Filtrar por GLOBAL_ACTIVITY o IOT_TELEMETRY"),
    criticality: Optional[str] = Query(None, description="Filtrar por INFO, WARNING o CRITICAL"),
    search: Optional[str] = Query(None, description="Buscador por IP, usuario, acción o ESP32 ID"),
    start_time: Optional[str] = Query(None, description="Timestamp de inicio ISO 8601"),
    end_time: Optional[str] = Query(None, description="Timestamp de fin ISO 8601"),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Retorna registros de auditoría forense con soporte para filtros y paginación por cursor.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requiere privilegios de administrador."
        )

    query = build_query(log_type, criticality, search, start_time, end_time, last_id)
    
    # Consultar raw_db para evitar activar interceptores
    cursor = db_service.raw_db.audit_logs.find(query).sort("_id", -1).limit(limit)
    
    logs = []
    async for doc in cursor:
        logs.append(clean_doc(doc))
        
    next_cursor = logs[-1]["_id"] if len(logs) == limit else None
    
    return {
        "logs": logs,
        "next_cursor": next_cursor,
        "has_more": next_cursor is not None
    }

@router.get("/export/json")
async def export_audit_logs_json(
    log_type: Optional[str] = Query(None),
    criticality: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    start_time: Optional[str] = Query(None),
    end_time: Optional[str] = Query(None),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Exporta la bitácora de auditoría forense filtrada en formato JSON streaming.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requiere privilegios de administrador."
        )

    query = build_query(log_type, criticality, search, start_time, end_time)
    
    async def json_generator():
        cursor = db_service.raw_db.audit_logs.find(query).sort("_id", -1).limit(5000)
        yield "[\n"
        first = True
        async for doc in cursor:
            if not first:
                yield ",\n"
            first = False
            yield json.dumps(clean_doc(doc), default=str)
        yield "\n]"

    headers = {
        "Content-Disposition": f"attachment; filename=bitacora_auditoria_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
        "Content-Type": "application/json"
    }
    return StreamingResponse(json_generator(), headers=headers)

@router.get("/export/csv")
async def export_audit_logs_csv(
    log_type: Optional[str] = Query(None),
    criticality: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    start_time: Optional[str] = Query(None),
    end_time: Optional[str] = Query(None),
    current_user: UserResponse = Depends(get_current_user)
):
    """
    Exporta la bitácora de auditoría forense filtrada en formato CSV estructurado streaming.
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado. Se requiere privilegios de administrador."
        )

    query = build_query(log_type, criticality, search, start_time, end_time)

    async def csv_generator():
        output = StringIO()
        writer = csv.writer(output)
        
        # Escribir cabecera
        writer.writerow([
            "ID Registro", "Timestamp (UTC)", "Tipo Log", "Criticidad", "Accion",
            "Actor ID", "Actor Username", "Actor Rol", "Actor IP",
            "Hardware ID/MAC", "Estado Anterior", "Estado Nuevo"
        ])
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)

        cursor = db_service.raw_db.audit_logs.find(query).sort("_id", -1).limit(5000)
        async for doc in cursor:
            clean_doc(doc)
            actor = doc.get("actor", {})
            
            # Formatear valores anteriores y nuevos como cadenas compactas
            prev_val = json.dumps(doc.get("previous_values")) if doc.get("previous_values") else ""
            new_val = json.dumps(doc.get("new_values")) if doc.get("new_values") else ""
            
            # Identidad IoT
            hw_info = doc.get("device_id") or doc.get("mac_address") or ""
            
            writer.writerow([
                doc["_id"],
                doc["timestamp"],
                doc["log_type"],
                doc["criticality"],
                doc["event_action"],
                actor.get("user_id", ""),
                actor.get("username", ""),
                actor.get("role", ""),
                actor.get("ip_address", ""),
                hw_info,
                prev_val,
                new_val
            ])
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

    headers = {
        "Content-Disposition": f"attachment; filename=bitacora_auditoria_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
        "Content-Type": "text/csv; charset=utf-8"
    }
    return StreamingResponse(csv_generator(), headers=headers)
