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

logger = logging.getLogger("app.vitals")
router = APIRouter(prefix="", tags=["Monitoreo en Tiempo Real (M3 & M4)"])

# Gestor de conexiones locales en memoria (Fallback en caso de que Redis falle o no esté presente)
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, patient_id: str, websocket: WebSocket):
        await websocket.accept()
        if patient_id not in self.active_connections:
            self.active_connections[patient_id] = set()
        self.active_connections[patient_id].add(websocket)
        logger.info(f"Cliente suscrito por WebSocket al paciente {patient_id}. Total activos: {len(self.active_connections[patient_id])}")

    def disconnect(self, patient_id: str, websocket: WebSocket):
        if patient_id in self.active_connections:
            self.active_connections[patient_id].discard(websocket)
            if not self.active_connections[patient_id]:
                del self.active_connections[patient_id]
        logger.info(f"Cliente desuscripto de paciente {patient_id}")

    async def broadcast_to_patient(self, patient_id: str, message: dict):
        """
        Envía una trama de datos a todos los WebSockets suscritos a este paciente.
        """
        if patient_id in self.active_connections:
            dead_sockets = set()
            for ws in self.active_connections[patient_id]:
                try:
                    await ws.send_json(message)
                except Exception:
                    dead_sockets.add(ws)
            
            for ws in dead_sockets:
                self.active_connections[patient_id].discard(ws)

manager = ConnectionManager()

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


