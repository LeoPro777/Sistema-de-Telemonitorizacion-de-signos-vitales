# =============================================================================
# Dockerfile — Despliegue de Contenedor Único (Render)
# Sistema de Telemonitorización de Signos Vitales
# =============================================================================

# --- Stage 1: Compilación de Frontend React ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Imagen Final del Sistema ---
FROM python:3.12-slim

# Instalar dependencias del sistema: Redis server y curl para comprobaciones de salud
RUN apt-get update && apt-get install -y --no-install-recommends \
    redis-server \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar requerimientos e instalar dependencias del backend
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código del backend
COPY backend/ ./backend/

# Copiar el frontend compilado desde el Stage 1
COPY --from=frontend-builder /app/dist ./frontend/dist

# Copiar script de inicio de producción y dar permisos
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Exponer el puerto por defecto (Render inyecta PORT dinámicamente)
EXPOSE 8000

# PYTHONPATH para resolver importaciones relativas
ENV PYTHONPATH=/app

CMD ["./start.sh"]
