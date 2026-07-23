"""
vitals.py — WebSocket router for real-time vital signs streams and simulation.
Includes real-time clinical threshold evaluation and automatic alerts triggering.
"""

import json
import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, Set, Optional
from bson import ObjectId
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, status
from pydantic import BaseModel

from backend.services.database import db_service
from backend.services.auth_utils import unsign_session_id
from backend.models.user import TelemetryStatus
from backend.models.applicant import ApprovalStatus
from backend.config import settings
from backend.routes.dashboard import invalidate_dashboard_kpis

logger = logging.getLogger("app.vitals")
router = APIRouter(prefix="", tags=["Monitoreo en Tiempo Real (M3 & M4)"])


# --- GESTOR DE CONEXIONES CON SUSCRIPCIÓN ÚNICA A REDIS PUB/SUB ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.global_connections: Set[WebSocket] = set()
        self.redis_tasks: Dict[str, asyncio.Task] = {}  # Tareas Pub/Sub únicas por paciente

    async def connect(self, patient_id: str, websocket: WebSocket):
        await websocket.accept()
        if patient_id not in self.active_connections:
            self.active_connections[patient_id] = set()
        self.active_connections[patient_id].add(websocket)

        # Si es el primer cliente conectado a este paciente, abrir la escucha única en Redis Pub/Sub
        if len(self.active_connections[patient_id]) == 1 and db_service.redis:
            task = asyncio.create_task(self._listen_redis_channel(patient_id))
            self.redis_tasks[patient_id] = task

        logger.info(f"Cliente conectado al paciente {patient_id}. Sockets activos: {len(self.active_connections[patient_id])}")

    def disconnect(self, patient_id: str, websocket: WebSocket):
        if patient_id in self.active_connections:
            self.active_connections[patient_id].discard(websocket)
            if not self.active_connections[patient_id]:
                del self.active_connections[patient_id]
                # Si ya no quedan clientes interesados, cancelar la tarea de escucha Pub/Sub
                if patient_id in self.redis_tasks:
                    self.redis_tasks[patient_id].cancel()
                    del self.redis_tasks[patient_id]

        logger.info(f"Cliente desconectado del paciente {patient_id}")

    async def _listen_redis_channel(self, patient_id: str):
        """Escuchador único en Redis Pub/Sub para todos los WebSockets de este paciente"""
        pubsub = db_service.redis.pubsub()
        channel_name = f"channel:vitals:{patient_id}"
        try:
            await pubsub.subscribe(channel_name)
            logger.info(f"Conexión Pub/Sub única establecida para el canal: {channel_name}")
            async for message in pubsub.listen():
                if message and message.get('type') == 'message':
                    payload = json.loads(message['data'])
                    await self.broadcast_to_patient(patient_id, payload)
        except asyncio.CancelledError:
            logger.info(f"Suscripción de Redis cancelada para el paciente: {patient_id}")
            try:
                await pubsub.unsubscribe(channel_name)
            except Exception:
                pass
        except Exception as e:
            logger.error(f"Error en el escuchador Pub/Sub global de {patient_id}: {e}")
        finally:
            try:
                await pubsub.close()
            except Exception:
                pass

    async def broadcast_to_patient(self, patient_id: str, message: dict):
        if patient_id in self.active_connections:
            dead_sockets = set()
            for ws in list(self.active_connections[patient_id]):
                try:
                    await ws.send_json(message)
                except Exception:
                    dead_sockets.add(ws)
            for ws in dead_sockets:
                self.active_connections[patient_id].discard(ws)

    async def broadcast_global(self, message: dict):
        dead_sockets = set()
        for ws in list(self.global_connections):
            try:
                await ws.send_json(message)
            except Exception:
                dead_sockets.add(ws)
        self.global_connections.difference_update(dead_sockets)


manager = ConnectionManager()


