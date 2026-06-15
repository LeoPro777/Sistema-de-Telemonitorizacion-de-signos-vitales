"""
audit.py — Middleware de contexto de auditoría e interceptores automáticos de base de datos
"""

import contextvars
import logging
from datetime import datetime, timezone
from bson import ObjectId
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from backend.services.database import db_service
from backend.services.auth_utils import unsign_session_id

logger = logging.getLogger("app.audit")

# ContextVar para propagar los datos del usuario actor y su IP a través de las corrutinas
audit_context = contextvars.ContextVar("audit_context", default=None)

class AuditContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Obtener la dirección IP
        ip_address = "127.0.0.1"
        if request.client:
            ip_address = request.client.host
        # También chequear cabeceras proxies si existen
        x_forwarded_for = request.headers.get("x-forwarded-for")
        if x_forwarded_for:
            ip_address = x_forwarded_for.split(",")[0].strip()

        # 2. Obtener la sesión y el actor
        actor = {
            "user_id": "system",
            "username": "system",
            "role": "SYSTEM",
            "ip_address": ip_address
        }
        
        session_id_cookie = request.cookies.get("session_id")
        if session_id_cookie:
            try:
                actual_session_id = unsign_session_id(session_id_cookie)
                if actual_session_id:
                    # Usamos raw_db para evitar activar los interceptores durante la validación de sesión
                    session_doc = await db_service.raw_db.auth_sessions.find_one({"session_id": actual_session_id})
                    if session_doc:
                        user_doc = await db_service.raw_db.users.find_one({"_id": ObjectId(session_doc["user_id"])})
                        if user_doc:
                            actor = {
                                "user_id": str(user_doc["_id"]),
                                "username": f"{user_doc.get('first_name', '')} {user_doc.get('last_name', '')}".strip() or user_doc.get("email"),
                                "role": user_doc.get("role", "SYSTEM"),
                                "ip_address": ip_address
                            }
            except Exception as e:
                logger.warning(f"Error al resolver el contexto del actor para auditoría: {e}")

        # Establecer la variable de contexto
        token = audit_context.set({"actor": actor, "ip_address": ip_address})
        try:
            response = await call_next(request)
            return response
        finally:
            audit_context.reset(token)


