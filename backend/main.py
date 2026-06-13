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


async def offline_checker_task():
    while True:
        try:
            now = datetime.now(timezone.utc)
            cutoff_time = now - timedelta(seconds=15)
            # Find and update all patients who are currently marked online but haven't sent data in 15s
            await db_service.db.patients.update_many(
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

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Conectar base de datos y redis al arrancar
    await db_service.connect()
    
    # Iniciar la tarea en segundo plano para verificar desconexiones
    checker_task = asyncio.create_task(offline_checker_task())
    
    yield
    # Desconectar al apagar
    checker_task.cancel()
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

# Registro de Enrutadores
app.include_router(auth_router, prefix="/api")
app.include_router(applicants_router, prefix="/api")
app.include_router(dashboard_router, prefix="/api")
app.include_router(patients_router, prefix="/api")
app.include_router(devices_router, prefix="/api")
app.include_router(doctors_router, prefix="/api")
app.include_router(clients_router, prefix="/api")
app.include_router(support_router, prefix="/api")
app.include_router(profile_router, prefix="/api")

app.include_router(vitals_router) # Registrado sin prefijo para que coincida /ws/vitals y /api/vitals/simulate

@app.get("/health")
async def health_check():
    return {"status": "ok"}


