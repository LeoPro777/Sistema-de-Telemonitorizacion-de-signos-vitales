"""
tasks.py — Tareas de Celery para Procesos en Segundo Plano
"""

import asyncio
from datetime import datetime, timezone
from bson import ObjectId
from backend.workers.celery_app import celery_app
from backend.services.database import db_service
from backend.models.user import UserRole
from backend.routes.dashboard import calculate_live_kpis

@celery_app.task
def refresh_dashboard_kpi_cache():
    """
    Tarea recurrente de Celery para recalcular los KPIs de forma agregada
    y actualizar la colección `dashboard_kpi_cache` para todos los usuarios.
    """
    async def run_refresh():
        # Inicializar conexión a base de datos para el subproceso de Celery
        await db_service.connect()
        try:
            # 1. Recalcular Admin global
            admin_metrics = await calculate_live_kpis(ObjectId(), UserRole.ADMIN)
            await db_service.db.dashboard_kpi_cache.update_one(
                {"_id": "admin_summary"},
                {
                    "$set": {
                        "owner_id": None,
                        "cached_metrics": admin_metrics,
                        "last_cached_at": datetime.now(timezone.utc)
                    }
                },
                upsert=True
            )
            print("Caché Admin KPIs actualizada.")

            # 2. Recalcular para todos los Médicos
            async for doctor in db_service.db.doctors.find({"is_active": True}):
                user_id = doctor["user_id"]
                cache_key = f"doctor_{user_id}_summary"
                metrics = await calculate_live_kpis(user_id, UserRole.DOCTOR)
                await db_service.db.dashboard_kpi_cache.update_one(
                    {"_id": cache_key},
                    {
                        "$set": {
                            "owner_id": user_id,
                            "cached_metrics": metrics,
                            "last_cached_at": datetime.now(timezone.utc)
                        }
                    },
                    upsert=True
                )
            print("Caché Doctor KPIs actualizada.")

            # 3. Recalcular para todos los Clientes
            async for client in db_service.db.clients.find({"is_active": True}):
                user_id = client["user_id"]
                cache_key = f"client_{user_id}_summary"
                metrics = await calculate_live_kpis(user_id, UserRole.CLIENT)
                await db_service.db.dashboard_kpi_cache.update_one(
                    {"_id": cache_key},
                    {
                        "$set": {
                            "owner_id": user_id,
                            "cached_metrics": metrics,
                            "last_cached_at": datetime.now(timezone.utc)
                        }
                    },
                    upsert=True
                )
            print("Caché Cliente KPIs actualizada.")
            print("Proceso de refresco de KPIs completado con éxito.")
        except Exception as e:
            print(f"Error durante el refresco de KPIs en Celery: {e}")
        finally:
            await db_service.disconnect()

    asyncio.run(run_refresh())
