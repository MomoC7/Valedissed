from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # App Config
    PROJECT_NAME: str = "Valedissed"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # DB Config (SQLAlchemy - Ya no se usa pero la dejamos opcional)
    DATABASE_URL: Optional[str] = None
    
    # Supabase SDK Config (NUEVAS VARIABLES)
    SUPABASE_URL: str
    SUPABASE_KEY: str
    
    # Security
    SECRET_KEY: str = "development-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 días para mantener la sesión
    
    # Stripe
    STRIPE_API_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    
    # Storage
    STORAGE_URL: Optional[str] = None
    STORAGE_KEY: Optional[str] = None
    
    # Environment
    ENV: str = "development"
    DEBUG: bool = True

    # Cambiamos case_sensitive a False para evitar errores de mayúsculas/minúsculas
    # Añadimos extra="ignore" para que no falle si hay más cosas en el .env
    model_config = SettingsConfigDict(
        env_file=".env", 
        case_sensitive=False, 
        extra="ignore"
    )

settings = Settings()