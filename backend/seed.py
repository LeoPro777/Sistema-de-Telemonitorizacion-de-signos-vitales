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

    # Seeding de artículos de ayuda
    help_articles = [
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
            "title": "Métodos de Pago y Ciclos del Fondeo Familiar",
            "slug": "metodos-pago-fondeo-familiar",
            "format_type": "FAQ",
            "category": "Fondeo",
            "content": """# Métodos de Pago del Fondeo Familiar

Información relacionada con la facturación y suscripciones del sistema AURA para familiares individuales.

## Ciclos de Cobro
Los cobros se realizan de forma anticipada los **primeros 5 días hábiles** de cada mes.

## Medios de Pago Aceptados
* **Transferencia Bancaria Directa**
* **Pago Móvil / Transferencia Bancaria**

Si presenta alertas contractuales en la consola de clientes, su servicio de monitoreo no se suspenderá inmediatamente, sino que otorgará una prórroga de 10 días antes de suspender temporalmente las credenciales del paciente.
""",
            "media_urls": [],
            "search_keywords": ["pago", "factura", "dinero", "contrato", "fondeo"],
            "feedback_counters": {"useful_votes": 12, "not_useful_votes": 0},
            "is_published": True,
            "created_at": now,
            "updated_at": now
        }
    ]
    await db.help_articles.insert_many(help_articles)
    print("Artículos de soporte e instructivos precargados.")

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
