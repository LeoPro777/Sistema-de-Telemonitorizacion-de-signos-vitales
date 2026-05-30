"""
main.py — Punto de entrada de FastAPI y WebSockets
Sistema de Telemonitorización de Signos Vitales
"""

from contextlib import asynccontextmanager
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Conectar base de datos y redis al arrancar
    await db_service.connect()
    yield
    # Desconectar al apagar
    await db_service.disconnect()

app = FastAPI(
    title="Sistema de Telemonitorización de Signos Vitales",
    version="1.0.0",
    lifespan=lifespan
)

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permitir todos para desarrollo
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


