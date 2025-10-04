from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional
from uuid import UUID
import secrets
import string
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate
from app.utils.security import get_password_hash
from app.services.email_service import EmailService

class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.email_service = EmailService()

    def generate_random_password(self, length: int = 12) -> str:
        """Generate secure random password"""
        characters = string.ascii_letters + string.digits + string.punctuation
        password = ''.join(secrets.choice(characters) for _ in range(length))
        return password

    async def create_user(self, user_data: UserCreate, company_id: UUID):
        """Create new user"""
        # Check if email already exists
        existing_user = self.db.query(User).filter(User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )

        # Generate random password
        password = self.generate_random_password()

        # Create user
        user = User(
            email=user_data.email,
            password_hash=get_password_hash(password),
            name=user_data.name,
            role=user_data.role,
            company_id=company_id,
            manager_id=user_data.manager_id
        )

        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        # Send welcome email with credentials
        await self.email_service.send_new_user_credentials(
            user.email, user.name, password
        )

        return user

    async def get_users(self, company_id: UUID, role: Optional[str] = None) -> List[User]:
        """Get all users in company"""
        query = self.db.query(User).filter(User.company_id == company_id)

        if role:
            try:
                user_role = UserRole(role)
                query = query.filter(User.role == user_role)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid role"
                )

        return query.order_by(User.created_at).all()

    async def get_user_by_id(self, user_id: str, company_id: UUID):
        """Get user by ID"""
        try:
            uuid_user_id = UUID(user_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user ID"
            )

        user = self.db.query(User).filter(
            User.id == uuid_user_id,
            User.company_id == company_id
        ).first()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return user

    async def update_user(self, user_id: str, user_data: UserUpdate, company_id: UUID):
        """Update user"""
        user = await self.get_user_by_id(user_id, company_id)

        # Update fields
        for field, value in user_data.dict(exclude_unset=True).items():
            setattr(user, field, value)

        self.db.commit()
        self.db.refresh(user)
        return user

    async def send_new_password(self, user_id: str, company_id: UUID):
        """Generate new password and send to user"""
        user = await self.get_user_by_id(user_id, company_id)

        # Generate new password
        new_password = self.generate_random_password()

        # Update password
        user.password_hash = get_password_hash(new_password)

        self.db.commit()

        # Send email
        await self.email_service.send_new_password(
            user.email, user.name, new_password
        )

    async def delete_user(self, user_id: str, company_id: UUID):
        """Delete user"""
        user = await self.get_user_by_id(user_id, company_id)

        # Check if user has subordinates
        subordinates = self.db.query(User).filter(User.manager_id == user.id).count()
        if subordinates > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete user with subordinates. Reassign subordinates first."
            )

        self.db.delete(user)
        self.db.commit()