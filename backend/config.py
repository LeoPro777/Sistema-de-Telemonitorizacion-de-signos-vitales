"""
config.py — Variables de entorno y conexiones (MongoDB / Redis)
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # MongoDB
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "telemonitorizacion"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # App
    SECRET_KEY: str = "changeme"
    DEBUG: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
