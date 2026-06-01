# Esquema de Trabajo e Integración del Proyecto
> **Sistema de Telemonitorización de Signos Vitales** — Guía de Arquitectura Dual

Este documento define las dos modalidades de ejecución del sistema: el entorno
de **desarrollo nativo** en la máquina local y la estrategia de **despliegue en
producción** mediante un contenedor monolítico autocontenido.

---

## 1. Entorno de Desarrollo (Nativo en Sistema Operativo)

Las dependencias se gestionan de forma aislada a nivel de software, consumiendo
recursos nativos de la máquina. No se usa Docker en esta etapa; cada componente
corre como un proceso independiente comunicado por `localhost`.

### Topología de Procesos Locales

```
[ Terminal 1: MongoDB ] ──(Puerto 27017)──┐
[ Terminal 2: Redis ]   ──(Puerto 6379)───┼──► [ Terminal 3: FastAPI  (Puerto 8000) ]
[ Terminal 4: Celery ]  ──(Venv Python)───┘                  ▲
                                                              │  REST / WSS
[ Terminal 5: React ]   ──(Vite  Puerto 5173) ───────────────┘
```

### Descripción de Cada Terminal

| Terminal | Rol | Comando de arranque |
|---|---|---|
| **T1 – Persistencia** | Motor MongoDB en su puerto nativo. Aquí se inicializa la BD y la colección *Time Series* de telemetría. | `mongod --dbpath ./data/db` |
| **T2 – Broker / Caché** | Redis como broker de colas de Celery y almacén de KPIs precalculados en memoria. | `redis-server` |
| **T3 – API (ASGI)** | FastAPI levantado con Uvicorn en modo `--reload`. Cualquier cambio guardado en el IDE recarga el servidor en milisegundos. | `uvicorn main:app --reload --port 8000` |
| **T4 – Worker Asíncrono** | Celery comparte el mismo `venv` de Python. Escucha las colas de Redis y evalúa umbrales clínicos en *background*. | `celery -A workers.celery_app worker --loglevel=info` |
| **T5 – Presentación** | Servidor de desarrollo Vite apuntando su proxy REST y WebSocket a `localhost:8000`. | `npm run dev` |

### Gestión de Dependencias por Capa

* `/backend` — Requiere un entorno virtual de Python (`venv`) donde se instalan:
  `FastAPI`, `Pydantic v2`, `Celery`, `Motor` (driver async de MongoDB),
  `Uvicorn` y `python-dotenv`.

* `/frontend` — Requiere **Node.js ≥ 18** instalado localmente para ejecutar
  el servidor de desarrollo de Vite y gestionar paquetes mediante `npm`.

---

## 2. Entorno de Producción (Contenedor Monolítico)

Cuando el sistema alcance madurez, se empaqueta en un **único contenedor Docker**
que incluye todos los servicios. Esto garantiza portabilidad total: un solo
artefacto para desplegar en cualquier VPS sin redes virtuales complejas ni
costos de infraestructura gestionada.

### Arquitectura Interna del Contenedor

```
┌─────────────────────────────────────────────────────────┐
│                  Contenedor Monolítico                  │
│                                                         │
│   [ Supervisord  (PID 1 — Orquestador interno) ]        │
│         │                                               │
│         ├──► MongoDB    (Persistencia in-situ)          │
│         ├──► Redis      (Broker interno)                │
│         ├──► FastAPI    (API + archivos estáticos React) │
│         └──► Celery     (Worker analítico)              │
│                                                         │
│   Volumen externo ──► /data/db  (MongoDB persistente)   │
└─────────────────────────────────────────────────────────┘
             │
        Puerto 80 / 443 expuesto al host
```

### El Administrador de Procesos: Supervisord

Los contenedores Linux están diseñados para correr un solo proceso principal.
**Supervisor** actúa como el proceso raíz (`PID 1`) y orquesta los cuatro
servicios internos:

1. Al encender el contenedor, Supervisor arranca en segundo plano **MongoDB** y
   **Redis**.
2. Una vez que las bases de datos están listas, levanta **FastAPI** (Uvicorn) y
   el **Worker de Celery**.
3. Supervisa la salud de los cuatro procesos; si alguno cae por OOM u otro
   error, lo **relanza automáticamente** sin apagar el contenedor.

