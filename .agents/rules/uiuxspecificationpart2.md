---
trigger: model_decision
description: Cuando el modelo crea que sea necesario, si se llega a tocar cualquier modulo del 6 en adelante.
---

# Especificación Funcional de UI/UX - Parte 2 (Módulos 6 al 13)

---

## MÓDULO 6: GESTIÓN DE DOCTORES
### 6.1 Pantalla Vista de Doctores
* **Componentes:** Buscador por nombre o `license_number`, filtros por especialidad y paginación. Mantiene la consistencia de doble vista:
  * *Cards:* Tarjetas con nombre, badge dorado de especialidad, código `internal_staff_id`, indicador LED de disponibilidad (`is_active`) y el contador numérico de pacientes bajo tutela (`active_patients_count`).
  * *Lista:* Tabla compacta con columnas para la licencia, especialidad, pacientes activos y menú lateral de edición o desactivación.

### 6.2 Pantalla Detalles de Doctores
* **Componentes:** Formulario de solo lectura con los datos fijos del objeto `contact` (teléfonos, ubicación física del consultorio) y bitácora de auditoría de perfil. Botón de control: **"Desactivar"**.
* **UX & Comportamiento:** Al presionar Desactivar, el flag cambia a false en `DoctorCollection`. La interfaz atenúa la opacidad del perfil y bloquea los accesos del médico de forma inmediata.

---

## MÓDULO 7: GESTIÓN DE CLIENTES (CLÍNICAS O FAMILIARES)
### 7.1 Pantalla Vista de Clientes
* **Componentes:** Buscador corporativo por identificador fiscal, selector de `client_type` y botón de alta de nuevas cuentas de fondeo.
* **UX & Comportamiento:** Las tarjetas muestran un icono dinámico según el negocio (edificio para `CLINICA` o casa para `FAMILIAR`). Muestra la razón social, su documento `tax_id`, una barra de porcentaje horizontal vinculada a la salud del contrato financiero (`summary_cache.contract_health_percent`) y un badge numérico con la sumatoria de las alertas críticas activas de sus pacientes vinculados (`summary_cache.active_critical_alerts`).

### 7.2 Pantalla Detalles de Clientes
* **Componentes:** Pestaña de Datos Principales (direcciones y correos de emergencia validados) y una sub-lista tabular interactiva que cruza datos para listar y dar seguimiento a todos los pacientes vinculados al `client_id` de la clínica. Incluye botón para desactivar la cuenta de forma masiva ante incumplimientos de contrato.

---

## MÓDULO 8: MÓDULO DE VALIDACIÓN DE ASPIRANTES
### 8.1 Pantalla Vista de Aspirantes
* **Layout:** Lista priorizada de atención ordenada de forma descendente por `submitted_at`, filtrando por el estado `PENDING_APPROVAL`.
* **Componentes:** Tarjetas limpias indicando el rol solicitado, nombre del solicitante, origen institucional y fecha de envío. Botón de acción central: **"Revisar"**.

### 8.2 Pantalla Detalles de Aspirantes
* **Layout:** Interfaz de auditoría en pantalla dividida. Izquierda: Datos del solicitante y metadatos clínicos. Derecha: Visor interactivo integrado de documentos legibles en formato PDF o Imagen mediante URLs firmadas seguras de la nube.
* **Componentes:** Botón **"Aprobar Registro"** (Verde), Botón **"Rechazar Solicitud"** (Rojo) y una caja de texto obligatoria para ingresar la justificación del rechazo (`audit_review.rejection_reason`).
* **UX & Comportamiento:** El botón de aprobación permanece inhabilitado hasta que la interfaz detecte que el Administrador ha abierto al menos uno de los archivos multimedia obligatorios. Si se aprueba, se bloquean los controles y el backend crea de forma transparente los accesos correspondientes en las colecciones de usuarios operativos.

---

## MÓDULO 9: CENTRO DE AYUDA Y SOPORTE
### 9.1 Pantalla Centro de Ayuda
* **Componentes:** Barra de búsqueda semántica con interacción tipo *type-ahead*, píldoras horizontales de categorías de soporte y pestañas para conmutar entre `FAQs` o `Guías`. Botón inferior **"Contactar a Soporte"** para abrir un ticket en `SupportTicketCollection`.
* **UX & Comportamiento:** Al escribir en la barra de búsqueda, se consume el text index y se despliega un menú flotante con sugerencias automáticas de títulos coincidentes.

### 9.2 Pantalla Detalle de Artículo
* **Layout:** Modo de lectura libre de distracciones con tipografías amplias y cajas de notas resaltadas.
* **Componentes:** Renderizador nativo del string Markdown del campo `content` con soporte para imágenes insertadas. Bloque inferior de feedback con la pregunta: *"¿Te fue útil este artículo?"* y los botones **"Sí"** y **"No"**.
* **UX & Comportamiento:** Al hacer clic en un voto, los botones se atenúan y se ejecuta una actualización atómica `$inc` en `feedback_counters` inhabilitando el componente para prevenir spam.

---

## MÓDULO 10: PERFILES DE USUARIO
### 10.1 Pantalla Vista de Perfil
* **Componentes:** Avatar circular que renderiza la URL de `google_avatar_url`. Pestañas de navegación interna:
  * *Pestaña Datos Personales:* Formulario estructurado con los teléfonos, direcciones y correos del objeto `personal_data`.
  * *Pestaña Información de Rol:* Componente polimórfico. Si es Médico, muestra su especialidad y número de licencia profesional; si es Paciente, expone su ID clínico único.
* **Componente de Control:** Botón principal **"Modificar Perfil"**.

