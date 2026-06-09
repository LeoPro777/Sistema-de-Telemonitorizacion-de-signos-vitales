"""
test_vitals_ws.py — Pruebas de integración para telemetría en tiempo real por WebSockets
"""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from bson import ObjectId
from pymongo import MongoClient

from backend.main import app
from backend.config import settings

@patch("backend.routes.auth.verify_google_id_token_async")
def test_vitals_ws_telemetry(mock_verify):
    """
    Prueba que conecta un WebSocket simulado a /ws/vitals/{patient_id},
    envía tramas de telemetría y verifica que el backend las procesa,
    las almacena y las distribuye correctamente.
    Usamos pymongo síncrono para configurar los datos de prueba y evitar conflictos de loops de asyncio.
    """
    mock_verify.return_value = {
        "email": "testwsuser@gmail.com",
        "sub": "mock_google_id_55555",
        "given_name": "Test",
        "family_name": "WS",
        "picture": "https://example.com/avatar.png"
    }

    # Conectar de forma síncrona con pymongo para preparar los datos
    mongo_client = MongoClient(settings.MONGO_URI)
    db = mongo_client[settings.MONGO_DB]

    patient_id = ObjectId()
    patient_doc = {
        "_id": patient_id,
        "first_name": "Paciente",
        "last_name": "De Prueba",
        "is_active": True,
        "clinical_thresholds": {
            "heart_rate": {"min_bpm": 60, "max_bpm": 100},
            "spo2": {"critical_min_percent": 92},
            "temperature": {"min_celsius": 35.5, "max_celsius": 37.5}
        },
        "last_telemetry_cache": {},
        "has_active_alert": False
    }

    # Insertar el paciente de prueba
    db.patients.insert_one(patient_doc)

    try:
        with TestClient(app) as client:
            # 1. Iniciar sesión para obtener la cookie de sesión cifrada
            login_response = client.post(
                "/api/auth/google-login",
                json={
                    "token": "fake_token_ws_test",
                    "redirect_uri": "http://localhost:5173/login"
                }
            )
            assert login_response.status_code == 200

            # 2. Conectar al WebSocket
            with client.websocket_connect(f"/ws/vitals/{str(patient_id)}") as websocket:
                # 3. Enviar lectura normal
                payload_normal = {
                    "heart_rate": 80,
                    "spo2": 98,
                    "temperature": 36.6
                }
                websocket.send_json(payload_normal)

                # 4. Esperar el broadcast
                data = websocket.receive_json()
                assert data["patient_id"] == str(patient_id)
                assert data["telemetry"]["heart_rate"] == 80
                assert data["telemetry"]["spo2"] == 98
                assert data["telemetry"]["temperature"] == 36.6
                assert data["status"] == "NORMAL"

                # 5. Enviar lectura crítica (Taquicardia + Hipoxia)
                payload_critical = {
                    "heart_rate": 140,
                    "spo2": 88,
                    "temperature": 36.6
                }
                websocket.send_json(payload_critical)

                # 6. Esperar el broadcast y verificar las alertas generadas
                data_crit = websocket.receive_json()
                assert data_crit["status"] == "CRITICAL"
                assert len(data_crit["new_alerts"]) == 2
                
                alert_types = [a["alert_type"] for a in data_crit["new_alerts"]]
                assert "HEART_RATE_CRITICAL" in alert_types
                assert "SPO2_CRITICAL" in alert_types

    finally:
        # Limpiar de forma síncrona
        db.patients.delete_one({"_id": patient_id})
        db.vital_signs_history.delete_many({"patient_id": patient_id})
        db.alerts.delete_many({"patient_id": patient_id})
        mongo_client.close()
