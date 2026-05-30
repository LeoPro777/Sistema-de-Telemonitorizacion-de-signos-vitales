---
trigger: model_decision
description: Cuando se le pidan cosas relacionadas a la arquitectura de sistemas
---

# Arquitectura del Sistema - Sistema de Telemonitoreo IoT

Este documento detalla la infraestructura, contenedores y protocolos de comunicación del sistema basados en el modelo C4 (Nivel 1 y Nivel 2).

## 1. Contexto del Sistema (Nivel 1)
El sistema interactúa con cuatro roles de usuario y un componente de hardware automatizado:
* **Dispositivo IoT (ESP32):** Captura y transmite ráfagas continuas de signos vitales (Pulso, Saturación, Temperatura).
* **Paciente:** Rol con acceso restrictivo de solo lectura a su propia telemetría.
* **Doctor:** Profesional que monitorea alertas, analiza series temporales e interviene clínicamente.
* **Cliente (Clínica/Familiar):** Entidad gestora que financia y administra grupos de pacientes y dispositivos.
* **Administrador:** Superusuario técnico con control total de gobernanza, auditoría forense y provisión.

## 2. Contenedores e Infraestructura (Nivel 2)

[ Capa de Presentación: SPA React + TS ]
│
HTTPS    │    WSS (WebSockets)
(REST)    │   (Real-time Streams)
▼
[ Capa de Lógica: API FastAPI ] ◄──► [ Capa de Broker/Caché: Redis ]
│                                      │
│ (Lectura/Escritura)                  │ (Gestión de Colas)
▼                                      ▼
[ BDD Principal: MongoDB ]               [ Alertas Engine: Celery Worker ]

### Componentes del Stack:
* **SPA (React + TypeScript):** Interfaz web empaquetada con Vite. Utiliza TailwindCSS para el diseño *Premium Dark* y Zustand para el manejo del estado global de las alertas.
* **API (FastAPI):** Núcleo asíncrono en Python encargado de las rutas REST, autenticación JWT, inyección de dependencias y el ciclo de vida de las conexiones WebSocket.
* **Alertas Engine & Workers (Celery):** Demonios asíncronos distribuidos en Python que procesan tareas pesadas (evaluación de umbrales en background, cálculo de métricas diarias y generación de reportes).
* **Message Broker & Cache (Redis):** Motor in-memory intermedio. Funciona como broker de tareas de Celery, almacena la caché estática de los KPIs del dashboard y distribuye eventos Pub/Sub para WebSockets.
* **Base de Datos Principal (MongoDB):** Almacenamiento NoSQL documental. Implementa colecciones de Series de Tiempo (*Time Series*) nativas para la telemetría del ESP32 y esquemas rígidos mediante Pydantic en la capa de aplicación.

## 3. Protocolos de Red y Flujo de Ingesta IoT
1. **HTTPS / REST (JSON):** Utilizado para flujos síncronos transaccionales (Login, CRUDs, Solicitudes, Auditoría).
2. **WSS (WebSockets Secure):** El ESP32 abre un canal persistente con FastAPI transmitiendo paquetes en formato JSON estructurado. FastAPI despacha inmediatamente el stream hacia **Redis**, el cual alimenta la cola de **Celery**. Si Celery detecta que un valor infringe los umbrales clínicos del paciente, genera un documento en la colección `alerts` y notifica a FastAPI, quien empuja la alerta en tiempo real a la interfaz del **Doctor** conectado por WebSocket.