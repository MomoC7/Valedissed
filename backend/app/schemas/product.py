from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class ProductBase(BaseModel):
    name: str
    description: Optional[str] = None
    price: float
    sale_price: Optional[float] = None
    stock: int = 0
    category: Optional[str] = None
    size: Optional[str] = None
    color: Optional[str] = None
    condition: Optional[str] = "nuevo"


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    sale_price: Optional[float] = None
    stock: Optional[int] = None
    category: Optional[str] = None
    size: Optional[str] = None
    color: Optional[str] = None
    condition: Optional[str] = None
    cover_image_url: Optional[str] = None
    images_urls: Optional[List[str]] = None
    is_active: Optional[bool] = None


class ProductOut(ProductBase):
    id: UUID
    seller_id: UUID
    cover_image_url: Optional[str] = None
    images_urls: Optional[List[str]] = None
    is_active: bool = True
    created_at: datetime