### Integración del Frontend (Compilación Estática)

En producción **no existe un servidor Vite**. El flujo de integración es:

```
npm run build
      │
      ▼  (genera /frontend/dist/)
      ├── index.html
      ├── assets/main.[hash].css
      └── assets/main.[hash].js
           │
           ▼  (copiados a /backend/static/)
      FastAPI monta /static → sirve index.html en la raíz (/)
      FastAPI expone /api/*  → rutas REST
      FastAPI expone /ws/*   → canales WebSocket
```

Con este diseño, cuando el usuario accede a la IP de producción, FastAPI entrega
el bundle de React, y todas las peticiones de datos se resuelven internamente
bajo los prefijos `/api` y `/ws`.

### Fase de Build del Contenedor

```dockerfile
# ── Fase 1: build del frontend ──────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build          # → dist/

# ── Fase 2: imagen de runtime monolítica ────────────────────
FROM python:3.12-slim
# instalar MongoDB, Redis, Supervisor, dependencias Python...
COPY --from=frontend-builder /app/frontend/dist /app/backend/static
COPY backend/ /app/backend/
# Configurar supervisord.conf y exponer puerto 80
```

---

## 3. Comparativa de Entornos

| Característica | Desarrollo Nativo | Producción Monolítica |
|---|---|---|
| **Ejecución** | 5 procesos en terminales | 1 contenedor Docker |
| **Hot-reload** | ✅ Uvicorn `--reload` | ❌ No aplica |
| **Frontend** | Vite dev server (`:5173`) | Archivos estáticos servidos por FastAPI |
| **Velocidad de debug** | Máxima (hardware nativo) | N/A (fase runtime) |
| **Portabilidad** | Solo en la máquina del dev | Cualquier VPS con Docker |
| **Gestión de caídas** | Manual (relanzar terminal) | Automática (Supervisord) |
| **Complejidad de red** | `localhost` simple | Un solo puerto expuesto |

---

## 4. Variables de Entorno por Fase

### `.env` (Desarrollo)
```env
# Conexiones locales
MONGO_URI=mongodb://localhost:27017/telemonitoreo
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=dev_secret_key_change_in_prod
ENVIRONMENT=development

# Frontend (Vite)
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000
```

### `.env.production` (Contenedor)
```env
# Conexiones internas al contenedor (loopback)
MONGO_URI=mongodb://127.0.0.1:27017/telemonitoreo
REDIS_URL=redis://127.0.0.1:6379/0
SECRET_KEY=<clave_segura_generada>
ENVIRONMENT=production

# El frontend ya está compilado; no requiere VITE_*
```

---

## 5. Convención de Ramas Git

```
main          ← código estable y validado
├── develop   ← integración continua
│   ├── feature/modulo-01-auth
│   ├── feature/modulo-02-dashboard
│   └── ...
└── release/v1.0  ← candidato a producción → build del contenedor
```

> **Regla:** El Dockerfile de producción monolítica solo se construye desde
> ramas `release/*` o `main`, garantizando que el contenedor empaqueta siempre
> código validado.

---

## 6. Organización de Rutas de Autenticación y Administración

Para garantizar el cumplimiento de los flujos de red de autenticación y de administración sin contraseñas:

### En `/backend/routes/auth.py`
- **`/auth/google-login`**: Endpoint receptor del token de Google. Realiza la autenticación, validación asíncrona contra Google APIs, determinación de la máquina de estados del usuario (`incomplete` vs `approved` o `pending_approval`) y la emisión de la **Cookie de Sesión HTTPOnly cifrada** (`session_id`).
- **`/auth/onboarding`**: Permite al usuario en estado `incomplete` completar el flujo de selección de rol y proporcionar datos requeridos de negocio, mutando su estado a `pending_approval` e insertando un registro en la colección `applicants`.
- **`/auth/me`**: Retorna el perfil del usuario validando la cookie HTTPOnly enviada por el navegador.

### En `/backend/routes/applicants.py`
- **`GET /applicants`**: Busca usuarios/solicitudes en estado `pending_approval` para el Administrador.
- **`POST /applicants/{email}/review`**: Endpoint transaccional para Aprobar (muta el estado de usuario a `approved` y crea sus colecciones e.g., `doctors` o `clients`) o Rechazar/Suspender (muta a `rejected` o `suspended`).

