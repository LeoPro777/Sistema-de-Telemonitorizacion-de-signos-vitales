---
trigger: model_decision
description: Cuando el modelo crea que sea necesario, si se llega a tocar cualquier modulo del 1 hasta el 5.
---

# Especificación Funcional de UI/UX - Parte 1 (Módulos 1 al 5)

## Lineamientos Visuales Globales (Estilo Premium Dark)
* Fondo base: Oscuro profundo (`#0B0F19`), Contenedores/Tarjetas: Azul marino metálico (`#1E2640`), Acentos: Dorado (`#D4AF37`).
* Semántica del enum `TelemetryStatus`: `NORMAL` = Verde cian, `WARNING` = Amarillo oro, `CRITICAL` = Rojo carmesí pulsante.

---

## MÓDULO 1: AUTENTICACIÓN Y ONBOARDING DE ASPIRANTES
### 1.1 Pantalla de Inicio de Sesión (Login)
* **Layout:** Pantalla dividida. Izquierda: Branding e ilustración IoT animada sutilmente. Derecha: Formulario centrado.
* **Componentes:** Inputs de texto flotantes para `username`/`email` y `password` (con alternador de icono de ojo). Botón principal "Iniciar Sesión". Enlace inferior "Solicitar registro".
* **UX & Comportamiento:** Si el backend responde que `two_factor.enabled == true`, el formulario hace una transición deslizante y despliega 6 inputs para los números de verificación TOTP. Si el estado del usuario es `PENDING`, lo enruta forzadamente a la pantalla 1.4.

### 1.2 Pantalla de Selección de Tipo de Aspirante
* **Layout:** Grid de tres columnas centrado en la pantalla.
* **Componentes:** Tres tarjetas interactivas de gran formato con iconos: **Doctor**, **Cliente (Clínica/Familiar)**, **Paciente**. Botón inferior "Continuar".
* **UX & Comportamiento:** Al hacer clic en una tarjeta, esta se enmarca con un borde dorado brillante y cambia el estado de selección, desbloqueando el botón "Continuar".

### 1.3 Pantalla de Formulario de Registro
* **Layout:** Formulario secuencial por pasos (*Stepper*).
* **Componentes:** Inputs comunes (nombres, id nacional, email, teléfono). Inputs dinámicos: licencia médica/especialidad si es Doctor; razón social/tax_id si es Cliente. Caja *Drag & Drop* para el array `verification_documents`.
* **UX & Comportamiento:** Validaciones en tiempo real en los inputs. Al presionar "Enviar", muestra animación de carga y persiste los datos en la colección `applicants` en estado `PENDING_APPROVAL`.

### 1.4 Pantalla de Carga y Espera
* **Layout:** Pantalla completa en negro profundo con un pulso biométrico animado en CSS en el centro.
* **Componentes:** Texto descriptivo dinámico explicando el estado de auditoría. Botón de escape "Volver al Inicio".
* **UX & Comportamiento:** Bloquea la navegación. El middleware del frontend ancla aquí al usuario en estado `PENDING` hasta que el webhook de la base de datos cambie su estado a `APPROVED`.

---

## MÓDULO 2: MENÚ PRINCIPAL (DASHBOARD HUB)
### 2.1 Hub Central y Enrutamiento por Roles
* **Layout:** Sidebar fija colapsable izquierda en gris oscuro, TopBar superior con buscador semántico, contador de alertas globales y avatar del perfil.
* **UX & Comportamiento:** El enrutamiento filtra los accesos del menú lateral usando la propiedad `UserRole`:
  * *ADMIN:* Acceso total a módulos del 4 al 13.
  * *DOCTOR:* Acceso a Pacientes (M4), Ayuda (M9), Perfil (M10) y Reportes (M13).
  * *PATIENT:* Redirección automática inmediata al Módulo 3, inhabilitando la Sidebar.

### 2.2 Grid de Widgets Dinámicos y Sistema de Caché (KPIs)
* **Layout:** Grilla modular responsiva ordenada según la propiedad de base de datos `position_order`.
* **Componentes:** Tarjetas superiores con contadores numéricos, widgets de gráficos de barras de incidentes y listas compactas.
* **UX & Comportamiento:** Los datos no se cuentan en caliente. Al montar la vista, se consume el documento precalculado de la colección `dashboard_kpi_cache`. Los widgets se actualizan de forma independiente según su atributo `refresh_interval_ms`.

---

