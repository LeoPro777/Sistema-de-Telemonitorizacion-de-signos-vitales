#!/bin/bash
# =============================================================================
# start.sh — Script de arranque de producción para Render
# =============================================================================

set -e

echo "=== Iniciando Entorno de Producción AURA ==="

# 1. Levantar Redis local si no se especifica un servidor externo
# Si REDIS_URL contiene 'localhost' o '127.0.0.1' o no está configurado, iniciamos el Redis interno.
if [[ -z "${REDIS_URL}" || "${REDIS_URL}" == *"localhost"* || "${REDIS_URL}" == *"127.0.0.1"* ]]; then
    echo "Configurando Redis interno..."
    redis-server --daemonize yes
    # Esperar a que Redis esté listo
    until redis-cli ping | grep -q "PONG"; do
        echo "Esperando a que Redis local responda..."
        sleep 1
    done
    echo "Redis interno levantado con éxito."
    # Asegurarnos de que REDIS_URL esté establecido para el backend y celery
    export REDIS_URL="redis://127.0.0.1:6379/0"
fi

# 2. Levantar Worker y Beat de Celery en background
echo "Iniciando Celery Worker (concurrency=1)..."
celery -A backend.workers.celery_app worker --loglevel=info --concurrency=1 &

echo "Iniciando Celery Beat..."
celery -A backend.workers.celery_app beat --loglevel=info &

# 3. Levantar Servidor ASGI FastAPI (Uvicorn) en primer plano
# Render inyecta la variable $PORT. Si no existe, usamos 8000.
PORT_NUMBER=${PORT:-8000}
echo "Iniciando FastAPI (Uvicorn) en el puerto: ${PORT_NUMBER}"

exec uvicorn backend.main:app --host 0.0.0.0 --port "${PORT_NUMBER}"
