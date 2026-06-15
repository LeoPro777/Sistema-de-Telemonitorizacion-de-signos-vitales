"""
test_audit_logs.py — Pruebas de integración para el interceptor de base de datos y la consola de auditoría (Módulo 12)
"""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from bson import ObjectId
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta

from backend.main import app
from backend.config import settings
from backend.services.database import db_service

@patch("backend.routes.auth.verify_google_id_token_async")
def test_audit_logs_workflow(mock_verify):
    """
    Prueba el flujo completo de auditoría forense:
    1. Iniciar sesión.
    2. Cambiar rol a ADMIN para acceso.
    3. Mutar la base de datos (e.g., registrar/actualizar paciente) para disparar el interceptor.
    4. Consultar bitácora de auditoría (/api/audit-logs) y verificar el registro diff.
    5. Exportar bitácora en JSON y CSV.
    6. Comprobar que accesos sin privilegios de ADMIN son denegados con 403.
    """
    mock_verify.return_value = {
        "email": "testaudituser@gmail.com",
        "sub": "mock_google_id_88888",
        "given_name": "Test",
        "family_name": "Audit",
        "picture": "https://example.com/avatar.png"
    }

    # Conectar de forma síncrona para preparar y verificar datos
    mongo_client = MongoClient(settings.MONGO_URI)
    db = mongo_client[settings.MONGO_DB]

    # Limpieza previa
    db.audit_logs.delete_many({"actor.username": "Test Audit"})
    
    patient_id = ObjectId()
    patient_doc = {
        "_id": patient_id,
        "first_name": "Ernesto",
        "last_name": "Valores Test",
        "is_active": True,
        "medical_record_id": "MR-88888",
        "national_id": "V-88888888",
        "clinical_thresholds": {
            "heart_rate": {"min_bpm": 60, "max_bpm": 100},
            "spo2": {"critical_min_percent": 92},
            "temperature": {"min_celsius": 35.5, "max_celsius": 37.5}
        },
        "medical_history_summary": {
            "blood_type": "AB+",
            "notes": "Paciente para probar auditoría."
        }
    }
    db.patients.insert_one(patient_doc)

    try:
        with TestClient(app) as client:
            # 1. Google Login
            login_res = client.post(
                "/api/auth/google-login",
                json={
                    "token": "fake_token_audit_test",
                    "redirect_uri": "http://localhost:5173/login"
                }
            )
            assert login_res.status_code == 200

            # 2. Forzar rol de ADMIN y status approved para el usuario creado
            db.users.update_one(
                {"email": "testaudituser@gmail.com"},
                {"$set": {"role": "ADMIN", "status": "approved"}}
            )

            # 3. Mutar la base de datos haciendo un cambio de umbrales clínicos vía API
            # Esto debe disparar de forma automática nuestro WrappedCollection interceptor
            update_payload = {
                "clinical_thresholds": {
                    "heart_rate": {"min_bpm": 65, "max_bpm": 110},
                    "spo2": {"critical_min_percent": 90},
                    "temperature": {"min_celsius": 35.0, "max_celsius": 38.0}
                }
            }
            update_res = client.put(f"/api/patients/{str(patient_id)}", json=update_payload)
            assert update_res.status_code == 200

            # 4. Consultar /api/audit-logs
            audit_res = client.get("/api/audit-logs")
            assert audit_res.status_code == 200
            audit_data = audit_res.json()
            assert "logs" in audit_data
            
            # Buscar el registro de la acción PATIENT_UPDATE_THRESHOLDS
            patient_update_logs = [l for l in audit_data["logs"] if l["event_action"] == "PATIENT_UPDATE_THRESHOLDS"]
            assert len(patient_update_logs) > 0
            
            target_log = patient_update_logs[0]
            assert target_log["actor"]["username"] == "Test Audit"
            assert target_log["actor"]["role"] == "ADMIN"
            assert target_log["previous_values"]["clinical_thresholds"]["heart_rate"]["min_bpm"] == 60
            assert target_log["new_values"]["clinical_thresholds"]["heart_rate"]["min_bpm"] == 65

            # 5. Probar exportación estructurada JSON
            export_json_res = client.get("/api/audit-logs/export/json")
            assert export_json_res.status_code == 200
            assert export_json_res.headers["content-type"] == "application/json"
            json_logs = export_json_res.json()
            assert len(json_logs) > 0

            # 6. Probar exportación bitácora estructurada CSV
            export_csv_res = client.get("/api/audit-logs/export/csv")
            assert export_csv_res.status_code == 200
            assert "text/csv" in export_csv_res.headers["content-type"]
            csv_content = export_csv_res.text
            assert "Ernesto" in csv_content or "testaudituser" in csv_content

            # 7. Cambiar el rol a DOCTOR y validar denegación de acceso (403)
            db.users.update_one(
                {"email": "testaudituser@gmail.com"},
                {"$set": {"role": "DOCTOR"}}
            )
            denied_res = client.get("/api/audit-logs")
            assert denied_res.status_code == 403

    finally:
        # Limpieza de la base de datos
        db.patients.delete_one({"_id": patient_id})
        db.audit_logs.delete_many({"actor.username": "Test Audit"})
        user_doc = db.users.find_one({"email": "testaudituser@gmail.com"})
        if user_doc:
            db.users.delete_one({"_id": user_doc["_id"]})
            db.auth_sessions.delete_many({"user_id": user_doc["_id"]})
        mongo_client.close()
