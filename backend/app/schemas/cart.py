from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class CartItemAdd(BaseModel):
    product_id: UUID
    quantity: int = 1


class CartItemUpdate(BaseModel):
    quantity: int


class CartItemOut(BaseModel):
    id: UUID
    user_id: UUID
    product_id: UUID
    quantity: int
    added_at: datetime
