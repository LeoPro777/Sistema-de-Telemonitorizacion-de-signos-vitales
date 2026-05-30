---
trigger: model_decision
description: Cuando se pida algo relacionado a la base de datos 
---

# Esquema de Base de Datos y Diccionario NoSQL (MongoDB)

## 1. Enums de Control Global
* `UserRole`: `[ADMIN, DOCTOR, PATIENT, CLIENT]`
* `UserStatus`: `[PENDING, ACTIVE, SUSPENDED]`
* `ViewType`: `[CARDS, LIST]`
* `TelemetryStatus`: `[NORMAL, WARNING, CRITICAL]`
* `OperationalStatus`: `[AVAILABLE, ASSIGNED, MAINTENANCE]`
* `ApprovalStatus`: `[PENDING_APPROVAL, APPROVED, REJECTED]`
* `ClientType`: `[CLINICA, FAMILIAR]`
* `ArticleFormat`: `[FAQ, GUIDE]`
* `TicketStatus`: `[OPEN, IN_PROGRESS, CLOSED]`
* `TicketPriority`: `[LOW, MEDIUM, HIGH]`
* `LogType`: `[GLOBAL_ACTIVITY, IOT_TELEMETRY]`
* `LogCriticality`: `[INFO, WARNING, CRITICAL]`
* `ReportType`: `[CLINICAL, MANAGEMENT]`

## 2. Estructuras y Sub-Esquemas Embebidos
* `TwoFactorSchema`: `{ enabled: bool, secret: str | null }`
* `DeviceInfoSchema`: `{ user_agent: str, ip_address: str }`
* `WidgetConfigSchema`: `{ widget_id: str, position_order: int, refresh_interval_ms: int }`
* `PatientThresholdsSchema`: 
  * `heart_rate`: `{ min_bpm: int, max_bpm: int }`
  * `spo2`: `{ critical_min_percent: int }`
  * `temperature`: `{ min_celsius: float, max_celsius: float }`
* `CachedMetricStatusSchema`: `{ value: float, status: TelemetryStatus }`
* `TelemetryMetricsSchema`: `{ heart_rate: int, spo2: int, temperature: float }`
* `TraceabilityPayloadSchema`: `{ target_collection: str, target_document_id: str, previous_values: dict, new_values: dict }`

## 3. Colecciones de MongoDB

### MÓDULO 1: AUTENTICACIÓN
* **Colección:** `users` (Índice único en `username` y `email`)
  * `_id`: ObjectId
  * `username`: String
  * `email`: String (EmailStr)
  * `password_hash`: String
  * `role`: String (Enum UserRole)
  * `status`: String (Enum UserStatus)
  * `two_factor`: Object (TwoFactorSchema)
  * `created_at` / `updated_at`: ISODate
* **Colección:** `auth_sessions` (Índice TTL en `expires_at`)
  * `_id`: ObjectId
  * `user_id`: ObjectId (Ref: `users._id`)
  * `refresh_token`: String
  * `device_info`: Object (DeviceInfoSchema)
  * `expires_at`: ISODate
  * `created_at`: ISODate

### MÓDULO 2: MENÚ PRINCIPAL (DASHBOARD)
* **Colección:** `dashboard_configs` (Índice único en `user_id`)
  * `_id`: ObjectId
  * `user_id`: ObjectId (Ref: `users._id`)
  * `layout_version`: String
  * `visible_widgets`: Array (WidgetConfigSchema)
  * `theme_preference`: String (Default: `"premium_dark"`)
* **Colección:** `dashboard_kpi_cache` (Acceso directo por llave `_id` estática)
  * `_id`: String (Ej: `"admin_summary"`)
  * `owner_id`: ObjectId | Null (Ref: `users._id`)
  * `cached_metrics`: Object (`Dict[str, int]`)
  * `last_cached_at`: ISODate