# --- WEBSOCKET DE TRANSMISIÓN VITAL ---
@router.websocket("/ws/vitals/{patient_id}")
async def ws_vitals_endpoint(websocket: WebSocket, patient_id: str):
    """
    WebSocket asíncrono para suscribirse al flujo en vivo de signos vitales.
    Soporta Redis Pub/Sub y cae a memoria local si no está Redis disponible.
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

    await manager.connect(patient_id, websocket)
    
    redis_pubsub = None
    redis_task = None
    
    try:
        # Intentar suscribirse a Redis Pub/Sub
        if db_service.redis:
            try:
                redis_pubsub = db_service.redis.pubsub()
                channel_name = f"channel:vitals:{patient_id}"
                await redis_pubsub.subscribe(channel_name)
                logger.info(f"Suscrito a canal Redis Pub/Sub: {channel_name}")
                
                async def listen_redis():
                    try:
                        async for message in redis_pubsub.listen():
                            if message and message['type'] == 'message':
                                payload = json.loads(message['data'])
                                await websocket.send_json(payload)
                    except asyncio.CancelledError:
                        pass
                    except Exception as e:
                        logger.error(f"Error escuchando Redis Pub/Sub: {e}")
                
                redis_task = asyncio.create_task(listen_redis())
            except Exception as e:
                logger.warning(f"No se pudo usar Redis Pub/Sub, usando fallback de memoria local: {e}")
                redis_pubsub = None
        
        # Bucle de escucha de mensajes entrantes desde el cliente por si desea configurar algo
        while True:
            data = await websocket.receive_text()
            # Omitimos o procesamos mensajes de ping
            if data == "ping":
                await websocket.send_text("pong")
                continue
            
            try:
                payload = json.loads(data)
                if isinstance(payload, dict) and "heart_rate" in payload and "spo2" in payload and "temperature" in payload:
                    hr = int(payload["heart_rate"])
                    spo2 = int(payload["spo2"])
                    temp = float(payload["temperature"])
                    telemetry_data = {
                        "heart_rate": hr,
                        "spo2": spo2,
                        "temperature": temp
                    }
                    
                    now = datetime.now(timezone.utc)
                    last_time = last_telemetry_time.get(patient_id)
                    rate_limit_seconds = 10 if settings.ENVIRONMENT == "production" else 0.0
                    if last_time and (now - last_time).total_seconds() < rate_limit_seconds:
                        # Rate limit: max 1 per 10 seconds in prod, 0 seconds in dev/test
                        continue
                        
                    last_telemetry_time[patient_id] = now
                    
                    patient = await db_service.db.patients.find_one({"_id": ObjectId(patient_id)})
                    if patient:
                        thresholds = patient.get("clinical_thresholds", {
                            "heart_rate": {"min_bpm": 60, "max_bpm": 100},
                            "spo2": {"critical_min_percent": 92},
                            "temperature": {"min_celsius": 35.5, "max_celsius": 37.5}
                        })
                        
                        overall_status, last_telemetry_cache, alerts_to_create = evaluate_metrics(telemetry_data, thresholds)
                        
                        # Persistir lectura en Timeseries de vital_signs_history
                        history_doc = {
                            "patient_id": ObjectId(patient_id),
                            "timestamp": now,
                            "telemetry": telemetry_data
                        }
                        await db_service.db.vital_signs_history.insert_one(history_doc)
                        
                        # Actualizar cache y estado de alerta en el paciente
                        has_active_alert = len(alerts_to_create) > 0
                        await db_service.db.patients.update_one(
                            {"_id": ObjectId(patient_id)},
                            {
                                "$set": {
                                    "last_telemetry_cache": last_telemetry_cache,
                                    "has_active_alert": has_active_alert
                                }
                            }
                        )
                        
                        # Crear alertas en la colección alerts
                        created_alerts = []
                        for alert in alerts_to_create:
                            alert_doc = {
                                "_id": ObjectId(),
                                "patient_id": ObjectId(patient_id),
                                "device_id": patient.get("assigned_device_id"),
                                "alert_type": alert["type"],
                                "severity": "CRITICAL",
                                "description": alert["desc"],
                                "trigger_value": alert["value"],
                                "status": "ACTIVE",
                                "created_at": now,
                                "resolved_at": None,
                                "resolved_by": None
                            }
                            await db_service.db.alerts.insert_one(alert_doc)
                            
                            alert_doc["_id"] = str(alert_doc["_id"])
                            alert_doc["patient_id"] = str(alert_doc["patient_id"])
                            if alert_doc["device_id"]:
                                alert_doc["device_id"] = str(alert_doc["device_id"])
                            if isinstance(alert_doc["created_at"], datetime):
                                alert_doc["created_at"] = alert_doc["created_at"].isoformat()
                            created_alerts.append(alert_doc)
                        
                        # Preparar paquete de transmisión
                        stream_payload = {
                            "patient_id": patient_id,
                            "timestamp": now.isoformat(),
                            "telemetry": telemetry_data,
                            "status": overall_status,
                            "cache": last_telemetry_cache,
                            "new_alerts": created_alerts
                        }
                        
                        # Publicar en Redis Pub/Sub
                        if db_service.redis:
                            try:
                                channel_name = f"channel:vitals:{patient_id}"
                                await db_service.redis.publish(channel_name, json.dumps(stream_payload))
                            except Exception as e:
                                logger.error(f"Error publicando en Redis: {e}")
                                
                        # También enviar por fallback en memoria local
                        await manager.broadcast_to_patient(patient_id, stream_payload)
            except Exception as e:
                logger.error(f"Error procesando mensaje WebSocket del cliente para paciente {patient_id}: {e}")

    except WebSocketDisconnect:
        manager.disconnect(patient_id, websocket)
    except Exception as e:
        logger.error(f"Error en WebSocket para paciente {patient_id}: {e}")
        manager.disconnect(patient_id, websocket)
    finally:
        if redis_task:
            redis_task.cancel()
        if redis_pubsub:
            try:
                await redis_pubsub.unsubscribe()
            except Exception:
                pass


# --- SIMULADOR DE SIGNOS VITALES ---
class TelemetryPayload(BaseModel):
    heart_rate: int
    spo2: int
    temperature: float

@router.post("/api/vitals/simulate/{patient_id}")
async def simulate_vital_signs(patient_id: str, payload: TelemetryPayload):
    """
    Simula el envío de una ráfaga biométrica desde el dispositivo IoT del paciente.
    Persiste en MongoDB (Time-Series) y distribuye por Redis Pub/Sub y WebSockets.
    """
    now = datetime.now(timezone.utc)
    last_time = last_telemetry_time.get(patient_id)
    rate_limit_seconds = 10 if settings.ENVIRONMENT == "production" else 0.0
    if rate_limit_seconds > 0.0:
        if last_time and (now - last_time).total_seconds() < rate_limit_seconds:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. The physical device limitation allows 1 data point per {rate_limit_seconds} seconds."
            )
    last_telemetry_time[patient_id] = now
    
    # 1. Obtener al paciente para verificar umbrales clínicos y dispositivo asignado
    patient = await db_service.db.patients.find_one({"_id": ObjectId(patient_id)})
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paciente no encontrado."
        )

    # 2. Evaluar métricas contra sus umbrales clínicos
    thresholds = patient.get("clinical_thresholds", {
        "heart_rate": {"min_bpm": 60, "max_bpm": 100},
        "spo2": {"critical_min_percent": 92},
        "temperature": {"min_celsius": 35.5, "max_celsius": 37.5}
    })
    
    telemetry_data = payload.model_dump()
    overall_status, last_telemetry_cache, alerts_to_create = evaluate_metrics(telemetry_data, thresholds)

    # 3. Persistir lectura en Timeseries de vital_signs_history
    history_doc = {
        "patient_id": ObjectId(patient_id),
        "timestamp": now,
        "telemetry": telemetry_data
    }
    await db_service.db.vital_signs_history.insert_one(history_doc)

    # 4. Actualizar cache y estado de alerta en el paciente
    has_active_alert = len(alerts_to_create) > 0
    await db_service.db.patients.update_one(
        {"_id": ObjectId(patient_id)},
        {
            "$set": {
                "last_telemetry_cache": last_telemetry_cache,
                "has_active_alert": has_active_alert
            }
        }
    )

    # 5. Si se detectó anomalía crítica, crear las alertas en la colección alerts
    created_alerts = []
    for alert in alerts_to_create:
        alert_doc = {
            "_id": ObjectId(),
            "patient_id": ObjectId(patient_id),
            "device_id": patient.get("assigned_device_id"),
            "alert_type": alert["type"],
            "severity": "CRITICAL",
            "description": alert["desc"],
            "trigger_value": alert["value"],
            "status": "ACTIVE",
            "created_at": now,
            "resolved_at": None,
            "resolved_by": None
        }
        await db_service.db.alerts.insert_one(alert_doc)
        
        # Formatear el ID de alert para retornarlo
        alert_doc["_id"] = str(alert_doc["_id"])
        alert_doc["patient_id"] = str(alert_doc["patient_id"])
        if alert_doc["device_id"]:
            alert_doc["device_id"] = str(alert_doc["device_id"])
        created_alerts.append(alert_doc)

    # 6. Preparar paquete de transmisión
    stream_payload = {
        "patient_id": patient_id,
        "timestamp": now.isoformat(),
        "telemetry": telemetry_data,
        "status": overall_status,
        "cache": last_telemetry_cache,
        "new_alerts": created_alerts
    }

    # 7. Publicar en Redis Pub/Sub
    if db_service.redis:
        try:
            channel_name = f"channel:vitals:{patient_id}"
            await db_service.redis.publish(channel_name, json.dumps(stream_payload))
        except Exception as e:
            logger.error(f"Error publicando en Redis: {e}")

    # 8. También enviar por fallback en memoria local
    await manager.broadcast_to_patient(patient_id, stream_payload)

    return {
        "status": "success",
        "message": "Datos de signos vitales procesados y transmitidos en vivo.",
        "evaluated_status": overall_status,
        "alerts_triggered": len(created_alerts)
    }
