from pydantic import BaseModel, UUID4
from typing import Optional
from datetime import datetime

class CompanyBase(BaseModel):
    name: str
    base_currency: str
    country: str

class CompanyCreate(CompanyBase):
    pass

class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    base_currency: Optional[str] = None
    country: Optional[str] = None

class CompanyResponse(CompanyBase):
    id: UUID4
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True