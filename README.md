# Sistema de Telemonitorización de Signos Vitales

Sistema clínico de monitoreo remoto de pacientes en tiempo real.

> 📖 **Arquitectura y flujo de trabajo detallado:** [`DEVELOPMENT_ROADMAP.md`](./DEVELOPMENT_ROADMAP.md)

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Backend API | FastAPI (Python 3.12) |
| WebSockets | FastAPI WebSockets |
| Base de datos | MongoDB 7 |
| Caché / Cola | Redis 7 |
| Tareas en background | Celery |
| Frontend | React + Vite + TypeScript |
| Estado global | Zustand |
| **Dev:** Entorno de ejecución | **Procesos nativos en SO** |
| **Prod:** Entorno de ejecución | **Contenedor Docker monolítico (Supervisord)** |

## Estrategia de Entornos

| | Desarrollo | Producción |
|---|---|---|
| Ejecución | 5 procesos nativos en terminales | 1 contenedor Docker (Supervisord) |
| Frontend | Vite dev server (`:5173`) | Bundle estático servido por FastAPI |
| Hot-reload | ✅ Uvicorn `--reload` | ❌ No aplica |
| Portabilidad | Solo máquina local | Cualquier VPS con Docker |

## Estructura del Proyecto

```
├── DEVELOPMENT_ROADMAP.md   # Guía de arquitectura dual (leer primero)
├── backend/
│   ├── main.py              # Punto de entrada FastAPI + WebSockets
│   ├── config.py            # Variables de entorno (Mongo / Redis)
│   ├── models/              # Esquemas Pydantic v2
│   ├── routes/              # Enrutadores REST por módulo
│   ├── services/            # Lógica de negocio / streams biométricos
│   └── workers/             # Tareas Celery (reportes, alertas)
├── frontend/
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx         # Inicialización React
│       ├── components/      # UI comunes (Cards, Listas, DiffViewer)
│       ├── store/           # Estado global Zustand
│       ├── views/           # Módulo 1 – Módulo 13
│       └── utils/           # WSS + formateadores biométricos
└── docker/
    ├── docker-compose.yml   # Solo para referencia / pruebas aisladas
    ├── backend.dockerfile
    └── frontend.dockerfile
```

## Inicio Rápido

### Desarrollo nativo (recomendado)

Levanta cada componente en su propia terminal. Consulta [`DEVELOPMENT_ROADMAP.md §1`](./DEVELOPMENT_ROADMAP.md) para los comandos exactos y el orden de arranque.

```bash
# T1 – MongoDB
mongod --dbpath ./data/db

# T2 – Redis
redis-server

# T3 – FastAPI (nuevo terminal, dentro de /backend con venv activo)
uvicorn main:app --reload --port 8000

# T4 – Celery Worker (nuevo terminal, mismo venv)
celery -A workers.celery_app worker --loglevel=info

# T5 – React / Vite (nuevo terminal, dentro de /frontend)
npm run dev
```

Servicios disponibles en desarrollo:
- **Frontend (Vite)**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs (Swagger)**: http://localhost:8000/docs

### Producción (contenedor monolítico)

```bash
# Build del contenedor (desde la raíz del proyecto)
docker build -f docker/monolith.dockerfile -t telemonitoreo:latest .

# Lanzar el contenedor
docker run -d -p 80:80 -v telemonitoreo_data:/data/db telemonitoreo:latest
```

> Ver [`DEVELOPMENT_ROADMAP.md §2`](./DEVELOPMENT_ROADMAP.md) para el detalle
> completo del Dockerfile multi-stage y la configuración de Supervisord.
