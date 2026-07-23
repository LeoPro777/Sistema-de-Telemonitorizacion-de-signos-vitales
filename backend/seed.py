"""
seed.py — Script para inicializar la base de datos MongoDB con datos semilla profesionales.
Permite probar los flujos de login, 2FA, onboarding, dashboard, pacientes y gráficos en tiempo real.
"""

import asyncio
import random
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from backend.config import settings
from backend.services.auth_utils import get_password_hash
from backend.models.user import UserRole, UserStatus, TelemetryStatus
from backend.models.applicant import ApprovalStatus, ClientType

async def run_seed():
    print(f"Iniciando seeding completo de MongoDB en: {settings.MONGO_URI}...")
    client = AsyncIOMotorClient(settings.MONGO_URI, tz_aware=True)
    db = client[settings.MONGO_DB]
    
    # 1. Limpiar colecciones anteriores para evitar duplicados
    collections_to_clear = [
        "users", "applicants", "dashboard_configs", "dashboard_kpi_cache", 
        "doctors", "clients", "patients", "devices", "vital_signs_history", 
        "alerts", "auth_sessions", "help_articles", "support_tickets", 
        "user_profiles", "user_preferences"
    ]
    for col in collections_to_clear:
        await db[col].delete_many({})
        print(f"Limpiada colección: {col}")

    now = datetime.now(timezone.utc)

    # 2. Generar Hashes de Contraseñas
    admin_hash = get_password_hash("admin123")
    doctor_hash = get_password_hash("doctor123")
    client_hash = get_password_hash("client123")
    patient_hash = get_password_hash("patient123")
    pending_hash = get_password_hash("pending123")

    # 3. Crear Usuarios Semilla
    admin_id = ObjectId()
    doctor_id = ObjectId()
    doctor_gonzalez_user_id = ObjectId()
    doctor_martinez_user_id = ObjectId()
    doctor_ramirez_user_id = ObjectId()
    client_id = ObjectId()
    clinica_sur_user_id = ObjectId()
    hogar_familiar_user_id = ObjectId()
    clinica_condes_user_id = ObjectId()
    patient_id = ObjectId()
    pending_id = ObjectId()

    users = [
        {
            "_id": admin_id,
            "username": "admin",
            "email": "admin@telemonitor.com",
            "google_id": "google_admin",
            "first_name": "Admin",
            "last_name": "Global",
            "avatar_url": "https://api.dicebear.com/7.x/adventurer/svg?seed=admin",
            "password_hash": admin_hash,
            "role": UserRole.ADMIN,
            "status": UserStatus.APPROVED,
            "two_factor": {"enabled": False, "secret": None},
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": doctor_id,
            "username": "dr_lopez",
            "email": "lopez@clinic.com",
            "google_id": "google_dr_lopez",
            "first_name": "Sofía",
            "last_name": "López",
            "avatar_url": "https://api.dicebear.com/7.x/adventurer/svg?seed=dr_lopez",
            "password_hash": doctor_hash,
            "role": UserRole.DOCTOR,
            "status": UserStatus.APPROVED,
            "two_factor": {"enabled": True, "secret": "JBSWY3DPEHPK3PXP"}, 
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": doctor_gonzalez_user_id,
            "username": "dr_gonzalez",
            "email": "gonzalez@clinic.com",
            "google_id": "google_dr_gonzalez",
            "first_name": "Carlos",
            "last_name": "González",
            "avatar_url": "https://api.dicebear.com/7.x/adventurer/svg?seed=dr_gonzalez",
            "password_hash": doctor_hash,
            "role": UserRole.DOCTOR,
            "status": UserStatus.APPROVED,
            "two_factor": {"enabled": False, "secret": None}, 
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": doctor_martinez_user_id,
            "username": "dr_martinez",
            "email": "martinez@clinic.com",
            "google_id": "google_dr_martinez",
            "first_name": "Laura",
            "last_name": "Martínez",
            "avatar_url": "https://api.dicebear.com/7.x/adventurer/svg?seed=dr_martinez",
            "password_hash": doctor_hash,
            "role": UserRole.DOCTOR,
            "status": UserStatus.APPROVED,
            "two_factor": {"enabled": False, "secret": None}, 
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": doctor_ramirez_user_id,
            "username": "dr_ramirez",
            "email": "ramirez@clinic.com",
            "google_id": "google_dr_ramirez",
            "first_name": "Pedro",
            "last_name": "Ramírez",
            "avatar_url": "https://api.dicebear.com/7.x/adventurer/svg?seed=dr_ramirez",
            "password_hash": doctor_hash,
            "role": UserRole.DOCTOR,
            "status": UserStatus.SUSPENDED,
            "two_factor": {"enabled": False, "secret": None}, 
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": client_id,
            "username": "clinica_central",
            "email": "contacto@central.com",
            "google_id": "google_client",
            "first_name": "Clínica",
            "last_name": "Central",
            "avatar_url": "https://api.dicebear.com/7.x/adventurer/svg?seed=client",
            "password_hash": client_hash,
            "role": UserRole.CLIENT,
            "status": UserStatus.APPROVED,
            "two_factor": {"enabled": False, "secret": None},
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": patient_id,
            "username": "juan_perez",
            "email": "juan@perez.com",
            "google_id": "google_patient",
            "first_name": "Juan",
            "last_name": "Pérez",
            "avatar_url": "https://api.dicebear.com/7.x/adventurer/svg?seed=juan_perez",
            "password_hash": patient_hash,
            "role": UserRole.PATIENT,
            "status": UserStatus.APPROVED,
            "two_factor": {"enabled": False, "secret": None},
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": clinica_sur_user_id,
            "username": "clinica_sur",
            "email": "contacto@clinicasur.com",
            "google_id": "google_client_sur",
            "first_name": "Clínica",
            "last_name": "Sur",
            "avatar_url": "https://api.dicebear.com/7.x/adventurer/svg?seed=client_sur",
            "password_hash": client_hash,
            "role": UserRole.CLIENT,
            "status": UserStatus.APPROVED,
            "two_factor": {"enabled": False, "secret": None}, 
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": hogar_familiar_user_id,
            "username": "hogar_familiar",
            "email": "contacto@donbosco.com",
            "google_id": "google_client_donbosco",
            "first_name": "Ignacio",
            "last_name": "Valenzuela",
            "avatar_url": "https://api.dicebear.com/7.x/adventurer/svg?seed=client_donbosco",
            "password_hash": client_hash,
            "role": UserRole.CLIENT,
            "status": UserStatus.APPROVED,
            "two_factor": {"enabled": False, "secret": None}, 
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": clinica_condes_user_id,
            "username": "clinica_condes",
            "email": "contacto@medicacondes.com",
            "google_id": "google_client_condes",
            "first_name": "Clínica",
            "last_name": "Condes",
            "avatar_url": "https://api.dicebear.com/7.x/adventurer/svg?seed=client_condes",
            "password_hash": client_hash,
            "role": UserRole.CLIENT,
            "status": UserStatus.SUSPENDED,
            "two_factor": {"enabled": False, "secret": None}, 
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": pending_id,
            "username": "dr_garcia",
            "email": "garcia@hospital.com",
            "google_id": "google_dr_garcia",
            "first_name": "Mateo",
            "last_name": "García",
            "avatar_url": "https://api.dicebear.com/7.x/adventurer/svg?seed=dr_garcia",
            "password_hash": pending_hash,
            "role": UserRole.DOCTOR,
            "status": UserStatus.PENDING_APPROVAL,
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
            "phone": "+58 412 8765432",
            "identification_number": "V-12345678"
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
    pending_applicant_client = {
        "_id": ObjectId(),
        "requested_role": UserRole.CLIENT,
        "status": ApprovalStatus.PENDING_APPROVAL,
        "personal_data": {
            "first_name": "Ignacio",
            "last_name": "Valenzuela",
            "email": "valenzuela@ojos.com",
            "phone": "+58 416 6543210",
            "identification_number": "V-15999888"
        },
        "professional_metadata": {
            "corporate_name": "Clínica de Ojos Especializada",
            "tax_id": "J-76543210-9",
            "client_type": ClientType.CLINICA
        },
        "verification_documents": [
            {"url": "/docs/constitucion_sociedad.pdf", "doc_type": "CONSTITUCION_LEGAL"},
            {"url": "/docs/patente.pdf", "doc_type": "PATENTE_MUNICIPAL"}
        ],
        "audit_review": None,
        "submitted_at": now - timedelta(hours=5)
    }

    await db.applicants.insert_many([pending_applicant, pending_applicant_client])
    print("Solicitudes de onboarding pendientes (Médico y Cliente) creadas.")

    # 5. Crear perfiles de Doctor y Cliente
    doctor_profile_id = ObjectId()
    doctor_gonzalez_id = ObjectId()
    doctor_martinez_id = ObjectId()
    doctor_ramirez_id = ObjectId()

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
            "phone": "+58 412 1234567",
            "office_location": "Pabellón A, Oficina 204"
        },
        "active_patients_count": 1,
        "created_at": now,
        "updated_at": now
    }

    doctors_profiles = [
        doctor_profile,
        {
            "_id": doctor_gonzalez_id,
            "user_id": doctor_gonzalez_user_id,
            "is_active": True,
            "ui_preferences": {"view_type": "CARDS"},
            "license_number": "LIC-11223-MED",
            "internal_staff_id": "STAFF-1122",
            "first_name": "Carlos",
            "last_name": "González",
            "specialty": "Urgenciólogo",
            "contact": {
                "phone": "+58 424 2233445",
                "office_location": "Urgencias Box 4"
            },
            "active_patients_count": 0,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": doctor_martinez_id,
            "user_id": doctor_martinez_user_id,
            "is_active": True,
            "ui_preferences": {"view_type": "LIST"},
            "license_number": "LIC-33445-MED",
            "internal_staff_id": "STAFF-3344",
            "first_name": "Laura",
            "last_name": "Martínez",
            "specialty": "Medicina General",
            "contact": {
                "phone": "+58 416 3344556",
                "office_location": "Edificio B, Oficina 102"
            },
            "active_patients_count": 0,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": doctor_ramirez_id,
            "user_id": doctor_ramirez_user_id,
            "is_active": False,
            "ui_preferences": {"view_type": "CARDS"},
            "license_number": "LIC-55667-MED",
            "internal_staff_id": "STAFF-5566",
            "first_name": "Pedro",
            "last_name": "Ramírez",
            "specialty": "Pediatría",
            "contact": {
                "phone": "+58 412 4455667",
                "office_location": "Edificio C, Oficina 301"
            },
            "active_patients_count": 0,
            "created_at": now,
            "updated_at": now
        }
    ]
    await db.doctors.insert_many(doctors_profiles)

    client_profile_id = ObjectId()
    client_sur_profile_id = ObjectId()
    client_hogar_profile_id = ObjectId()
    client_condes_profile_id = ObjectId()

    client_profile = {
        "_id": client_profile_id,
        "user_id": client_id,
        "is_active": True,
        "status": "APPROVED",
        "client_type": ClientType.CLINICA,
        "corporate_name": "Clínica del Norte S.A.",
        "tax_id": "J-99888777-6",
        "contact_info": {
            "phone": "+58 212 2999888",
            "address": "Av. Francisco de Miranda, Chacao, Caracas",
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

    clients_profiles = [
        client_profile,
        {
            "_id": client_sur_profile_id,
            "user_id": clinica_sur_user_id,
            "is_active": True,
            "status": "APPROVED",
            "client_type": ClientType.CLINICA,
            "corporate_name": "Clínica de Especialidades del Sur S.A.",
            "tax_id": "J-77666555-4",
            "contact_info": {
                "phone": "+58 261 1234567",
                "address": "Av. Bella Vista, Maracaibo",
                "emergency_email": "urgencias@clinicasur.com"
            },
            "ui_preferences": {"view_type": "CARDS"},
            "summary_cache": {
                "assigned_patients_count": 0,
                "active_critical_alerts": 1,
                "contract_health_percent": 90
            },
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": client_hogar_profile_id,
            "user_id": hogar_familiar_user_id,
            "is_active": True,
            "status": "APPROVED",
            "client_type": ClientType.FAMILIAR,
            "corporate_name": "Hogar Familiar Don Bosco",
            "tax_id": "J-88777666-5",
            "contact_info": {
                "phone": "+58 212 2222333",
                "address": "Calle Carabobo, Valencia",
                "emergency_email": "soporte@donbosco.com"
            },
            "ui_preferences": {"view_type": "CARDS"},
            "summary_cache": {
                "assigned_patients_count": 0,
                "active_critical_alerts": 0,
                "contract_health_percent": 85
            },
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": client_condes_profile_id,
            "user_id": clinica_condes_user_id,
            "is_active": False,
            "status": "APPROVED",
            "client_type": ClientType.CLINICA,
            "corporate_name": "Centro Médico Las Condes",
            "tax_id": "J-99000111-2",
            "contact_info": {
                "phone": "+58 212 2888999",
                "address": "Av. Las Delicias, Maracay",
                "emergency_email": "urgencias@medicacondes.com"
            },
            "ui_preferences": {"view_type": "LIST"},
            "summary_cache": {
                "assigned_patients_count": 0,
                "active_critical_alerts": 0,
                "contract_health_percent": 100
            },
            "created_at": now,
            "updated_at": now
        }
    ]
    await db.clients.insert_many(clients_profiles)
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
        },
        {
            "_id": ObjectId(),
            "serial_number": "AURA-ESP32-1002",
            "mac_address": "24:0A:C4:8B:58:CC",
            "model_version": "V1.0",
            "is_active": True,
            "approval_status": "APPROVED",
            "operational_status": "MAINTENANCE",
            "hardware_metrics": {
                "battery_percent": 12,
                "signal_strength_dbm": -88,
                "last_ping_at": now - timedelta(hours=2)
            },
            "has_hardware_alert": True
        },
        {
            "_id": ObjectId(),
            "serial_number": "AURA-ESP32-8822",
            "mac_address": "40:EE:B4:07:0F:88",
            "model_version": "V2.0",
            "is_active": True,
            "approval_status": "PENDING_APPROVAL",
            "operational_status": "MAINTENANCE",
            "hardware_metrics": {
                "battery_percent": 100,
                "signal_strength_dbm": -40,
                "last_ping_at": now - timedelta(days=1)
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
        "national_id": "V-11222333",
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

    # Seeding de artículos de ayuda (10 FAQs y 10 Guías Clínicas/Técnicas)
    help_articles = [
        # --- 10 PREGUNTAS FRECUENTES (FAQs) ---
        {
            "_id": ObjectId(),
            "title": "¿Cómo interpretar las Alertas Clínicas?",
            "slug": "como-interpretar-alertas-clinicas",
            "format_type": "FAQ",
            "category": "Clínica",
            "content": """# Interpretación de Alertas Clínicas

El gateway biométrico AURA evalúa constantemente la telemetría enviada por el ESP32 para diagnosticar anomalías críticas.

## Rangos Biométricos Estándar
1. **Frecuencia Cardíaca (BPM)**: Rango óptimo entre `60` y `100` pulsaciones por minuto.
2. **Saturación de Oxígeno (SpO2 %)**: Crítico si desciende de `92%`.
3. **Temperatura (°C)**: Alarma si excede de `38.0°C` (Fiebre) o desciende de `35.0°C` (Hipotermia).

Si experimenta una alerta roja, el personal clínico de turno será notificado instantáneamente. Conserve la calma y espere instrucciones.
""",
            "media_urls": [],
            "search_keywords": ["alertas", "pulsaciones", "bpm", "spo2", "fiebre"],
            "feedback_counters": {"useful_votes": 42, "not_useful_votes": 3},
            "is_published": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ObjectId(),
            "title": "¿Qué hacer si un dispositivo ESP32 pierde la conexión Wi-Fi?",
            "slug": "que-hacer-desconexion-wifi-esp32",
            "format_type": "FAQ",
            "category": "Hardware",
            "content": """# Desconexión de Red en Dispositivos ESP32

Si el indicador LED de su sensor parpadea en color amarillo o rojo intermitente, el dispositivo se encuentra desconectado del enlace inalámbrico.

## Pasos para la reconexión:
1. Verifique que el router Wi-Fi de la residencia o clínica esté encendido.
2. Mantenga presionado el botón lateral de reset durante 3 segundos.
3. Si la falla persiste, ingrese al menú **Inventario de Hardware** y reactive el punto de acceso temporal `AURA-CONFIG`.
""",
            "media_urls": [],
            "search_keywords": ["desconexion", "wifi", "esp32", "fallo", "offline"],
            "feedback_counters": {"useful_votes": 31, "not_useful_votes": 2},
            "is_published": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ObjectId(),
            "title": "Métodos de Pago y Ciclos del Fondeo Familiar",
            "slug": "metodos-pago-fondeo-familiar",
            "format_type": "FAQ",
            "category": "Fondeo",
            "content": """# Métodos de Pago del Fondeo Familiar

Información relacionada con la facturación y suscripciones del sistema AURA para familiares e instituciones.

## Ciclos de Cobro
Los cobros se realizan de forma anticipada los **primeros 5 días hábiles** de cada mes.

## Medios de Pago Aceptados
* **Transferencia Bancaria Directa**
* **Pago Móvil / Transferencia Internacional**

Si presenta alertas contractuales en la consola de clientes, su servicio de monitoreo no se suspenderá inmediatamente, sino que otorgará una prórroga de 10 días antes de suspender temporalmente las credenciales del paciente.
""",
            "media_urls": [],
            "search_keywords": ["pago", "factura", "dinero", "contrato", "fondeo"],
            "feedback_counters": {"useful_votes": 12, "not_useful_votes": 0},
            "is_published": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ObjectId(),
            "title": "¿Cómo se calculan los promedios biométricos en los Reportes Analíticos?",
            "slug": "calculo-promedios-biometricos-reportes",
            "format_type": "FAQ",
            "category": "Clínica",
            "content": """# Cálculo Estricto de Promedios Biométricos

En el motor de reportes analíticos de AURA, la integridad de los datos fisiológicos se calcula bajo estándares estrictos:

## Regla de Exclusión de Vacíos:
* Los días u horas sin datos no se rellenan con ceros ni valores simulados.
* El cálculo de promedios pondera únicamente lecturas biométricas reales registradas por los sensores.
* De esta manera se evitan distorsiones en las métricas de variabilidad cardíaca y oxigenación.
""",
            "media_urls": [],
            "search_keywords": ["promedios", "calculo", "reportes", "estadisticas", "biometria"],
            "feedback_counters": {"useful_votes": 28, "not_useful_votes": 1},
            "is_published": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ObjectId(),
            "title": "¿Qué es y cómo funciona la Autenticación de Dos Factores (2FA)?",
            "slug": "funcionamiento-autenticacion-dos-factores-2fa",
            "format_type": "FAQ",
            "category": "Todos",
            "content": """# Autenticación de Dos Factores (2FA)

La seguridad de los datos de salud de los pacientes está resguardada por estándares de cifrado médico.

## ¿Cómo activar o usar el 2FA?
1. Ingrese a la vista de **Preferencias y Ajustes**.
2. Active el interruptor de **Seguridad 2FA**.
3. Al iniciar sesión desde un nuevo dispositivo, se solicitará un código OTP generado por su aplicación de autenticación (Google Authenticator / Authy).
""",
            "media_urls": [],
            "search_keywords": ["2fa", "seguridad", "otp", "contraseña", "autenticacion"],
            "feedback_counters": {"useful_votes": 35, "not_useful_votes": 0},
            "is_published": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ObjectId(),
            "title": "¿Cómo asignar o reasignar un dispositivo ESP32 a un paciente?",
            "slug": "asignacion-reasignacion-dispositivo-esp32",
            "format_type": "FAQ",
            "category": "Hardware",
            "content": """# Asignación y Reasignación de Hardware IoT

Los administradores pueden vincular un chip ESP32 activo a cualquier paciente en tratamiento.

## Pasos para la asignación:
1. Vaya a la vista de **Inventario de Hardware IoT**.
2. Seleccione el dispositivo por su número de serie o MAC Address.
3. Haga clic en **Vincular Paciente** y elija al destinatario. La telemetría comenzará a transmitirse inmediatamente al expediente seleccionado.
""",
            "media_urls": [],
            "search_keywords": ["asignar", "dispositivo", "mac", "paciente", "hardware"],
            "feedback_counters": {"useful_votes": 19, "not_useful_votes": 1},
            "is_published": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ObjectId(),
            "title": "¿Quién puede aprobar o rechazar solicitudes de nuevos usuarios en AURA?",
            "slug": "quien-aprueba-solicitudes-nuevos-usuarios",
            "format_type": "FAQ",
            "category": "Todos",
            "content": """# Aprobación de Cuentas y Solicitudes de Onboarding

Para salvaguardar la red médica, el acceso a la plataforma AURA está sujeto a verificación de credenciales.

## Roles autorizados:
* **Administradores Generales**: Pueden auditar licencias médicas, cédulas de identidad y autorizar o rechazar solicitudes de registro en la vista de **Solicitudes PENDIENTES**.
* **Doctores y Clientes**: Recibirán una notificación por correo tan pronto su cuenta haya sido aprobada por el área administrativa.
""",
            "media_urls": [],
            "search_keywords": ["aprobacion", "onboarding", "admin", "permisos", "pendiente"],
            "feedback_counters": {"useful_votes": 15, "not_useful_votes": 0},
            "is_published": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ObjectId(),
            "title": "¿Qué significan las prioridades de los Tickets de Soporte Técnico?",
            "slug": "prioridades-tickets-soporte-tecnico",
            "format_type": "FAQ",
            "category": "Todos",
            "content": """# Categorías de Prioridad en Tickets de Soporte

Al enviar una solicitud de ayuda desde el Centro de Soporte, puede clasificar la severidad de su incidente:

## Niveles de Atención:
1. **BAJA**: Consultas generales sobre uso del sistema o sugerencias de interfaz.
2. **MEDIA**: Inconvenientes menores con gráficos o configuraciones secundarias.
3. **ALTA**: Fallos de conectividad en el hardware de monitoreo o interrupción de alertas biométricas.
""",
            "media_urls": [],
            "search_keywords": ["ticket", "soporte", "prioridad", "ayuda", "incidente"],
            "feedback_counters": {"useful_votes": 22, "not_useful_votes": 1},
            "is_published": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ObjectId(),
            "title": "¿Cómo exportar el historial de signos vitales a formato PDF o CSV?",
            "slug": "como-exportar-historial-signos-vitales-pdf-csv",
            "format_type": "FAQ",
            "category": "Clínica",
            "content": """# Exportación de Datos Fisiológicos

Puede generar informes en formato de grado clínico en cualquier momento:

## Métodos de descarga:
1. **Desde el Expediente Fisiológico**: Utilice los botones de descarga rápida en la esquina superior del paciente.
2. **Desde el Módulo de Reportes Analíticos**: Seleccione un rango de fechas (Diario, Semanal, Mensual, Trimestral) y exporte la Hoja Clínica Completa con sello digital SHA-256.
""",
            "media_urls": [],
            "search_keywords": ["exportar", "pdf", "csv", "descargar", "reporte"],
            "feedback_counters": {"useful_votes": 38, "not_useful_votes": 2},
            "is_published": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ObjectId(),
            "title": "¿Cómo cambiar el tema visual (Aura Gold, Esmeralda, etc.) o activar el Modo Claro/Oscuro?",
            "slug": "cambiar-tema-visual-modo-claro-oscuro",
            "format_type": "FAQ",
            "category": "Todos",
            "content": """# Personalización de Temas y Contraste Visual

El sistema AURA cuenta con 5 temas exclusivos y compatibilidad completa con Modo Claro y Oscuro.

## Pasos para modificar su tema:
1. Diríjase a **Preferencias y Ajustes** en el menú de usuario o perfil.
2. Elija entre las paletas *Aura Gold*, *Emerald Health*, *Cyber Cobalt*, *Amethyst Royal* o *Crimson Alert*.
3. Alterné libremente el interruptor entre **Modo Claro** y **Modo Oscuro**. Su selección se mantendrá guardada de forma permanente.
""",
            "media_urls": [],
            "search_keywords": ["tema", "modo claro", "modo oscuro", "aura gold", "colores"],
            "feedback_counters": {"useful_votes": 50, "not_useful_votes": 1},
            "is_published": True,
            "created_at": now,
            "updated_at": now
        },

        # --- 10 GUÍAS CLÍNICAS Y TÉCNICAS (GUIDES) ---
        {
            "_id": ObjectId(),
            "title": "Configuración del Hardware ESP32 AURA",
            "slug": "configuracion-hardware-esp32-aura",
            "format_type": "GUIDE",
            "category": "Hardware",
            "content": """# Configuración del Hardware ESP32 AURA

Este artículo detalla la configuración inicial y el emparejamiento de los dispositivos IoT **ESP32 AURA** con el gateway de red local.

## 1. Encendido inicial
Presione el botón de encendido lateral durante 2 segundos. El LED parpadeará en **azul** indicando modo configuración AP.

## 2. Conectividad
* Conecte su teléfono móvil a la red SSID temporal: `AURA-CONFIG-XXXX`.
* Abra su navegador e ingrese a `http://192.168.4.1`.
* Introduzca las credenciales de su red local Wi-Fi.

## 3. Vinculación
Una vez configurado, el dispositivo enviará datos biométricos directamente. Para validarlo, contacte con su administrador clínico.
""",
            "media_urls": ["/docs/esp32_guide.png"],
            "search_keywords": ["esp32", "hardware", "wifi", "conexion"],
            "feedback_counters": {"useful_votes": 24, "not_useful_votes": 1},
            "is_published": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ObjectId(),
            "title": "Guía de Calibración de Sensores MAX30102 y DS18B20",
            "slug": "guia-calibracion-sensores-max30102-ds18b20",
            "format_type": "GUIDE",
            "category": "Hardware",
            "content": """# Calibración de Sensores Ópticos y Térmicos

Asegure la máxima exactitud clínica en la adquisición de telemetría biométrica continua.

## 1. Sensor PPG MAX30102 (Frecuencia Cardíaca y SpO2)
* Ajuste la correa de fijación táctil sin oprimir el tejido capilar.
* Verifique que la lente emisora infrarroja esté limpia y libre de humedad.

## 2. Sensor Térmico Digital DS18B20
* Posicione la sonda en la zona axilar o subclavicular según el protocolo institucional.
* Tiempo mínimo de estabilización térmica: 45 segundos.
""",
            "media_urls": [],
            "search_keywords": ["calibracion", "max30102", "ds18b20", "sensores", "pulso"],
            "feedback_counters": {"useful_votes": 18, "not_useful_votes": 0},
            "is_published": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ObjectId(),
            "title": "Protocolo de Manejo Fisiológico ante Taquicardia e Hipoxia Severa",
            "slug": "protocolo-manejo-fisiologico-taquicardia-hipoxia",
            "format_type": "GUIDE",
            "category": "Clínica",
            "content": """# Protocolo Clínico para Anomalías Combinadas

Guía de actuación médica inmediata ante alertas de estado **CRÍTICO MULTIPLE** en pacientes monioteados.

## 1. Evaluación de Síntomas
* Verifique si la saturación desciende por debajo de 90% en simultáneo con ritmo cardíaco > 120 BPM.
* Descarte falsos positivos por movimiento brusco comprobando la forma de onda en tiempo real.

## 2. Acciones Inmediatas
* Posicione al paciente en postura semi-Fowler.
* Inicie oxigenoterapia según indicación del médico tratante y notifique al sistema.
""",
            "media_urls": [],
            "search_keywords": ["protocolo", "taquicardia", "hipoxia", "critico", "emergencia"],
            "feedback_counters": {"useful_votes": 45, "not_useful_votes": 1},
            "is_published": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ObjectId(),
            "title": "Manual de Configuración de Umbrales Clínicos Personalizados",
            "slug": "manual-configuracion-umbrales-clinicos-personalizados",
            "format_type": "GUIDE",
            "category": "Clínica",
            "content": """# Ajuste Fisiológico de Umbrales Clínicos

Cada paciente cuenta con necesidades médicas particulares. AURA permite ajustar los márgenes de alarma por expediente.

## Pasos para personalizar umbrales:
1. Ingrese a la vista de **Expediente del Paciente**.
2. Presione el botón **Editar Umbrales Clínicos**.
3. Modifique los valores de Frecuencia Cardíaca Mín/Máx, SpO2 Crítico y Temperatura.
4. Guarde los cambios. Los algoritmos de evaluación de alertas se actualizarán en tiempo real.
""",
            "media_urls": [],
            "search_keywords": ["umbrales", "limites", "personalizar", "configuracion", "clinica"],
            "feedback_counters": {"useful_votes": 29, "not_useful_votes": 2},
            "is_published": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ObjectId(),
            "title": "Guía para la Generación y Análisis de Reportes Trimestrales",
            "slug": "guia-generacion-analisis-reportes-trimestrales",
            "format_type": "GUIDE",
            "category": "Clínica",
            "content": """# Consolidación de Reportes Fisiológicos Trimestrales

Instrucciones para generar auditorías completas de salud poblacional e individual.

## 1. Selección de Parámetros
* Elija el filtro temporal **Trimestral** en el módulo de reportes.
* Defina la granularidad de agrupamiento (ej. promedios cada 1 día o cada 7 días).

## 2. Interpretación de Tendencias
* Analice los gráficos de dispersión de variabilidad para identificar episodios recurrentes de taquicardia o apneas nocturnas.
""",
            "media_urls": [],
            "search_keywords": ["trimestral", "reportes", "analisis", "tendencias", "salud"],
            "feedback_counters": {"useful_votes": 21, "not_useful_votes": 0},
            "is_published": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ObjectId(),
            "title": "Procedimiento de Aprobación de Médicos y Clientes en Onboarding",
            "slug": "procedimiento-aprobacion-medicos-clientes-onboarding",
            "format_type": "GUIDE",
            "category": "Todos",
            "content": """# Protocolo Administrativo de Auditoría de Cuentas

Manual operativo para la verificación de profesionales de la salud e instituciones clínicas en AURA.

## Requisitos de Verificación:
* **Licencia Médica Vigente**: Debe cotejarse contra el registro nacional oficial.
* **Documento de Identificación**: Cédula o pasaporte digitalizado sin enmiendas.
* **Firma de Términos HIPAA / GDPR**: Cumplimiento de protección de datos personales.
""",
            "media_urls": [],
            "search_keywords": ["onboarding", "licencia", "aprobacion", "medicos", "auditoria"],
            "feedback_counters": {"useful_votes": 16, "not_useful_votes": 0},
            "is_published": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ObjectId(),
            "title": "Guía de Monitoreo Multi-Paciente para Médicos y Centros Clínicos",
            "slug": "guia-monitoreo-multi-paciente-medicos-centros",
            "format_type": "GUIDE",
            "category": "Clínica",
            "content": """# Gestión de Paneles de Monitoreo Simultáneo

Optimice la atención de múltiples pacientes en salas de hospitalización o telemedicina domiciliaria.

## Funciones del Panel General:
* Tarjetas dinámicas con actualización en vivo por WebSockets.
* Codificación por colores de riesgo: Verde (Estable), Amarillo (Precaución), Rojo (Crítico).
* Silenciador de alarma sonora global con temporizador de reactivación automática.
""",
            "media_urls": [],
            "search_keywords": ["multi-paciente", "panel", "telemedicina", "monitor", "clinico"],
            "feedback_counters": {"useful_votes": 33, "not_useful_votes": 1},
            "is_published": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ObjectId(),
            "title": "Manual de Diagnóstico de Red y Reducción de Latencia IoT",
            "slug": "manual-diagnostico-red-reduccion-latencia-iot",
            "format_type": "GUIDE",
            "category": "Hardware",
            "content": """# Optimización de Conectividad IoT y Enlace MQTT/WS

Guía técnica para ingenieros de soporte y personal de infraestructura médica.

## Indicadores Frecuentes:
* **Latencia Recomendada**: Inferior a `150 ms`.
* **Pérdida de Paquetes**: Máximo tolerable `1.5%`.

Si detecta latencias superiores, configure canales de radio Wi-Fi no saturados (Canales 1, 6 u 11 en 2.4 GHz).
""",
            "media_urls": [],
            "search_keywords": ["latencia", "red", "iot", "ping", "mqtt", "hardware"],
            "feedback_counters": {"useful_votes": 14, "not_useful_votes": 0},
            "is_published": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ObjectId(),
            "title": "Guía de Seguridad, Privacidad de Datos y Auditoría Forense",
            "slug": "guia-seguridad-privacidad-datos-auditoria-forense",
            "format_type": "GUIDE",
            "category": "Todos",
            "content": """# Estándares de Seguridad y Registros de Auditoría

Protección inmutable de la información médica conforme a normativas de ciberseguridad.

## Pilares del Sistema AURA:
1. **Cifrado en Transito y Reposo**: Enlaces SSL/TLS y hashes SHA-256.
2. **Logs de Auditoría Inmutables**: Registro detallado de cada consulta, descarga de reportes o modificación de umbrales.
3. **Control de Acceso Basado en Roles (RBAC)**: Aislamiento estricto de datos entre instituciones.
""",
            "media_urls": [],
            "search_keywords": ["seguridad", "cifrado", "auditoria", "privacidad", "sha256"],
            "feedback_counters": {"useful_votes": 26, "not_useful_votes": 0},
            "is_published": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "_id": ObjectId(),
            "title": "Instructivo de Gestión de Fondeo y Suscripciones Institucionales",
            "slug": "instructivo-gestion-fondeo-suscripciones-institucionales",
            "format_type": "GUIDE",
            "category": "Fondeo",
            "content": """# Administración de Contratos y Fondeo Institucional

Guía para centros clínicos, aseguradoras y representantes familiares.

## Administración de Licencias:
* Monitoree el estado de vigencia del contrato desde la consola del cliente.
* Descargue recibos digitales de pago y mantenga al día las asignaciones de dispositivos por paciente.
""",
            "media_urls": [],
            "search_keywords": ["fondeo", "suscripcion", "contrato", "facturacion", "licencias"],
            "feedback_counters": {"useful_votes": 17, "not_useful_votes": 1},
            "is_published": True,
            "created_at": now,
            "updated_at": now
        }
    ]
    await db.help_articles.insert_many(help_articles)
    print("Artículos de soporte e instructivos precargados (10 FAQs y 10 Guías).")

    # Seeding de perfiles de usuario
    user_profiles = [
        {
            "_id": ObjectId(),
            "user_id": admin_id,
            "google_avatar_url": "https://api.dicebear.com/7.x/adventurer/svg?seed=admin",
            "personal_data": {
                "first_name": "Administrador",
                "last_name": "AURA",
                "email": "admin@telemonitor.com",
                "phone": "+58 412 1112222",
                "address": "Av. Francisco de Miranda, Chacao, Caracas",
                "identification_number": "V-9999999"
            },
            "role_specific_data": {},
            "updated_at": now
        },
        {
            "_id": ObjectId(),
            "user_id": doctor_id,
            "google_avatar_url": "https://api.dicebear.com/7.x/adventurer/svg?seed=dr_lopez",
            "personal_data": {
                "first_name": "Sofía",
                "last_name": "López",
                "email": "lopez@clinic.com",
                "phone": "+58 414 3333444",
                "address": "Av. Andrés Bello, Consultorio 3A, Caracas",
                "identification_number": "V-14234567"
            },
            "role_specific_data": {
                "medical_license": "LIC-88122-VE",
                "specialty": "Cardiología Infantil",
                "office_location": "Consultorio 3A, Piso 3"
            },
            "updated_at": now
        }
    ]
    await db.user_profiles.insert_many(user_profiles)
    print("Perfiles de usuario inmutables inicializados.")

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
