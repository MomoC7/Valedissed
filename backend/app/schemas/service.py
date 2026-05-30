from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class ServiceBase(BaseModel):
    title: str
    description: Optional[str] = None
    price: float
    duration_minutes: int
    category: Optional[str] = None
    modality: Optional[str] = "estudio"
    requirements: Optional[str] = None


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    duration_minutes: Optional[int] = None
    category: Optional[str] = None
    modality: Optional[str] = None
    requirements: Optional[str] = None
    cover_image_url: Optional[str] = None
    portfolio_images: Optional[List[str]] = None
    is_active: Optional[bool] = None


class ServiceOut(ServiceBase):
    id: UUID
    provider_id: UUID
    cover_image_url: Optional[str] = None
    portfolio_images: Optional[List[str]] = None
    is_active: bool = True
    created_at: datetime