### 10.2 Pantalla Edición de Perfil
* **Componentes:** Inputs con estados de validación visual reactivos (borde verde si cumple el formato, rojo con texto aclaratorio de error si el correo o cédula es inválido). Botones inferiores de control con jerarquía clara: **"Guardar Cambios"** (con estado de carga integrado) y **"Cancelar"** (descarta las modificaciones y retorna al estado de lectura 10.1).

---

## MÓDULO 11: CONFIGURACIONES (SISTEMA Y PREFERENCIAS)
### 11.1 Pantalla Panel de Configuración General
* **Componentes:** Menú lateral de opciones de configuración acoplado a un panel con interruptores minimalistas.
  * *Interfaz:* Desplegables para cambiar el idioma base y el tema estético (`theme_preference`, por defecto `"premium_dark"`).
  * *Notificaciones:* Interruptores independientes para activar/desactivar canales de comunicación física o digital (correos, notificaciones push móviles e interruptores para el array de alertas clínicas específicas `alert_toggles`).
* **Botones de Control:** **"Guardar Cambios"** y **"Restablecer Predeterminados"**.

### 11.2 Pantalla Configuración Avanzada (Exclusiva del Administrador)
* **Layout:** Zona de acceso restringido protegida por un modal de confirmación y re-verificación de credenciales de seguridad.
* **Componentes:** Formulario de alta densidad con inputs numéricos de precisión decimal para alterar los límites biométricos globales por defecto del sistema (mínimo/máximo de pulso BPM, nivel crítico de SpO2 % y límites de temperatura en Celsius). Botones de control: **"Confirmar Directiva Global"** y **"Descartar"**.
* **UX & Comportamiento:** Al confirmar, escribe directamente sobre el documento maestro inmutable de la colección `system_configurations` (`_id: "global_clinical_settings"`). A partir de ese milisegundo, cualquier paciente nuevo que ingrese al sistema heredará de forma automática estos nuevos umbrales como su base clínica base.

---

## MÓDULO 12: AUDITORÍA FORENSE Y CONTROL DE LOGS
### 12.1 Pantalla Historial de Auditoría
* **Layout:** Diseño denso estilo consola de operaciones con tipografía de ancho fijo para hashes, IDs y direcciones IP.
* **Componentes:** Buscador avanzado, filtros por nivel de enum `LogCriticality` (asociando colores de advertencia fijos: `INFO` = Gris cian, `WARNING` = Ámbar, `CRITICAL` = Rojo carmesí) y controles de paginación indexada.
  * *Cambio de Pestaña (`log_type`):*
    1.  **Logs Globales (`GLOBAL_ACTIVITY`):** Tabla de Actividades. Columnas: Timestamp, Acción (`event_action`, Ej: `UPDATE_PATIENT_THRESHOLDS`), Actor (Usuario/Rol) e IP de origen.
    2.  **Telemetría IoT (`IOT_TELEMETRY`):** Historial de Conexión del hardware. Columnas: Sello de tiempo, ID del dispositivo, Dirección MAC y duración del evento técnico de red.
* **Acción:** Cada fila incluye el botón **"Inspeccionar"** para abrir el visor detallado.

### 12.2 Pantalla Detalle de Evento
* **Layout:** Ventana modal expandida de fondo oscuro reforzado (`#080C14`) para resaltar bloques estructurados de código JSON.
* **Componentes:** Despliega el componente avanzado **Visor de Trazabilidad Completa** (*Diff Viewer*), que divide el lienzo en dos columnas estructuradas de código JSON limpio:
  * *Columna Izquierda (Estado Anterior):* Muestra el objeto JSON del documento antes de la acción (`previous_values`). Si fue una creación, se renderiza un badge de "REGISTRO NUEVO".
  * *Columna Derecha (Estado Nuevo):* Muestra el objeto JSON con los campos mutados resaltados con fuentes verdes o doradas (`new_values`).
* **Controles Inferiores:** Botón **"Descargar Log"** (exporta el evento en un archivo JSON plano) y botón **"Cerrar"**.

---

## MÓDULO 13: MOTOR DE REPORTES ANALÍTICOS
### 13.1 Pantalla Panel de Reportes
* **Layout:** Interfaz estructurada como un asistente guiado por pasos (*Wizard Setup*) de amplios espacios.
* **Componentes:** Selector de rango de fechas interactivo (mapea `start_date` y `end_date`), input inteligente con autocompletado enlazado a la lista de pacientes, y el selector de modo del tipo de reporte (`report_type`):
  * **Opción Reporte Clínico (`CLINICAL`):** Activa un área de **Gráficos y Resumen** que previsualiza curvas de tendencias biométricas del mes compiladas mediante agregaciones.
  * **Opción Reporte de Gestión (`MANAGEMENT`):** Cambia el entorno hacia **Métricas de Uso**, exponiendo contadores analíticos rápidos del volumen de usuarios activos, puntos de datos procesados por el hardware y alertas resueltas.
* **Acción:** Botón centralizado **"Procesar"**, el cual activa el estado asíncrono y redirige a la previsualización.

### 13.2 Pantalla Previsualización de Reporte
* **Layout:** Lienzo interactivo central que simula de forma exacta la hoja física estructurada del reporte clínico antes de imprimirse.
* **Componentes:** Renderiza las tablas agregadas y los gráficos vectoriales utilizando los datos precalculados del objeto `preview_snapshot`. Contenedor flotante inferior con los botones de descarga definitiva con acceso directo a las propiedades de almacenamiento en la nube: **"Exportar PDF"** (descarga del reporte formateado consumiendo `export_urls.pdf_file_url`) y **"Exportar CSV"** (descarga del set de datos numéricos puros tabulares a través de `export_urls.csv_file_url`).