@router.websocket("/ws/global-alerts")
async def ws_global_alerts_endpoint(websocket: WebSocket):
    await websocket.accept()
    manager.global_connections.add(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except Exception:
        manager.global_connections.discard(websocket)


# Caché en memoria para limitar la ingesta a 1 dato cada 10 segundos por paciente
last_telemetry_time: Dict[str, datetime] = {}


# --- EVALUACIÓN DE UMBRALES CLÍNICOS ---
def evaluate_metrics(telemetry: dict, thresholds: dict) -> tuple:
    """
    Compara los signos vitales con los límites del paciente y determina:
    1. El estado (NORMAL, WARNING, CRITICAL) de cada métrica.
    2. Si se debe disparar una alerta clínica y cuál es la severidad general.
    """
    status_cache = {}
    has_critical = False
    alerts_to_create = []

    # 1. Evaluar Frecuencia Cardíaca (heart_rate)
    hr = telemetry.get("heart_rate", 75)
    hr_thresh = thresholds.get("heart_rate", {"min_bpm": 60, "max_bpm": 100})
    min_hr = hr_thresh.get("min_bpm", 60)
    max_hr = hr_thresh.get("max_bpm", 100)

    if hr < min_hr or hr > max_hr:
        status_cache["heart_rate"] = {"value": float(hr), "status": TelemetryStatus.CRITICAL}
        has_critical = True
        alerts_to_create.append({
            "type": "HEART_RATE_CRITICAL",
            "desc": f"Frecuencia cardíaca fuera de rango: {hr} bpm (Límites: {min_hr}-{max_hr} bpm)",
            "value": float(hr)
        })
    elif hr < (min_hr + 5) or hr > (max_hr - 5):
        status_cache["heart_rate"] = {"value": float(hr), "status": TelemetryStatus.WARNING}
    else:
        status_cache["heart_rate"] = {"value": float(hr), "status": TelemetryStatus.NORMAL}

    # 2. Evaluar Saturación de Oxígeno (spo2)
    spo2 = telemetry.get("spo2", 98)
    spo2_thresh = thresholds.get("spo2", {"critical_min_percent": 92})
    crit_spo2 = spo2_thresh.get("critical_min_percent", 92)

    if spo2 < crit_spo2:
        status_cache["spo2"] = {"value": float(spo2), "status": TelemetryStatus.CRITICAL}
        has_critical = True
        alerts_to_create.append({
            "type": "SPO2_CRITICAL",
            "desc": f"Saturación de oxígeno crítica: {spo2}% (Mínimo: {crit_spo2}%)",
            "value": float(spo2)
        })
    elif spo2 < 95:
        status_cache["spo2"] = {"value": float(spo2), "status": TelemetryStatus.WARNING}
    else:
        status_cache["spo2"] = {"value": float(spo2), "status": TelemetryStatus.NORMAL}

    # 3. Evaluar Temperatura
    temp = telemetry.get("temperature", 36.5)
    temp_thresh = thresholds.get("temperature", {"min_celsius": 35.5, "max_celsius": 37.5})
    min_temp = temp_thresh.get("min_celsius", 35.5)
    max_temp = temp_thresh.get("max_celsius", 37.5)

    if temp < min_temp or temp > max_temp:
        status_cache["temperature"] = {"value": float(temp), "status": TelemetryStatus.CRITICAL}
        has_critical = True
        alerts_to_create.append({
            "type": "TEMPERATURE_CRITICAL",
            "desc": f"Temperatura anormal: {temp}°C (Límites: {min_temp}-{max_temp}°C)",
            "value": float(temp)
        })
    elif temp > (max_temp - 0.3) or temp < (min_temp + 0.3):
        status_cache["temperature"] = {"value": float(temp), "status": TelemetryStatus.WARNING}
    else:
        status_cache["temperature"] = {"value": float(temp), "status": TelemetryStatus.NORMAL}

    overall_status = TelemetryStatus.NORMAL
    if has_critical:
        overall_status = TelemetryStatus.CRITICAL
    elif any(s["status"] == TelemetryStatus.WARNING for s in status_cache.values()):
        overall_status = TelemetryStatus.WARNING

    return overall_status, status_cache, alerts_to_create


# --- PROCESADOR CENTRALIZADO DE TELEMETRÍA (PRINCIPIO DRY) ---
async def process_patient_telemetry(patient_id: str, telemetry_data: dict) -> Optional[dict]:
    """
    Procesador centralizado de ingesta biomédica.
    Atrapa InvalidId, evalúa umbrales, persiste en Mongo y publica en Redis/WebSockets.
    """
    try:
        obj_patient_id = ObjectId(patient_id)
    except Exception:
        logger.warning(f"ID de paciente inválido o malformado: {patient_id}")
        return None

    now = datetime.now(timezone.utc)
    last_telemetry_time[patient_id] = now

    # 1. Obtener paciente y umbrales
    patient = await db_service.db.patients.find_one({"_id": obj_patient_id})
    if not patient:
        return None

    thresholds = patient.get("clinical_thresholds", {
        "heart_rate": {"min_bpm": 60, "max_bpm": 100},
        "spo2": {"critical_min_percent": 92},
        "temperature": {"min_celsius": 35.5, "max_celsius": 37.5}
    })

    overall_status, last_telemetry_cache, alerts_to_create = evaluate_metrics(telemetry_data, thresholds)

    # 2. Persistir en la colección Time-Series de MongoDB
    history_doc = {
        "patient_id": obj_patient_id,
        "timestamp": now,
        "telemetry": telemetry_data
    }
    await db_service.db.vital_signs_history.insert_one(history_doc)

    # 3. Actualizar caché de estado en el documento del paciente
    has_active_alert = len(alerts_to_create) > 0
    await db_service.db.patients.update_one(
        {"_id": obj_patient_id},
        {
            "$set": {
                "last_telemetry_cache": last_telemetry_cache,
                "has_active_alert": has_active_alert,
                "is_online": True,
                "last_telemetry_timestamp": now
            }
        }
    )

    # 4. Consolidar Alertas Críticas (Crear o Actualizar la existente)
    created_alerts = []
    alerts_resolved = False
    if alerts_to_create:
        combined_desc = " | ".join([a["desc"] for a in alerts_to_create])
        alert_type = "MULTIPLE_CRITICAL" if len(alerts_to_create) > 1 else alerts_to_create[0]["type"]

        active_alert = await db_service.db.alerts.find_one({
            "patient_id": obj_patient_id,
            "status": "ACTIVE"
        })

        if active_alert:
            await db_service.db.alerts.update_one(
                {"_id": active_alert["_id"]},
                {
                    "$set": {
                        "alert_type": alert_type,
                        "description": combined_desc,
                        "trigger_value": float(alerts_to_create[0]["value"]),
                        "created_at": now
                    }
                }
            )
        else:
            alert_doc = {
                "_id": ObjectId(),
                "patient_id": obj_patient_id,
                "device_id": patient.get("assigned_device_id"),
                "alert_type": alert_type,
                "severity": "CRITICAL",
                "description": combined_desc,
                "trigger_value": float(alerts_to_create[0]["value"]),
                "status": "ACTIVE",
                "created_at": now,
                "resolved_at": None,
                "resolved_by": None
            }
            await db_service.db.alerts.insert_one(alert_doc)

            # Sanitizar tipos para serialización JSON segura
            alert_doc["_id"] = str(alert_doc["_id"])
            alert_doc["patient_id"] = str(alert_doc["patient_id"])
            if alert_doc.get("device_id"):
                alert_doc["device_id"] = str(alert_doc["device_id"])
            if isinstance(alert_doc.get("created_at"), datetime):
                alert_doc["created_at"] = alert_doc["created_at"].isoformat()
            created_alerts.append(alert_doc)
    else:
        # Auto-resolver si todo volvió a la normalidad
        res = await db_service.db.alerts.update_many(
            {"patient_id": obj_patient_id, "status": "ACTIVE"},
            {"$set": {"status": "RESOLVED", "resolved_at": now, "resolved_by": "SYSTEM"}}
        )
        if res.modified_count > 0:
            alerts_resolved = True

    # 5. Notificar cambios globales si amerita
    if len(created_alerts) > 0 or alerts_resolved:
        await invalidate_dashboard_kpis(obj_patient_id)
        await manager.broadcast_global({"event": "ALERTS_CHANGED"})

    # 6. Preparar Payload de Transmisión
    stream_payload = {
        "patient_id": patient_id,
        "timestamp": now.isoformat(),
        "telemetry": telemetry_data,
        "status": overall_status,
        "cache": last_telemetry_cache,
        "new_alerts": created_alerts,
        "alerts_resolved": alerts_resolved
    }

    # 7. Publicar a Redis Pub/Sub
    if db_service.redis:
        try:
            channel_name = f"channel:vitals:{patient_id}"
            await db_service.redis.publish(channel_name, json.dumps(stream_payload))
        except Exception as e:
            logger.error(f"Error publicando en Redis Pub/Sub: {e}")

    # 8. Broadcast local inmediato (Fallback)
    await manager.broadcast_to_patient(patient_id, stream_payload)
    return stream_payload


# --- WEBSOCKET DE TRANSMISIÓN VITAL REFACTORIZADO ---
@router.websocket("/ws/vitals/{patient_id}")
async def ws_vitals_endpoint(websocket: WebSocket, patient_id: str):
    """
    WebSocket asíncrono para suscribirse al flujo en vivo de signos vitales.
    Delegado al ConnectionManager optimizado y al procesador DRY.
    """
    # Validar sesión por cookie HTTPOnly en el handshake del WebSocket
    session_cookie = websocket.cookies.get("session_id")
    if not session_cookie:
        await websocket.accept()
        await websocket.send_json({"error": "No autenticado. Cookie faltante."})
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    actual_session_id = unsign_session_id(session_cookie)
    if not actual_session_id:
        await websocket.accept()
        await websocket.send_json({"error": "Sesión inválida o expirada."})
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    session_doc = await db_service.db.auth_sessions.find_one({"session_id": actual_session_id})
    if not session_doc or session_doc["expires_at"] < datetime.now(timezone.utc):
        await websocket.accept()
        await websocket.send_json({"error": "Sesión expirada o no encontrada."})
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Validar estructura de ObjectId antes de conectar
    try:
        ObjectId(patient_id)
    except Exception:
        await websocket.accept()
        await websocket.send_json({"error": "ID de paciente malformado."})
        await websocket.close(code=status.WS_1007_INVALID_FRAME_PAYLOADDATA)
        return

    # Conectar de manera segura delegando la administración de Redis al manager
    await manager.connect(patient_id, websocket)

    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
                continue

            try:
                payload = json.loads(data)
                if isinstance(payload, dict) and "heart_rate" in payload and "spo2" in payload and "temperature" in payload:
                    now = datetime.now(timezone.utc)
                    last_time = last_telemetry_time.get(patient_id)
                    rate_limit_seconds = 10 if settings.ENVIRONMENT == "production" else 0.0
                    if last_time and (now - last_time).total_seconds() < rate_limit_seconds:
                        continue

                    telemetry_data = {
                        "heart_rate": int(payload["heart_rate"]),
                        "spo2": int(payload["spo2"]),
                        "temperature": float(payload["temperature"])
                    }

                    # Llamar al procesador unificado DRY
                    await process_patient_telemetry(patient_id, telemetry_data)

            except Exception as e:
                logger.error(f"Error procesando trama entrante en WS para {patient_id}: {e}")

    except WebSocketDisconnect:
        manager.disconnect(patient_id, websocket)
    except Exception as e:
        logger.error(f"Excepción en ciclo WS de paciente {patient_id}: {e}")
        manager.disconnect(patient_id, websocket)


# --- SIMULADOR DE SIGNOS VITALES REFACTORIZADO ---
class TelemetryPayload(BaseModel):
    heart_rate: int
    spo2: int
    temperature: float


@router.post("/api/vitals/simulate/{patient_id}")
async def simulate_vital_signs(patient_id: str, payload: TelemetryPayload):
    """
    Simula el envío de una ráfaga biométrica desde el dispositivo IoT del paciente.
    Utiliza el procesador centralizado DRY `process_patient_telemetry`.
    """
    try:
        ObjectId(patient_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ID de paciente inválido.")

    now = datetime.now(timezone.utc)
    last_time = last_telemetry_time.get(patient_id)
    rate_limit_seconds = 10 if settings.ENVIRONMENT == "production" else 0.0

    if rate_limit_seconds > 0.0 and last_time and (now - last_time).total_seconds() < rate_limit_seconds:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit superado. Límite de dispositivo: 1 dato cada {rate_limit_seconds} segundos."
        )

    # Invocar el procesador centralizado
    result_payload = await process_patient_telemetry(patient_id, payload.model_dump())

    if not result_payload:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Paciente no encontrado u origen de datos inválido.")

    return {
        "status": "success",
        "message": "Datos de signos vitales procesados y transmitidos en vivo.",
        "evaluated_status": result_payload["status"],
        "alerts_triggered": len(result_payload["new_alerts"])
    }