### MÓDULO 3 y 4: PACIENTES Y SIGNOS VITALES
* **Colección:** `patients` (Índice compuesto: `{ assigned_doctor_id: 1, is_active: 1 }`)
  * `_id`: ObjectId
  * `user_id`: ObjectId (Ref: `users._id`)
  * `is_active`: Boolean (Default: True)
  * `ui_preferences`: Object (`{ "view_type": ViewType }`)
  * `medical_record_id`: String (Único, Ej: `MG-76342`)
  * `national_id`: String
  * `first_name` / `last_name`: String
  * `assigned_doctor_id`: ObjectId | Null (Ref: `doctors._id`)
  * `assigned_device_id`: ObjectId | Null (Ref: `devices._id`) -> **Fuente de verdad única**
  * `client_id`: ObjectId | Null (Ref: `clients._id`)
  * `clinical_thresholds`: Object (PatientThresholdsSchema)
  * `last_telemetry_cache`: Object (`Dict[str, CachedMetricStatusSchema]`)
  * `has_active_alert`: Boolean (Default: False)
  * `medical_history_summary`: Object (`{ blood_type: str, pathologies: array, allergies: array, notes: str }`)
  * `created_at`: ISODate
* **Colección NATIIVA de Series de Tiempo:** `vital_signs_history` 
  * *Configuración:* `timeField: 'timestamp'`, `metaField: 'patient_id'`
  * *Índice:* `{ patient_id: 1, timestamp: -1 }`
  * `_id`: ObjectId
  * `patient_id`: ObjectId (MetaField)
  * `timestamp`: ISODate (TimeField)
  * `telemetry`: Object (TelemetryMetricsSchema)

### ENGINE: ALERTAS TRANSVERSALES
* **Colección:** `alerts` (Índice compuesto: `{ patient_id: 1, status: 1 }`)
  * `_id`: ObjectId
  * `patient_id`: ObjectId (Ref: `patients._id`)
  * `device_id`: ObjectId (Ref: `devices._id`)
  * `alert_type`: String (Ej: `"HEART_RATE_CRITICAL"`)
  * `severity`: String (Enum LogCriticality)
  * `description`: String
  * `trigger_value`: Double
  * `status`: String (`ACTIVE`, `ACKNOWLEDGED`, `RESOLVED`)
  * `created_at`: ISODate
  * `resolved_at`: ISODate | Null
  * `resolved_by`: ObjectId | Null (Ref: `users._id`)

### MÓDULO 5: DISPOSITIVOS
* **Colección:** `devices` (Índice único en `mac_address` y `serial_number`)
  * `_id`: ObjectId
  * `serial_number`: String
  * `mac_address`: String
  * `model_version`: String
  * `is_active`: Boolean (Default: True)
  * `approval_status`: String (Enum ApprovalStatus)
  * `approval_details`: Object (`{ submitted_at: date, reviewed_at: date, reviewed_by: id }`)
  * `operational_status`: String (Enum OperationalStatus)
  * `hardware_metrics`: Object (`{ battery_percent: int, signal_strength_dbm: int, last_ping_at: date }`)
  * `has_hardware_alert`: Boolean (Default: False)

### MÓDULO 6: GESTIÓN DE DOCTORES
* **Colección:** `doctors` (Índice único en `license_number`)
  * `_id`: ObjectId
  * `user_id`: ObjectId (Ref: `users._id`)
  * `is_active`: Boolean (Default: True)
  * `ui_preferences`: Object (`{ "view_type": ViewType }`)
  * `license_number`: String
  * `internal_staff_id`: String
  * `first_name` / `last_name`: String
  * `specialty`: String
  * `contact`: Object (`{ phone: str, office_location: str }`)
  * `active_patients_count`: Integer (Consistencia eventual)
  * `created_at` / `updated_at`: ISODate

### MÓDULO 7: GESTIÓN DE CLIENTES
* **Colección:** `clients` (Índice único en `tax_id`, compuesto en `{ status: 1, is_active: 1 }`)
  * `_id`: ObjectId
  * `user_id`: ObjectId (Ref: `users._id`)
  * `is_active`: Boolean (Default: True)
  * `status`: String (Enum ApprovalStatus)
  * `client_type`: String (Enum ClientType)
  * `corporate_name`: String
  * `tax_id`: String
  * `contact_info`: Object (`{ phone: str, address: str, emergency_email: str }`)
  * `ui_preferences`: Object
  * `summary_cache`: Object (`{ assigned_patients_count: int, active_critical_alerts: int, contract_health_percent: int }`)
  * `created_at` / `updated_at`: ISODate

