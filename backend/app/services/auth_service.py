from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from app.models.user import User, UserRole
from app.models.company import Company
from app.schemas.auth import SignupRequest, LoginRequest
from app.utils.security import get_password_hash, verify_password, create_access_token
from app.services.email_service import EmailService
from app.services.currency_service import CurrencyService
import httpx

class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.email_service = EmailService()
        self.currency_service = CurrencyService()

    async def signup(self, request: SignupRequest):
        """Admin/Company signup"""
        # Check if user already exists
        existing_user = self.db.query(User).filter(User.email == request.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )

        # Get currency for country
        try:
            currency_info = await self.currency_service.get_country_currency(request.country)
            if not currency_info:
                # Fallback to USD for unknown countries
                currency_code = "USD"
            else:
                currency_code = currency_info['currency']
        except Exception:
            # Fallback to USD if API fails (useful for testing)
            currency_code = "USD"

        # Create company
        company = Company(
            name=f"{request.name}'s Company",
            base_currency=currency_code,
            country=request.country
        )
        self.db.add(company)
        self.db.flush()  # Get company ID

        # Create admin user
        user = User(
            email=request.email,
            password_hash=get_password_hash(request.password),
            name=request.name,
            role=UserRole.ADMIN,
            company_id=company.id
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        # Create access token
        access_token = create_access_token(data={"sub": str(user.id)})

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "role": user.role.value,
                "company_id": str(user.company_id)
            }
        }

    async def login(self, request: LoginRequest):
        """User login"""
        user = self.db.query(User).filter(User.email == request.email).first()
        if not user or not verify_password(request.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account is deactivated"
            )

        access_token = create_access_token(data={"sub": str(user.id)})

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "role": user.role.value,
                "company_id": str(user.company_id)
            }
        }

    async def send_password_reset_email(self, email: str):
        """Generate password reset token and send email"""
        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            # Don't reveal if email exists or not
            return

        # Generate reset token (simplified - in production use proper token generation)
        reset_token = create_access_token(
            data={"sub": str(user.id), "type": "reset"},
            expires_delta=timedelta(hours=1)
        )

        # Send email
        await self.email_service.send_password_reset_email(
            user.email, user.name, reset_token
        )

    async def reset_password(self, token: str, new_password: str):
        """Reset password using token"""
        from app.utils.security import decode_access_token

        payload = decode_access_token(token)
        if not payload or payload.get("type") != "reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )

        user_id = payload.get("sub")
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset token"
            )

        user.password_hash = get_password_hash(new_password)
        self.db.commit()