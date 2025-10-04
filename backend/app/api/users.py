from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserWithManager
from app.services.user_service import UserService
from app.utils.dependencies import get_current_user, require_admin
from app.models.user import User

router = APIRouter(prefix="/api/users", tags=["Users"])

@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create new user (Admin only)"""
    user_service = UserService(db)
    return await user_service.create_user(user_data, current_user.company_id)

@router.get("", response_model=List[UserWithManager])
async def get_users(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all users in company"""
    user_service = UserService(db)
    return await user_service.get_users(current_user.company_id, role)

@router.get("/{user_id}", response_model=UserWithManager)
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user by ID"""
    user_service = UserService(db)
    return await user_service.get_user_by_id(user_id, current_user.company_id)

@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update user (Admin only)"""
    user_service = UserService(db)
    return await user_service.update_user(user_id, user_data, current_user.company_id)

@router.post("/{user_id}/send-password")
async def send_password(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Generate and send new password to user"""
    user_service = UserService(db)
    await user_service.send_new_password(user_id, current_user.company_id)
    return {"message": "Password sent to user's email"}

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete user (Admin only)"""
    user_service = UserService(db)
    await user_service.delete_user(user_id, current_user.company_id)
    return None