### MÓDULO 8: VALIDACIÓN DE ASPIRANTES
* **Colección:** `applicants` (Índice compuesto: `{ status: 1, submitted_at: -1 }`)
  * `_id`: ObjectId
  * `requested_role`: String
  * `status`: String (Enum ApprovalStatus)
  * `personal_data`: Object (`{ first_name: str, last_name: str, email: str, phone: str, identification_number: str }`)
  * `professional_metadata`: Object (`{ medical_license: str, specialty: str, institution_origin: str }`)
  * `verification_documents`: Array (`[ { url: str, doc_type: str } ]`)
  * `audit_review`: Object (`{ reviewed_by: id, reviewed_at: date, rejection_reason: str }`)
  * `submitted_at`: ISODate

### MÓDULO 9: CENTRO DE AYUDA Y SOPORTE
* **Colección:** `help_articles` (**TEXT INDEX** en `{ title: "text", content: "text", search_keywords: "text" }`)
  * `_id`: ObjectId
  * `title`: String
  * `slug`: String
  * `format_type`: String (Enum ArticleFormat)
  * `category`: String
  * `content`: String (Markdown)
  * `media_urls`: Array
  * `search_keywords`: Array
  * `feedback_counters`: Object (`{ useful_votes: int, not_useful_votes: int }`)
  * `is_published`: Boolean
  * `created_at` / `updated_at`: ISODate
* **Colección:** `support_tickets` (Índice compuesto: `{ status: 1, priority: 1 }`)
  * `_id`: ObjectId
  * `user_id`: ObjectId (Ref: `users._id`)
  * `user_role_snapshot`: String (Enum UserRole)
  * `subject` / `message`: String
  * `status`: String (Enum TicketStatus)
  * `priority`: String (Enum TicketPriority)
  * `created_at` / `updated_at`: ISODate

### MÓDULO 10 Y 11: PERFILES Y CONFIGURACIONES
* **Colección:** `user_profiles` (Índice único en `user_id`)
  * `_id`: ObjectId
  * `user_id`: ObjectId (Ref: `users._id`)
  * `google_avatar_url`: String | Null
  * `personal_data`: Object
  * `role_specific_data`: Object (Esquema polimórfico flexible)
  * `updated_at`: ISODate
* **Colección:** `user_preferences` (Índice en `user_id`)
  * `_id`: ObjectId
  * `user_id`: ObjectId (Ref: `users._id`)
  * `interface`: Object (`{ theme: "premium_dark", language: "ES" }`)
  * `notification_channels`: Object (`{ email_enabled: bool, push_apps_enabled: bool, alert_toggles: dict }`)
  * `updated_at`: ISODate
* **Colección:** `system_configurations` (Acceso por llave inmutable `_id: "global_clinical_settings"`)
  * `_id`: String
  * `last_modified_by`: ObjectId (Ref: `users._id`)
  * `default_clinical_thresholds`: Object (PatientThresholdsSchema)
  * `updated_at`: ISODate

### MÓDULO 12: AUDITORÍA FORENSE
* **Colección:** `audit_logs` (Inmutable, Índice compuesto: `{ log_type: 1, criticality: 1, timestamp: -1 }`)
  * `_id`: ObjectId
  * `timestamp`: ISODate
  * `log_type`: String (Enum LogType)
  * `criticality`: String (Enum LogCriticality)
  * `event_action`: String (Ej: `"UPDATE_PATIENT_THRESHOLDS"`)
  * `actor`: Object (`{ user_id: id, username: str, role: str, ip_address: str }`)
  * `hardware_metadata`: Object | Null
  * `traceability_payload`: Object (TraceabilityPayloadSchema)

### MÓDULO 13: MOTOR DE REPORTES ANALÍTICOS
* **Colección:** `generated_reports` (Índice compuesto: `{ requested_by: 1, created_at: -1 }`)
  * `_id`: ObjectId
  * `requested_by`: ObjectId (Ref: `users._id`)
  * `report_type`: String (Enum ReportType)
  * `parameters`: Object
  * `status`: String (`PROCESSING`, `COMPLETED`, `FAILED`)
  * `preview_snapshot`: Object (JSON agregado estructurado para gráficos UI)
  * `export_urls`: Object (`{ pdf_file_url: str, csv_file_url: str }`)
  * `created_at`: ISODate
* **Colección:** `operational_metrics_snapshots` (Índice descendente en `snapshot_date`)
  * `_id`: ObjectId
  * `snapshot_date`: ISODate
  * `metrics`: Object