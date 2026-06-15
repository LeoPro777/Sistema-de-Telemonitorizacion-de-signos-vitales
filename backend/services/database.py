"""
database.py — Conexión asíncrona a MongoDB (Motor) y Redis
"""

import logging
from motor.motor_asyncio import AsyncIOMotorClient
from redis.asyncio import Redis
from backend.config import settings

logger = logging.getLogger("app.database")

class DatabaseService:
    def __init__(self):
        self.mongo_client: AsyncIOMotorClient = None
        self.raw_db = None
        self.db = None
        self.redis: Redis = None

    async def connect(self):
        """
        Inicializa las conexiones a MongoDB y Redis
        """
        # MongoDB
        logger.info(f"Conectando a MongoDB en: {settings.MONGO_URI}")
        self.mongo_client = AsyncIOMotorClient(settings.MONGO_URI, tz_aware=True)
        self.raw_db = self.mongo_client[settings.MONGO_DB]
        
        # Envolver la base de datos para interceptar mutaciones de auditoría
        from backend.services.audit import WrappedDatabase
        self.db = WrappedDatabase(self.raw_db, self)

        # Crear índice compuesto inmutable en la colección audit_logs
        try:
            await self.raw_db.audit_logs.create_index([("log_type", 1), ("criticality", 1), ("timestamp", -1)])
            logger.info("Índice compuesto en audit_logs inicializado.")
        except Exception as e:
            logger.warning(f"Fallo al crear índice compuesto en audit_logs: {e}")
        
        # Redis
        logger.info(f"Conectando a Redis en: {settings.REDIS_URL}")
        self.redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
        
        # Probar conexiones
        try:
            await self.mongo_client.admin.command('ping')
            logger.info("Conexión a MongoDB exitosa.")
        except Exception as e:
            logger.error(f"Error al conectar a MongoDB: {e}")
            raise e

        try:
            await self.redis.ping()
            logger.info("Conexión a Redis exitosa.")
        except Exception as e:
            logger.warning(f"Error al conectar a Redis (Bypass offline): {e}")
            self.redis = None

    async def disconnect(self):
        """
        Cierra las conexiones a MongoDB y Redis
        """
        if self.mongo_client:
            self.mongo_client.close()
            logger.info("Conexión a MongoDB cerrada.")
        if self.redis:
            await self.redis.close()
            logger.info("Conexión a Redis cerrada.")

# Instancia global del servicio de base de datos
db_service = DatabaseService()
