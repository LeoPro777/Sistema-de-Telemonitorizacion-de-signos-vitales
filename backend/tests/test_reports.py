"""
test_reports.py — Pruebas de integración para el motor de reportes analíticos (/api/reports)
"""

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from bson import ObjectId
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta

from backend.main import app
from backend.config import settings

@patch("backend.routes.auth.verify_google_id_token_async")
def test_reports_workflow(mock_verify):
    """
    Prueba el flujo de trabajo completo del motor de reportes analíticos consolidados (Módulo 13).
    Crea un reporte clínico, un reporte de gestión, lista el histórico y exporta a PDF/CSV.
    """
    mock_verify.return_value = {
        "email": "testreportuser@gmail.com",
        "sub": "mock_google_id_77777",
        "given_name": "Test",
        "family_name": "Reports",
        "picture": "https://example.com/avatar.png"
    }

    # Conectar de forma síncrona con pymongo para preparar los datos
    mongo_client = MongoClient(settings.MONGO_URI)
    db = mongo_client[settings.MONGO_DB]

    patient_id = ObjectId()
    patient_doc = {
        "_id": patient_id,
        "first_name": "Juan",
        "last_name": "Pérez Test",
        "is_active": True,
        "medical_record_id": "MR-99999",
        "national_id": "V-99999999",
        "clinical_thresholds": {
            "heart_rate": {"min_bpm": 60, "max_bpm": 100},
            "spo2": {"critical_min_percent": 92},
            "temperature": {"min_celsius": 35.5, "max_celsius": 37.5}
        },
        "medical_history_summary": {
            "blood_type": "O+",
            "notes": "Paciente de prueba para reporte."
        }
    }

    # Insertar paciente de prueba y algo de historial vital
    db.patients.insert_one(patient_doc)
    
    now = datetime.now(timezone.utc)
    history_docs = [
        {
            "patient_id": patient_id,
            "timestamp": now - timedelta(minutes=10),
            "telemetry": {"heart_rate": 75, "spo2": 97, "temperature": 36.6}
        },
        {
            "patient_id": patient_id,
            "timestamp": now - timedelta(minutes=5),
            "telemetry": {"heart_rate": 82, "spo2": 96, "temperature": 36.8}
        },
        {
            "patient_id": patient_id,
            "timestamp": now,
            "telemetry": {"heart_rate": 90, "spo2": 94, "temperature": 37.1}
        }
    ]
    db.vital_signs_history.insert_many(history_docs)

    try:
        with TestClient(app) as client:
            # 1. Iniciar sesión para obtener cookie
            login_res = client.post(
                "/api/auth/google-login",
                json={
                    "token": "fake_token_reports_test",
                    "redirect_uri": "http://localhost:5173/login"
                }
            )
            assert login_res.status_code == 200

            # 2. Crear Reporte Clínico
            clinical_res = client.post(
                "/api/reports",
                json={
                    "report_type": "CLINICAL",
                    "start_date": (now - timedelta(days=1)).isoformat(),
                    "end_date": (now + timedelta(days=1)).isoformat(),
                    "patient_id": str(patient_id)
                }
            )
            assert clinical_res.status_code == 200
            clinical_data = clinical_res.json()
            assert clinical_data["report_type"] == "CLINICAL"
            assert "preview_snapshot" in clinical_data
            assert clinical_data["preview_snapshot"]["patient_name"] == "Juan Pérez Test"
            assert "avg_bpm" in clinical_data["preview_snapshot"]
            assert "volatility_bpm" in clinical_data["preview_snapshot"]
            assert "correlation_r" in clinical_data["preview_snapshot"]
            
            report_id = clinical_data["_id"]

            # 3. Crear Reporte de Gestión
            management_res = client.post(
                "/api/reports",
                json={
                    "report_type": "MANAGEMENT",
                    "start_date": (now - timedelta(days=1)).isoformat(),
                    "end_date": (now + timedelta(days=1)).isoformat()
                }
            )
            assert management_res.status_code == 200
            management_data = management_res.json()
            assert management_data["report_type"] == "MANAGEMENT"
            assert "preview_snapshot" in management_data
            assert "total_devices" in management_data["preview_snapshot"]
            assert "system_alerts" in management_data["preview_snapshot"]

            # 4. Listar reportes generados
            list_res = client.get("/api/reports")
            assert list_res.status_code == 200
            reports_list = list_res.json()
            assert len(reports_list) >= 2

            # 5. Exportar reporte a PDF
            export_pdf_res = client.get(f"/api/reports/{report_id}/export/pdf")
            assert export_pdf_res.status_code == 200
            assert export_pdf_res.headers["content-type"] == "application/pdf"

            # 6. Exportar reporte a CSV
            export_csv_res = client.get(f"/api/reports/{report_id}/export/csv")
            assert export_csv_res.status_code == 200
            assert "text/csv" in export_csv_res.headers["content-type"]

    finally:
        # Limpieza de la base de datos
        db.patients.delete_one({"_id": patient_id})
        db.vital_signs_history.delete_many({"patient_id": patient_id})
        # Limpiar los reportes generados por la prueba
        user_doc = db.users.find_one({"email": "testreportuser@gmail.com"})
        if user_doc:
            db.generated_reports.delete_many({"requested_by": user_doc["_id"]})
            db.users.delete_one({"_id": user_doc["_id"]})
            db.auth_sessions.delete_many({"user_id": user_doc["_id"]})
        mongo_client.close()
