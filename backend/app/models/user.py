from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
import uuid

# Ya no usamos SQLAlchemy (Base, Column, etc.) porque el SDK
# se comunica directamente por HTTPS (Puerto 443).

class UserProfile(BaseModel):
    """
    Representación del modelo 'profiles' en Supabase.
    Este modelo sirve para validar y documentar los datos que 
    recibimos de la base de datos.
    """
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str = "cliente"
    bio: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)

    class Config:
        # Esto permite que Pydantic lea los datos aunque vengan 
        # como diccionarios desde el SDK de Supabase.
        from_attributes = True