class WrappedCollection:
    def __init__(self, collection, db_service_inst):
        self._collection = collection
        self._db_service = db_service_inst

    def __getattr__(self, name):
        attr = getattr(self._collection, name)
        # Interceptar mutaciones
        if name in [
            "insert_one", "insert_many", "update_one", "update_many",
            "replace_one", "find_one_and_update", "find_one_and_delete",
            "delete_one", "delete_many"
        ] and callable(attr):
            return self._wrap_mutation(attr, name)
        return attr

    def _wrap_mutation(self, method, name):
        async def wrapper(*args, **kwargs):
            collection_name = self._collection.name
            
            # Evitar bucles infinitos no registrando sobre la propia colección de auditoría
            if collection_name == "audit_logs":
                return await method(*args, **kwargs)

            ctx = audit_context.get()
            actor = ctx.get("actor") if ctx else {
                "user_id": "system",
                "username": "system",
                "role": "SYSTEM",
                "ip_address": "127.0.0.1"
            }

            # Obtener el estado previo del documento (para actualizaciones y eliminaciones de un solo registro)
            previous_doc = None
            query_filter = None
            if name in ["update_one", "replace_one", "find_one_and_update", "delete_one", "find_one_and_delete"]:
                if args:
                    query_filter = args[0]
                elif "filter" in kwargs:
                    query_filter = kwargs["filter"]
                elif "query" in kwargs:
                    query_filter = kwargs["query"]

                if query_filter:
                    previous_doc = await self._collection.find_one(query_filter)

            # Ejecutar la mutación de base de datos
            result = await method(*args, **kwargs)

            # Verificar si la operación realmente modificó/creó algo
            if name in ["update_one", "update_many", "replace_one"]:
                if getattr(result, "modified_count", 0) == 0:
                    return result
            elif name in ["delete_one", "delete_many"]:
                if getattr(result, "deleted_count", 0) == 0:
                    return result
            elif name in ["find_one_and_update", "find_one_and_delete", "find_one_and_replace"]:
                if result is None:
                    return result
            elif name == "insert_one":
                if not getattr(result, "inserted_id", None):
                    return result
            elif name == "insert_many":
                if not getattr(result, "inserted_ids", None):
                    return result

            # Obtener el estado nuevo del documento
            new_doc = None
            if name in ["insert_one"]:
                inserted_id = getattr(result, "inserted_id", None)
                if inserted_id:
                    new_doc = await self._collection.find_one({"_id": inserted_id})
            elif name in ["update_one", "replace_one", "find_one_and_update"] and query_filter:
                new_doc = await self._collection.find_one(query_filter)

            # Determinar acción de auditoría
            event_action = f"{collection_name.upper()}_{name.upper()}"
            if collection_name == "patients":
                if name in ["update_one", "find_one_and_update"]:
                    update_payload = args[1] if len(args) > 1 else kwargs.get("update", {})
                    has_thresholds = False
                    if isinstance(update_payload, dict):
                        set_payload = update_payload.get("$set", {})
                        if any("clinical_thresholds" in k for k in set_payload.keys()):
                            has_thresholds = True
                    if has_thresholds:
                        event_action = "PATIENT_UPDATE_THRESHOLDS"
                    else:
                        event_action = "PATIENT_UPDATE_PROFILE"
            elif collection_name == "devices" and name in ["update_one", "find_one_and_update"]:
                event_action = "DEVICE_OPERATIONAL_MUTATION"
            elif collection_name == "alerts" and name in ["update_one", "find_one_and_update"]:
                event_action = "ALERT_RESOLVED"

            # Determinar criticidad
            criticality = "INFO"
            if event_action in ["PATIENT_UPDATE_THRESHOLDS", "DEVICE_OPERATIONAL_MUTATION", "ALERT_RESOLVED"]:
                criticality = "WARNING"
            elif collection_name == "alerts" or name in ["delete_one", "delete_many"]:
                criticality = "CRITICAL"

            # Limpiar documentos para formatear a JSON plano
            def clean_doc(doc):
                if not doc:
                    return None
                cleaned = dict(doc)
                if "_id" in cleaned:
                    cleaned["_id"] = str(cleaned["_id"])
                for k, v in cleaned.items():
                    if isinstance(v, ObjectId):
                        cleaned[k] = str(v)
                    elif isinstance(v, datetime):
                        cleaned[k] = v.isoformat()
                    elif isinstance(v, dict):
                        cleaned[k] = clean_doc(v)
                    elif isinstance(v, list):
                        cleaned[k] = [
                            clean_doc(item) if isinstance(item, dict) else (
                                str(item) if isinstance(item, ObjectId) else (
                                    item.isoformat() if isinstance(item, datetime) else item
                                )
                            )
                            for item in v
                        ]
                return cleaned

            log_entry = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "log_type": "GLOBAL_ACTIVITY",
                "criticality": criticality,
                "event_action": event_action,
                "actor": {
                    "user_id": str(actor.get("user_id")) if actor.get("user_id") else "system",
                    "username": actor.get("username", "system"),
                    "role": actor.get("role", "SYSTEM"),
                    "ip_address": actor.get("ip_address", "127.0.0.1")
                },
                "hardware_metadata": None,
                "previous_values": clean_doc(previous_doc),
                "new_values": clean_doc(new_doc)
            }

            # Escribir directamente usando raw_db para evitar bucles de envoltura
            await self._db_service.raw_db.audit_logs.insert_one(log_entry)

            return result
        return wrapper


class WrappedDatabase:
    def __init__(self, db, db_service_inst):
        self._db = db
        self._db_service = db_service_inst

    def __getattr__(self, name):
        collection = getattr(self._db, name)
        from motor.motor_asyncio import AsyncIOMotorCollection
        if isinstance(collection, AsyncIOMotorCollection) or hasattr(collection, "insert_one"):
            return WrappedCollection(collection, self._db_service)
        return collection

    def __getitem__(self, name):
        collection = self._db[name]
        return WrappedCollection(collection, self._db_service)
