from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from uuid import UUID

class WallRequestItemCreate(BaseModel):
    product_id: UUID
    quantity: int = 1

class WallRequestCreate(BaseModel):
    title: Optional[str] = None
    message: Optional[str] = None
    items: List[WallRequestItemCreate]

class WallRequestItemResponse(BaseModel):
    id: UUID
    product_id: UUID
    quantity: int
    product_name: Optional[str] = None
    product_price: Optional[float] = None
    product_cover_image: Optional[str] = None

class WallRequestResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: Optional[str] = None
    message: Optional[str] = None
    is_completed: bool
    expires_at: datetime
    created_at: datetime
    updated_at: datetime
    # Usuario info
    user_username: Optional[str] = None
    user_avatar: Optional[str] = None
    user_age: Optional[int] = None
    user_gender: Optional[str] = None
    # Items
    items: List[WallRequestItemResponse] = []
    # Total
    total_items: int = 0
    total_price: float = 0.0

class WallRequestUpdate(BaseModel):
    is_completed: Optional[bool] = None
    message: Optional[str] = None
