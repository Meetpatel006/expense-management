from pydantic import BaseModel, EmailStr, UUID4
from typing import Optional
from datetime import datetime
from app.models.user import UserRole

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole

class UserCreate(UserBase):
    manager_id: Optional[UUID4] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[UserRole] = None
    manager_id: Optional[UUID4] = None
    is_active: Optional[bool] = None

class UserResponse(UserBase):
    id: UUID4
    company_id: UUID4
    manager_id: Optional[UUID4]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class UserWithManager(UserResponse):
    manager: Optional[UserResponse] = None