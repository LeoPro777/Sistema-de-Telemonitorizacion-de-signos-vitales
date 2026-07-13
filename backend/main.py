"""
main.py — Punto de entrada de FastAPI y WebSockets
Sistema de Telemonitorización de Signos Vitales
"""

from contextlib import asynccontextmanager
import asyncio
from datetime import datetime, timezone, timedelta
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.services.database import db_service
from backend.routes.auth import router as auth_router
from backend.routes.applicants import router as applicants_router
from backend.routes.dashboard import router as dashboard_router
from backend.routes.patients import router as patients_router
from backend.routes.vitals import router as vitals_router
from backend.routes.devices import router as devices_router
from backend.routes.doctors import router as doctors_router
from backend.routes.clients import router as clients_router
from backend.routes.support import router as support_router
from backend.routes.profile import router as profile_router
from backend.routes.reports import router as reports_router
from backend.routes.audit_logs import router as audit_logs_router
from backend.routes.users import router as users_router
from backend.services.audit import AuditContextMiddleware


import os
import httpx
import logging

logger = logging.getLogger("app.main")

async def offline_checker_task():
    while True:
        try:
            now = datetime.now(timezone.utc)
            cutoff_time = now - timedelta(seconds=30)
            # Find and update all patients who are currently marked online but haven't sent data in 30s
            await db_service.raw_db.patients.update_many(
                {
                    "is_online": True,
                    "$or": [
                        {"last_telemetry_timestamp": {"$lt": cutoff_time}},
                        {"last_telemetry_timestamp": {"$exists": False}}
                    ]
                },
                {"$set": {"is_online": False}}
            )
        except Exception as e:
            pass
        await asyncio.sleep(5)

async def self_ping_task_loop():
    """
    Tarea en segundo plano para realizar pings periódicos a la URL pública del servicio.
    Evita la hibernación (spin down) en las instancias gratuitas de Render.
    """
    await asyncio.sleep(10) # Esperar a que el servidor termine de iniciar
    self_url = os.environ.get("RENDER_EXTERNAL_URL")
    if not self_url:
        logger.info("[Keep-Alive] RENDER_EXTERNAL_URL no configurado. Omitiendo keep-alive en desarrollo local.")
        return

    ping_url = f"{self_url.rstrip('/')}/health"
    logger.info(f"[Keep-Alive] Iniciando pings periódicos a: {ping_url}")

    async with httpx.AsyncClient(verify=False) as client:
        while True:
            try:
                response = await client.get(ping_url, timeout=10.0)
                logger.info(f"[Keep-Alive] Autollamado exitoso a {ping_url}. Status: {response.status_code}")
            except Exception as e:
                logger.warning(f"[Keep-Alive] Error al realizar autollamado a {ping_url}: {e}")
            await asyncio.sleep(40)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Conectar base de datos y redis al arrancar
    await db_service.connect()
    
    # Iniciar la tarea en segundo plano para verificar desconexiones
    checker_task = asyncio.create_task(offline_checker_task())
    
    # Iniciar la tarea de autollamada keep-alive para Render
    ping_task = asyncio.create_task(self_ping_task_loop())
    
    yield
    # Desconectar al apagar
    checker_task.cancel()
    ping_task.cancel()
    await db_service.disconnect()

app = FastAPI(
    title="Sistema de Telemonitorización de Signos Vitales",
    version="1.0.0",
    lifespan=lifespan
)

import time
from fastapi import Request

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    
    try:
        with open("backend_requests.log", "a", encoding="utf-8") as f:
            cookie_header = request.headers.get("cookie", "None")
            f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {request.method} {request.url.path} - Status: {response.status_code} - Cookie: {cookie_header} - Time: {process_time:.2f}ms\n")
    except Exception:
        pass
        
    return response

# Configuración de CORS
from backend.config import settings
origins = [origin.strip() for origin in settings.ALLOWED_ORIGINS.split(",")] if settings.ALLOWED_ORIGINS else ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuditContextMiddleware)

# Registro de Enrutadores
app.include_router(auth_router, prefix="/api")
app.include_router(applicants_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api/v1") # Soporte adicional para rutas del dashboard /api/v1
app.include_router(patients_router, prefix="/api")
app.include_router(devices_router, prefix="/api")
app.include_router(doctors_router, prefix="/api")
app.include_router(clients_router, prefix="/api")
app.include_router(support_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(reports_router, prefix="/api/v1")
app.include_router(audit_logs_router, prefix="/api")
app.include_router(audit_logs_router, prefix="/api/v1")

app.include_router(vitals_router) # Registrado sin prefijo para que coincida /ws/vitals y /api/vitals/simulate

@app.get("/health")
async def health_check():
    return {"status": "ok"}


# Servir archivos estáticos de React en producción (despliegue en contenedor único)
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")

if os.path.exists(frontend_dir):
    # Montar la carpeta de assets de Vite
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dir, "assets")), name="assets")

    # Enrutador catch-all para SPA (React Router) y otros archivos estáticos
    @app.get("/{file_name:path}")
    async def serve_static(file_name: str):
        # Si la ruta no tiene extensión (es una ruta de la SPA como /dashboard, /patients, etc.)
        if not file_name or file_name in ["", "/"] or "." not in file_name:
            return FileResponse(os.path.join(frontend_dir, "index.html"))
        
        file_path = os.path.join(frontend_dir, file_name)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
            
        return FileResponse(os.path.join(frontend_dir, "index.html"))



