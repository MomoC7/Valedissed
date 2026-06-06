from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class CompanyBase(BaseModel):
    business_name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    operation_zone: Optional[str] = None
    partner_type: Optional[str] = None
    product_categories: Optional[List[str]] = None
    service_categories: Optional[List[str]] = None
    is_verified: Optional[bool] = False


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    business_name: Optional[str] = None
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    operation_zone: Optional[str] = None
    partner_type: Optional[str] = None
    product_categories: Optional[List[str]] = None
    service_categories: Optional[List[str]] = None
    is_verified: Optional[bool] = None


class CompanyOut(CompanyBase):
    id: UUID
    owner_id: UUID
    created_at: datetime
    updated_at: datetime