## MÓDULO 3: LECTURA SIMPLE DE SIGNOS VITALES (PACIENTE)
### 3.1 Pantalla de Monitoreo en Tiempo Real
* **Layout:** Diseño móvil exclusivo de alta legibilidad, compuesto por tres bloques densos verticales.
* **Componentes:** 1. *Tarjeta Pulso:* Icono de corazón animado, valor gigante con unidad `bpm` y mini-gráfico continuous sparkline.
  2. *Tarjeta Oxigenación:* Icono de saturación y valor porcentual masivo (`%`).
  3. *Tarjeta Temperatura:* Icono de termómetro digital y lectura decimal (`°C`).
* **UX & Comportamiento:** Totalmente de solo lectura. Se suscribe al WebSocket de `vital_signs_history`. Cambia el color de fuente y el resplandor de fondo instantáneamente acorde a los umbrales evaluados en `TelemetryStatus` (Verde, Amarillo, Rojo parpadeante).

---

## MÓDULO 4: GESTIÓN DE PACIENTES
### 4.1 Pantalla Vista de Pacientes (Consola General)
* **Layout:** Grilla responsiva adaptativa con barra superior de herramientas.
* **Componentes:** Buscador de texto, píldoras de filtrado por criticidad, paginador y switch de vista para alternar `ui_preferences.view_type`.
  * *Modo Tarjetas (CARDS):* Avatar del paciente (se convierte en icono de alerta roja intermitente si `has_active_alert == true`), nombre, `medical_record_id` y tres barras horizontales que resumen la telemetría guardada en `last_telemetry_cache`.
  * *Modo Tabla (LIST):* Filas de alta densidad informativa con columnas de identificación, médico a cargo, alertas vigentes y acciones rápidas.

### 4.2 Pantalla Detalles de Paciente (Expediente y Analíticas)
* **Layout:** División 30% izquierda (perfil y umbrales fijos) y 70% derecha (módulo de pestañas dinámicas).
* **Componentes:** Botón de edición, interruptor de activación/inactivación lógica, sliders dobles para calibrar `clinical_thresholds`.
* **Pestañas:**
  1. *Gráficos:* Tres canvas independientes e interconectados temporalmente con zoom interactivo y el botón flotante **"DESCARGAR DATOS"** (PDF, CSV o JSON).
  2. *Alertas:* Historial inmutable ordenado de forma descendente consumiendo la colección `alerts`.
  3. *Historial Clínico:* Visualización del objeto flexible `medical_history_summary`.
* **UX & Comportamiento:** Mover un slider de umbrales en el panel izquierdo despliega y arrastra una línea horizontal roja guía en las gráficas de la derecha en tiempo real.

---

## MÓDULO 5: GESTIÓN DE DISPOSITIVOS
### 5.1 Pantalla Vista de Dispositivos (Inventario Técnico)
* **Layout:** Consola de rejilla técnica con fuentes tipográficas monoespaciadas.
* **Componentes:** Buscador, filtros por estado operacional, paginación y botón destacado **"AGREGAR"** (redirige al flujo de aprobación 5.3). Las tarjetas técnicas exponen el `serial_number`, `mac_address`, barra de progreso de batería, icono de potencia de red inalámbrica (`signal_strength_dbm`) y etiquetas planas con el color de `OperationalStatus`.
* **UX & Comportamiento:** Si el campo `has_hardware_alert == true`, el borde de la tarjeta realiza una animación de pulsación amarilla. No permite enlazar un paciente desde aquí para evitar dobles referencias; el botón de asignación envía al usuario al expediente del Módulo 4.2.

### 5.2 Pantalla Detalles de Dispositivos
* **Componentes:** Botón de edición de firmware y botón crítico **"Desactivar"** (`is_active = false`). Muestra tres paneles informativos fijos:
  1. *Paciente Asignado:* Caja de texto reactiva que lee en background la colección `patients` filtrando por el ID de este hardware.
  2. *Datos Principales:* Sello de fecha de `last_ping_at` y versión del microcontrolador.
  3. *Historial de Alertas:* Bitácora de problemas de hardware o caídas de tensión de batería.

### 5.3 Pantalla de Aprobación de Dispositivos (Flujo de Provisión)
* **Componentes:** Desglose técnico de la solicitud de fábrica del chip. Panel inferior binario compuesto por los botones flotantes **"ACEPTAR"** y **"RECHAZAR"**.
* **UX & Comportamiento:** Al presionar Aceptar, la interfaz se bloquea mostrando animación de procesamiento, muta el campo en la colección `devices` a `APPROVED` e inicializa el hardware como `AVAILABLE`.