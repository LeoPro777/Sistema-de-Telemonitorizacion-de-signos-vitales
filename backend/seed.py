"""
seed.py — Script para inicializar la base de datos MongoDB con datos semilla profesionales.
Permite probar los flujos de login, 2FA, onboarding, dashboard, pacientes y gráficos en tiempo real.
"""

import asyncio
import random
from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from backend.config import settings
from backend.services.auth_utils import get_password_hash
from backend.models.user import UserRole, UserStatus, TelemetryStatus
from backend.models.applicant import ApprovalStatus, ClientType

async def run_seed():
    print(f"Iniciando seeding completo de MongoDB en: {settings.MONGO_URI}...")
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB]
    
    # 1. Limpiar colecciones anteriores para evitar duplicados
    collections_to_clear = [
        "users", "applicants", "dashboard_configs", "dashboard_kpi_cache", 
        "doctors", "clients", "patients", "devices", "vital_signs_history", 
        "alerts", "auth_sessions"
    ]
    for col in collections_to_clear:
        await db[col].delete_many({})
        print(f"Limpiada colección: {col}")

    now = datetime.utcnow()

    # 2. Generar Hashes de Contraseñas
    admin_hash = get_password_hash("admin123")
    doctor_hash = get_password_hash("doctor123")
    client_hash = get_password_hash("client123")
    patient_hash = get_password_hash("patient123")
    pending_hash = get_password_hash("pending123")

    # 3. Crear Usuarios Semilla
    admin_id = ObjectId()
    doctor_id = ObjectId()
    client_id = ObjectId()
    patient_id = ObjectId()
    pending_id = ObjectId()

    users = [
        {
            "_id": admin_id,
            "username": "admin",
            "email": "admin@telemonitor.com",
            "password_hash": admin_hash,
            "role": UserRole.ADMIN,
            "status": UserStatus.ACTIVE,
            "two_factor": {"enabled": False, "secret": None},
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": doctor_id,
            "username": "dr_lopez",
            "email": "lopez@clinic.com",
            "password_hash": doctor_hash,
            "role": UserRole.DOCTOR,
            "status": UserStatus.ACTIVE,
            "two_factor": {"enabled": True, "secret": "JBSWY3DPEHPK3PXP"}, 
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": client_id,
            "username": "clinica_central",
            "email": "contacto@central.com",
            "password_hash": client_hash,
            "role": UserRole.CLIENT,
            "status": UserStatus.ACTIVE,
            "two_factor": {"enabled": False, "secret": None},
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": patient_id,
            "username": "juan_perez",
            "email": "juan@perez.com",
            "password_hash": patient_hash,
            "role": UserRole.PATIENT,
            "status": UserStatus.ACTIVE,
            "two_factor": {"enabled": False, "secret": None},
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": pending_id,
            "username": "dr_garcia",
            "email": "garcia@hospital.com",
            "password_hash": pending_hash,
            "role": UserRole.DOCTOR,
            "status": UserStatus.PENDING,
            "two_factor": {"enabled": False, "secret": None},
            "created_at": now,
            "updated_at": now
        }
    ]

    await db.users.insert_many(users)
    print("Usuarios creados exitosamente.")

    # 4. Crear solicitud de Onboarding para el usuario PENDING
    pending_applicant = {
        "_id": ObjectId(),
        "requested_role": UserRole.DOCTOR,
        "status": ApprovalStatus.PENDING_APPROVAL,
        "personal_data": {
            "first_name": "Mateo",
            "last_name": "García",
            "email": "garcia@hospital.com",
            "phone": "+56 9 8765 4321",
            "identification_number": "12345678-9"
        },
        "professional_metadata": {
            "medical_license": "LIC-98765-MED",
            "specialty": "Cardiología",
            "institution_origin": "Hospital General"
        },
        "verification_documents": [
            {"url": "/docs/licencia.pdf", "doc_type": "LICENCIA_MEDICA"},
            {"url": "/docs/cedula.pdf", "doc_type": "IDENTIFICACION_NACIONAL"}
        ],
        "audit_review": None,
        "submitted_at": now - timedelta(hours=2)
    }
    await db.applicants.insert_one(pending_applicant)
    print("Solicitud de onboarding pendiente creada.")

    # 5. Crear perfiles de Doctor y Cliente
    doctor_profile_id = ObjectId()
    doctor_profile = {
        "_id": doctor_profile_id,
        "user_id": doctor_id,
        "is_active": True,
        "ui_preferences": {"view_type": "CARDS"},
        "license_number": "LIC-54321-MED",
        "internal_staff_id": "STAFF-9821",
        "first_name": "Sofía",
        "last_name": "López",
        "specialty": "Cardiología Infantil",
        "contact": {
            "phone": "+56 9 1234 5678",
            "office_location": "Pabellón A, Oficina 204"
        },
        "active_patients_count": 1,
        "created_at": now,
        "updated_at": now
    }
    await db.doctors.insert_one(doctor_profile)

    client_profile_id = ObjectId()
    client_profile = {
        "_id": client_profile_id,
        "user_id": client_id,
        "is_active": True,
        "status": "APPROVED",
        "client_type": ClientType.CLINICA,
        "corporate_name": "Clínica del Norte S.A.",
        "tax_id": "99.888.777-6",
        "contact_info": {
            "phone": "+56 2 2999 8888",
            "address": "Av. Apoquindo 4500, Las Condes",
            "emergency_email": "urgencias@central.com"
        },
        "ui_preferences": {"view_type": "LIST"},
        "summary_cache": {
            "assigned_patients_count": 1,
            "active_critical_alerts": 0,
            "contract_health_percent": 100
        },
        "created_at": now,
        "updated_at": now
    }
    await db.clients.insert_one(client_profile)
    print("Perfiles de Doctor y Cliente creados.")

    # 6. Crear Dispositivos IoT (Módulo 5)
    device_id = ObjectId()
    devices = [
        {
            "_id": device_id,
            "serial_number": "AURA-ESP32-9021",
            "mac_address": "24:0A:C4:8B:58:9C",
            "model_version": "V1.2",
            "is_active": True,
            "approval_status": "APPROVED",
            "operational_status": "ASSIGNED",
            "hardware_metrics": {
                "battery_percent": 84,
                "signal_strength_dbm": -65,
                "last_ping_at": now
            },
            "has_hardware_alert": False
        },
        {
            "_id": ObjectId(),
            "serial_number": "AURA-ESP32-5510",
            "mac_address": "30:AE:A4:07:0F:70",
            "model_version": "V1.2",
            "is_active": True,
            "approval_status": "APPROVED",
            "operational_status": "AVAILABLE",
            "hardware_metrics": {
                "battery_percent": 95,
                "signal_strength_dbm": -52,
                "last_ping_at": now - timedelta(minutes=15)
            },
            "has_hardware_alert": False
        }
    ]
    await db.devices.insert_many(devices)
    print("Dispositivos de telemetría IoT creados.")

    # 7. Crear Expediente de Paciente (Módulo 3 y 4)
    patient_profile_id = ObjectId()
    patient_doc = {
        "_id": patient_profile_id,
        "user_id": patient_id,
        "is_active": True,
        "ui_preferences": {"view_type": "CARDS"},
        "medical_record_id": "MG-76342",
        "national_id": "11.222.333-4",
        "first_name": "Juan",
        "last_name": "Pérez",
        "assigned_doctor_id": doctor_profile_id,
        "assigned_device_id": device_id,
        "client_id": client_profile_id,
        "clinical_thresholds": {
            "heart_rate": {"min_bpm": 60, "max_bpm": 100},
            "spo2": {"critical_min_percent": 92},
            "temperature": {"min_celsius": 35.5, "max_celsius": 37.5}
        },
        "last_telemetry_cache": {
            "heart_rate": {"value": 78.0, "status": TelemetryStatus.NORMAL},
            "spo2": {"value": 98.0, "status": TelemetryStatus.NORMAL},
            "temperature": {"value": 36.6, "status": TelemetryStatus.NORMAL}
        },
        "has_active_alert": False,
        "medical_history_summary": {
            "blood_type": "O+",
            "pathologies": ["Hipertensión Arterial", "Diabetes Tipo 2"],
            "allergies": ["Penicilina", "Polvo"],
            "notes": "Marcapasos instalado en 2024. Monitoreo diario por telemetría."
        },
        "created_at": now - timedelta(days=10)
    }
    await db.patients.insert_one(patient_doc)
    print("Expediente de Paciente (Juan Pérez) inicializado.")

    # 8. Crear Serie de Tiempo en vital_signs_history
    history_docs = []
    # Generar 30 minutos de historial de signos vitales (1 por minuto)
    base_time = now - timedelta(minutes=30)
    
    # Signos vitales normales basales
    for i in range(30):
        timestamp = base_time + timedelta(minutes=i)
        
        # Simular fluctuación fisiológica normal
        hr = int(72 + random.randint(-5, 6))
        spo2 = int(96 + random.randint(0, 3))
        temp = float(round(36.3 + random.uniform(-0.3, 0.4), 1))
        
        # Una lectura anómala simulada hace 15 minutos para simular histórico de alerta
        if i == 15:
            hr = 108 # Supera el max_bpm de 100
            spo2 = 91 # Bajo el crit_spo2 de 92 (Alerta Crítica!)
            temp = 38.2 # Fiebre alta
            
        history_docs.append({
            "patient_id": patient_profile_id,
            "timestamp": timestamp,
            "telemetry": {
                "heart_rate": hr,
                "spo2": spo2,
                "temperature": temp
            }
        })
        
    await db.vital_signs_history.insert_many(history_docs)
    print("Historial de Series de Tiempo (vital_signs_history) precargado con 30 lecturas.")

    # 9. Agregar una alerta histórica ya resuelta y una activa para pruebas
    alerts = [
        {
            "_id": ObjectId(),
            "patient_id": patient_profile_id,
            "device_id": device_id,
            "alert_type": "HEART_RATE_CRITICAL",
            "severity": "CRITICAL",
            "description": "Frecuencia cardíaca fuera de rango: 108 bpm (Límites: 60-100 bpm)",
            "trigger_value": 108.0,
            "status": "RESOLVED",
            "created_at": now - timedelta(minutes=15),
            "resolved_at": now - timedelta(minutes=10),
            "resolved_by": doctor_id
        }
    ]
    await db.alerts.insert_many(alerts)
    print("Bitácora de alertas del paciente inicializada.")

    # 10. Configurar widgets para cada usuario
    dashboard_configs = [
        {
            "user_id": admin_id,
            "layout_version": "1.0.0",
            "visible_widgets": [
                {"widget_id": "total_patients", "position_order": 1, "refresh_interval_ms": 30000},
                {"widget_id": "active_devices", "position_order": 2, "refresh_interval_ms": 30000},
                {"widget_id": "pending_applicants", "position_order": 3, "refresh_interval_ms": 10000},
                {"widget_id": "incident_chart", "position_order": 4, "refresh_interval_ms": 60000},
            ],
            "theme_preference": "premium_dark"
        },
        {
            "user_id": doctor_id,
            "layout_version": "1.0.0",
            "visible_widgets": [
                {"widget_id": "my_patients", "position_order": 1, "refresh_interval_ms": 30000},
                {"widget_id": "active_alerts", "position_order": 2, "refresh_interval_ms": 5000},
                {"widget_id": "resolved_today", "position_order": 3, "refresh_interval_ms": 30000},
                {"widget_id": "alerts_chart", "position_order": 4, "refresh_interval_ms": 60000},
            ],
            "theme_preference": "premium_dark"
        },
        {
            "user_id": client_id,
            "layout_version": "1.0.0",
            "visible_widgets": [
                {"widget_id": "client_patients", "position_order": 1, "refresh_interval_ms": 30000},
                {"widget_id": "critical_alerts", "position_order": 2, "refresh_interval_ms": 5000},
                {"widget_id": "contract_health", "position_order": 3, "refresh_interval_ms": 60000},
            ],
            "theme_preference": "premium_dark"
        }
    ]
    await db.dashboard_configs.insert_many(dashboard_configs)
    print("Configuración de widgets del dashboard asignada.")

    # 11. Inicializar KPI cache
    kpi_caches = [
        {
            "_id": "admin_summary",
            "owner_id": None,
            "cached_metrics": {
                "total_patients": 1,
                "active_devices": 1,
                "pending_applicants": 1, 
                "critical_alerts_count": 0,
                "system_status_percent": 100
            },
            "last_cached_at": now
        },
        {
            "_id": f"doctor_{doctor_id}_summary",
            "owner_id": doctor_id,
            "cached_metrics": {
                "my_patients": 1,
                "active_alerts": 0,
                "resolved_today": 1,
                "alerts_week_count": 1
            },
            "last_cached_at": now
        },
        {
            "_id": f"client_{client_id}_summary",
            "owner_id": client_id,
            "cached_metrics": {
                "client_patients": 1,
                "critical_alerts": 0,
                "contract_health": 100,
                "total_clinical_sites": 1
            },
            "last_cached_at": now
        }
    ]
    await db.dashboard_kpi_cache.insert_many(kpi_caches)
    print("KPIs precacheados inicializados.")

    print("\n¡Seeding completado con éxito!")
    print("Cuentas disponibles para pruebas:")
    print("  1. ADMIN:   admin / admin123")
    print("  2. DOCTOR:  dr_lopez / doctor123  (SOPORTA 2FA - Código OTP debug: 123456)")
    print("  3. CLIENTE: clinica_central / client123")
    print("  4. PACIENTE: juan_perez / patient123  (ID de paciente: " + str(patient_profile_id) + ")")
    print("  5. PENDIENTE: dr_garcia / pending123 (Prueba de Pantalla de Espera)")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(run_seed())
