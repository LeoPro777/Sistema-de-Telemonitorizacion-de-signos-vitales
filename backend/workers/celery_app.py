"""
celery_app.py — Inicialización de Celery para Tareas en Background
"""

from celery import Celery
from backend.config import settings

celery_app = Celery(
    "tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Caracas",
    enable_utc=True,
)

# Auto-descubrir tareas en el directorio de workers
celery_app.autodiscover_tasks(["backend.workers"])
