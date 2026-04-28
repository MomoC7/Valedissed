from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # App Config
    PROJECT_NAME: str = "Valedissed"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # DB Config
    DATABASE_URL: Optional[str] = None
    
    # Security
    SECRET_KEY: str = "development-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Stripe
    STRIPE_API_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None
    
    # Storage
    STORAGE_URL: Optional[str] = None
    STORAGE_KEY: Optional[str] = None
    
    # Environment
    ENV: str = "development"
    DEBUG: bool = True

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

settings = Settings()
