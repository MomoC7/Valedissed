from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID
from datetime import datetime

# 1. Base: Lo que todos los schemas de usuario tienen en común
class UserBase(BaseModel):
    username: str
    full_name: str
    role: Optional[str] = "cliente"
    bio: Optional[str] = None

# 2. Create: Lo que pides cuando alguien se registra
class UserCreate(UserBase):
    id: UUID # El ID que viene de la autenticación de Supabase

# 3. Update: Lo que el usuario puede cambiar de su perfil
class UserUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    gender: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    status: Optional[str] = None
    # Campos de partner
    role: Optional[str] = None
    phone: Optional[str] = None
    business_name: Optional[str] = None
    partner_type: Optional[str] = None
    category: Optional[str] = None
    years_experience: Optional[int] = None
    operation_zone: Optional[str] = None

# 4. Out: Lo que el API responde
class UserOut(UserBase):
    id: UUID
    avatar_url: Optional[str] = None
    gender: Optional[str] = None
    status: Optional[str] = "active"
    created_at: datetime
    # Campos de partner
    phone: Optional[str] = None
    business_name: Optional[str] = None
    partner_type: Optional[str] = None
    category: Optional[str] = None
    years_experience: Optional[int] = None
    operation_zone: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)