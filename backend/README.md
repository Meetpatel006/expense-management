# FastAPI Backend - Multi-Currency Expense Management System

## Project Overview
Build a production-ready FastAPI backend for an expense management system with multi-level approval workflows, OCR receipt processing, and multi-currency support using SQLite/PostgreSQL database.

---

## Tech Stack
- **Framework**: FastAPI 0.104+
- **Database**: SQLAlchemy 2.0+ with SQLite (development) / PostgreSQL (production)
- **Authentication**: JWT (PyJWT)
- **Password Hashing**: Passlib with bcrypt
- **Email**: FastAPI-Mail or SMTP
- **OCR**: Tesseract OCR (pytesseract) or Google Cloud Vision API
- **Validation**: Pydantic v2
- **Migration**: Alembic
- **CORS**: FastAPI CORS middleware
- **Environment**: python-dotenv

---

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry point
│   ├── config.py               # Configuration settings
│   ├── database.py             # Database connection
│   │
│   ├── models/                 # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── company.py
│   │   ├── expense.py
│   │   ├── approval_rule.py
│   │   └── approval_history.py
│   │
│   ├── schemas/                # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── company.py
│   │   ├── expense.py
│   │   ├── approval_rule.py
│   │   └── auth.py
│   │
│   ├── api/                    # API routes
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── companies.py
│   │   ├── expenses.py
│   │   ├── approval_rules.py
│   │   └── currency.py
│   │
│   ├── services/               # Business logic
│   │   ├── __init__.py
│   │   ├── auth_service.py
│   │   ├── user_service.py
│   │   ├── expense_service.py
│   │   ├── approval_service.py
│   │   ├── currency_service.py
│   │   ├── email_service.py
│   │   └── ocr_service.py
│   │
│   ├── utils/                  # Utilities
│   │   ├── __init__.py
│   │   ├── dependencies.py     # FastAPI dependencies
│   │   ├── security.py         # JWT, password hashing
│   │   └── exceptions.py       # Custom exceptions
│   │
│   └── middleware/             # Custom middleware
│       ├── __init__.py
│       └── error_handler.py
│
├── alembic/                    # Database migrations
│   ├── versions/
│   └── env.py
│
├── tests/                      # Tests
│   ├── __init__.py
│   ├── test_auth.py
│   ├── test_users.py
│   ├── test_expenses.py
│   └── test_approvals.py
│
├── .env                        # Environment variables
├── .env.example
├── requirements.txt
├── alembic.ini
└── README.md
```

---

## Database Models (SQLAlchemy)

### 1. User Model (`app/models/user.py`)

```python
from sqlalchemy import Column, String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from app.database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    EMPLOYEE = "employee"

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.EMPLOYEE)
    is_active = Column(Boolean, default=True)
    
    # Foreign Keys
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("Company", back_populates="users")
    manager = relationship("User", remote_side=[id], backref="subordinates")
    expenses = relationship("Expense", back_populates="employee", foreign_keys="Expense.employee_id")
    approval_rules = relationship("ApprovalRule", back_populates="manager")
```

### 2. Company Model (`app/models/company.py`)

```python
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from app.database import Base

class Company(Base):
    __tablename__ = "companies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    base_currency = Column(String(10), nullable=False)  # ISO code: USD, INR, EUR
    country = Column(String(255), nullable=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    users = relationship("User", back_populates="company")
    expenses = relationship("Expense", back_populates="company")
    approval_rules = relationship("ApprovalRule", back_populates="company")
```

### 3. Expense Model (`app/models/expense.py`)

```python
from sqlalchemy import Column, String, Numeric, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from app.database import Base
import enum

class ExpenseStatus(str, enum.Enum):
    DRAFT = "draft"
    SUBMITTED = "submitted"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"

class ExpenseCategory(str, enum.Enum):
    FOOD = "Food"
    TRAVEL = "Travel"
    ACCOMMODATION = "Accommodation"
    OFFICE_SUPPLIES = "Office Supplies"
    OTHER = "Other"

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign Keys
    employee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    current_approver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approval_rule_id = Column(UUID(as_uuid=True), ForeignKey("approval_rules.id"), nullable=True)
    
    # Expense Details
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(10), nullable=False)
    amount_in_base_currency = Column(Numeric(10, 2), nullable=False)
    category = Column(Enum(ExpenseCategory), nullable=False)
    description = Column(Text, nullable=False)
    expense_date = Column(DateTime, nullable=False)
    receipt_url = Column(String(500), nullable=True)
    paid_by = Column(String(100), nullable=True)
    remarks = Column(Text, nullable=True)
    
    # Status
    status = Column(Enum(ExpenseStatus), default=ExpenseStatus.DRAFT)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)
    
    # Relationships
    employee = relationship("User", foreign_keys=[employee_id], back_populates="expenses")
    company = relationship("Company", back_populates="expenses")
    current_approver = relationship("User", foreign_keys=[current_approver_id])
    approval_rule = relationship("ApprovalRule", back_populates="expenses")
    approval_history = relationship("ApprovalHistory", back_populates="expense", cascade="all, delete-orphan")
    expense_lines = relationship("ExpenseLine", back_populates="expense", cascade="all, delete-orphan")
```

### 4. Approval Rule Model (`app/models/approval_rule.py`)

```python
from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from app.database import Base

class ApprovalRule(Base):
    __tablename__ = "approval_rules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign Keys
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id"), nullable=False)
    manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Rule Details
    rule_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_manager_first_approver = Column(Boolean, default=True)
    is_sequential = Column(Boolean, default=True)  # Sequential vs Parallel
    minimum_approval_percentage = Column(Integer, nullable=True)  # 0-100
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company = relationship("Company", back_populates="approval_rules")
    manager = relationship("User", back_populates="approval_rules")
    rule_approvers = relationship("RuleApprover", back_populates="approval_rule", cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="approval_rule")

class RuleApprover(Base):
    __tablename__ = "rule_approvers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign Keys
    approval_rule_id = Column(UUID(as_uuid=True), ForeignKey("approval_rules.id"), nullable=False)
    approver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Approver Details
    sequence_order = Column(Integer, nullable=False)  # 1, 2, 3...
    is_required = Column(Boolean, default=False)  # Required approver (e.g., CFO)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    approval_rule = relationship("ApprovalRule", back_populates="rule_approvers")
    approver = relationship("User")
```

### 5. Approval History Model (`app/models/approval_history.py`)

```python
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Enum, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from app.database import Base
import enum

class ApprovalAction(str, enum.Enum):
    APPROVED = "approved"
    REJECTED = "rejected"

class ApprovalHistory(Base):
    __tablename__ = "approval_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign Keys
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id"), nullable=False)
    approver_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Approval Details
    action = Column(Enum(ApprovalAction), nullable=False)
    comments = Column(Text, nullable=True)
    sequence_step = Column(Integer, nullable=False)  # Which step in approval flow
    
    # Timestamp
    approved_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    expense = relationship("Expense", back_populates="approval_history")
    approver = relationship("User")
```

### 6. Expense Line Model (for OCR multi-line items)

```python
from sqlalchemy import Column, Numeric, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
from datetime import datetime
from app.database import Base

class ExpenseLine(Base):
    __tablename__ = "expense_lines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Foreign Key
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id"), nullable=False)
    
    # Line Details
    item_description = Column(String(500), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    
    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship
    expense = relationship("Expense", back_populates="expense_lines")
```

---

## Database Configuration (`app/database.py`)

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Database URL
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# Create engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)

# Session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Dependency for database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## Configuration (`app/config.py`)

```python
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # App
    APP_NAME: str = "Expense Management API"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "sqlite:///./expense_management.db"
    # For PostgreSQL: "postgresql://user:password@localhost/dbname"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # CORS
    BACKEND_CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:3001"]
    
    # Email (SMTP)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_EMAIL: str = "noreply@expensemanagement.com"
    EMAILS_FROM_NAME: str = "Expense Management"
    
    # OCR
    OCR_ENGINE: str = "tesseract"  # or "google_vision"
    GOOGLE_VISION_CREDENTIALS: str = ""  # Path to JSON credentials
    
    # External APIs
    CURRENCY_API_BASE_URL: str = "https://api.exchangerate-api.com/v4/latest"
    COUNTRIES_API_URL: str = "https://restcountries.com/v3.1/all"
    
    # File Upload
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 5 * 1024 * 1024  # 5MB
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()

settings = get_settings()
```

---

## Pydantic Schemas

### Auth Schemas (`app/schemas/auth.py`)

```python
from pydantic import BaseModel, EmailStr, validator
from typing import Optional

class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    confirm_password: str
    country: str
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v
```

### User Schemas (`app/schemas/user.py`)

```python
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
```

### Expense Schemas (`app/schemas/expense.py`)

```python
from pydantic import BaseModel, UUID4, validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.models.expense import ExpenseStatus, ExpenseCategory

class ExpenseLineCreate(BaseModel):
    item_description: str
    amount: Decimal

class ExpenseLineResponse(ExpenseLineCreate):
    id: UUID4
    created_at: datetime
    
    class Config:
        from_attributes = True

class ExpenseCreate(BaseModel):
    amount: Decimal
    currency: str
    category: ExpenseCategory
    description: str
    expense_date: datetime
    paid_by: Optional[str] = None
    remarks: Optional[str] = None
    receipt_url: Optional[str] = None
    expense_lines: Optional[List[ExpenseLineCreate]] = None

class ExpenseUpdate(BaseModel):
    amount: Optional[Decimal] = None
    currency: Optional[str] = None
    category: Optional[ExpenseCategory] = None
    description: Optional[str] = None
    expense_date: Optional[datetime] = None
    paid_by: Optional[str] = None
    remarks: Optional[str] = None

class ExpenseResponse(BaseModel):
    id: UUID4
    employee_id: UUID4
    amount: Decimal
    currency: str
    amount_in_base_currency: Decimal
    category: ExpenseCategory
    description: str
    expense_date: datetime
    receipt_url: Optional[str]
    paid_by: Optional[str]
    remarks: Optional[str]
    status: ExpenseStatus
    current_approver_id: Optional[UUID4]
    created_at: datetime
    submitted_at: Optional[datetime]
    
    class Config:
        from_attributes = True

class ExpenseWithDetails(ExpenseResponse):
    employee: dict
    approval_history: List[dict]
    expense_lines: List[ExpenseLineResponse]
```

### Approval Rule Schemas (`app/schemas/approval_rule.py`)

```python
from pydantic import BaseModel, UUID4
from typing import Optional, List

class RuleApproverCreate(BaseModel):
    approver_id: UUID4
    sequence_order: int
    is_required: bool = False

class RuleApproverResponse(RuleApproverCreate):
    id: UUID4
    approver: dict
    
    class Config:
        from_attributes = True

class ApprovalRuleCreate(BaseModel):
    rule_name: str
    description: Optional[str] = None
    manager_id: UUID4
    is_manager_first_approver: bool = True
    is_sequential: bool = True
    minimum_approval_percentage: Optional[int] = None
    approvers: List[RuleApproverCreate]

class ApprovalRuleUpdate(BaseModel):
    rule_name: Optional[str] = None
    description: Optional[str] = None
    is_manager_first_approver: Optional[bool] = None
    is_sequential: Optional[bool] = None
    minimum_approval_percentage: Optional[int] = None

class ApprovalRuleResponse(BaseModel):
    id: UUID4
    company_id: UUID4
    manager_id: UUID4
    rule_name: str
    description: Optional[str]
    is_manager_first_approver: bool
    is_sequential: bool
    minimum_approval_percentage: Optional[int]
    
    class Config:
        from_attributes = True

class ApprovalRuleWithApprovers(ApprovalRuleResponse):
    rule_approvers: List[RuleApproverResponse]
```

---

## API Routes

### Authentication Routes (`app/api/auth.py`)

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import (
    SignupRequest, LoginRequest, TokenResponse,
    ForgotPasswordRequest, ResetPasswordRequest
)
from app.services.auth_service import AuthService
from app.services.user_service import UserService

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    request: SignupRequest,
    db: Session = Depends(get_db)
):
    """
    Admin/Company Signup
    Creates a new company and admin user automatically
    """
    auth_service = AuthService(db)
    return await auth_service.signup(request)

@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    """User login"""
    auth_service = AuthService(db)
    return await auth_service.login(request)

@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """Generate password reset token and send email"""
    auth_service = AuthService(db)
    await auth_service.send_password_reset_email(request.email)
    return {"message": "Password reset link sent to your email"}

@router.post("/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """Reset password using token"""
    auth_service = AuthService(db)
    await auth_service.reset_password(request.token, request.new_password)
    return {"message": "Password reset successfully"}
```

### User Routes (`app/api/users.py`)

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
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
```

### Expense Routes (`app/api/expenses.py`)

```python
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseWithDetails
from app.services.expense_service import ExpenseService
from app.services.ocr_service import OCRService
from app.utils.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/expenses", tags=["Expenses"])

@router.post("", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    expense_data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new expense (draft)"""
    expense_service = ExpenseService(db)
    return await expense_service.create_expense(expense_data, current_user)

@router.get("/my-expenses", response_model=List[ExpenseWithDetails])
async def get_my_expenses(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's expenses"""
    expense_service = ExpenseService(db)
    return await expense_service.get_user_expenses(current_user.id, status)

@router.get("/pending-approvals", response_model=List[ExpenseWithDetails])
async def get_pending_approvals(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get expenses pending current user's approval"""
    expense_service = ExpenseService(db)
    return await expense_service.get_pending_approvals(current_user.id)

@router.get("/{expense_id}", response_model=ExpenseWithDetails)
async def get_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get expense by ID"""
    expense_service = ExpenseService(db)
    return await expense_service.get_expense_by_id(expense_id, current_user)

@router.patch("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: str,
    expense_data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update expense (only if status is draft)"""
    expense_service = ExpenseService(db)
    return await expense_service.update_expense(expense_id, expense_data, current_user)

@router.post("/{expense_id}/submit")
async def submit_expense(
    expense_id: str,
    approval_rule_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submit expense for approval"""
    expense_service = ExpenseService(db)
    await expense_service.submit_expense(expense_id, current_user, approval_rule_id)
    return {"message": "Expense submitted for approval"}

@router.post("/{expense_id}/approve")
async def approve_expense(
    expense_id: str,
    comments: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Approve expense"""
    expense_service = ExpenseService(db)
    await expense_service.approve_expense(expense_id, current_user, comments)
    return {"message": "Expense approved successfully"}

@router.post("/{expense_id}/reject")
async def reject_expense(
    expense_id: str,
    comments: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Reject expense"""
    expense_service = ExpenseService(db)
    await expense_service.reject_expense(expense_id, current_user, comments)
    return {"message": "Expense rejected"}

@router.post("/ocr")
async def extract_receipt_data(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Extract data from receipt using OCR"""
    ocr_service = OCRService(db)
    return await ocr_service.process_receipt(file)

@router.get("/{expense_id}/approval-history")
async def get_approval_history(
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get approval history for expense"""
    expense_service = ExpenseService(db)
    return await expense_service.get_approval_history(expense_id)
```

### Approval Rules Routes (`app/api/approval_rules.py`)

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas.approval_rule import (
    ApprovalRuleCreate, ApprovalRuleUpdate, 
    ApprovalRuleResponse, ApprovalRuleWithApprovers
)
from app.services.approval_service import ApprovalRuleService
from app.utils.dependencies import get_current_user, require_admin
from app.models.user import User

router = APIRouter(prefix="/api/approval-rules", tags=["Approval Rules"])

@router.post("", response_model=ApprovalRuleWithApprovers, status_code=status.HTTP_201_CREATED)
async def create_approval_rule(
    rule_data: ApprovalRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Create approval rule (Admin only)"""
    approval_service = ApprovalRuleService(db)
    return await approval_service.create_rule(rule_data, current_user.company_id)

@router.get("", response_model=List[ApprovalRuleWithApprovers])
async def get_approval_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all approval rules for company"""
    approval_service = ApprovalRuleService(db)
    return await approval_service.get_rules(current_user.company_id)

@router.get("/{rule_id}", response_model=ApprovalRuleWithApprovers)
async def get_approval_rule(
    rule_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get approval rule by ID"""
    approval_service = ApprovalRuleService(db)
    return await approval_service.get_rule_by_id(rule_id, current_user.company_id)

@router.patch("/{rule_id}", response_model=ApprovalRuleResponse)
async def update_approval_rule(
    rule_id: str,
    rule_data: ApprovalRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update approval rule (Admin only)"""
    approval_service = ApprovalRuleService(db)
    return await approval_service.update_rule(rule_id, rule_data, current_user.company_id)

@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_approval_rule(
    rule_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Delete approval rule (Admin only)"""
    approval_service = ApprovalRuleService(db)
    await approval_service.delete_rule(rule_id, current_user.company_id)
    return None
```

### Currency Routes (`app/api/currency.py`)

```python
from fastapi import APIRouter, Depends
from typing import List
from app.services.currency_service import CurrencyService

router = APIRouter(prefix="/api/currency", tags=["Currency"])

@router.get("/countries")
async def get_countries():
    """Get all countries with their currencies"""
    currency_service = CurrencyService()
    return await currency_service.get_countries()

@router.get("/convert")
async def convert_currency(
    from_currency: str,
    to_currency: str,
    amount: float
):
    """Convert currency amount"""
    currency_service = CurrencyService()
    return await currency_service.convert(from_currency, to_currency, amount)

@router.get("/rates/{base_currency}")
async def get_exchange_rates(base_currency: str):
    """Get all exchange rates for base currency"""
    currency_service = CurrencyService()
    return await currency_service.get_rates(base_currency)
```

### Company Routes (`app/api/companies.py`)

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.utils.dependencies import get_current_user, require_admin
from app.models.user import User
from app.models.company import Company

router = APIRouter(prefix="/api/company", tags=["Company"])

@router.get("")
async def get_company(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's company info"""
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    return company

@router.patch("/currency")
async def update_base_currency(
    base_currency: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update company base currency (Admin only)"""
    company = db.query(Company).filter(Company.id == current_user.company_id).first()
    company.base_currency = base_currency
    db.commit()
    db.refresh(company)
    return company
```

---

## Service Layer Implementation

### Auth Service (`app/services/auth_service.py`)

```python
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
                detail="Email already registered"
            )
        
        # Get currency for selected country
        country_data = await self.currency_service.get_country_currency(request.country)
        if not country_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid country selected"
            )
        
        # Create company
        company = Company(
            name=f"{request.name}'s Company",
            base_currency=country_data['currency'],
            country=request.country
        )
        self.db.add(company)
        self.db.flush()
        
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
        
        # Generate token
        access_token = create_access_token(data={"sub": str(user.id)})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "company_id": str(company.id)
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
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )
        
        # Generate token
        access_token = create_access_token(data={"sub": str(user.id)})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "company_id": str(user.company_id)
            }
        }
    
    async def send_password_reset_email(self, email: str):
        """Generate password reset token and send email"""
        user = self.db.query(User).filter(User.email == email).first()
        
        if not user:
            # Don't reveal if user exists or not
            return
        
        # Generate reset token (expires in 1 hour)
        reset_token = create_access_token(
            data={"sub": str(user.id), "type": "password_reset"},
            expires_delta=timedelta(hours=1)
        )
        
        # Send email
        await self.email_service.send_password_reset_email(
            email=user.email,
            name=user.name,
            token=reset_token
        )
    
    async def reset_password(self, token: str, new_password: str):
        """Reset password using token"""
        from app.utils.security import decode_access_token
        
        payload = decode_access_token(token)
        if not payload or payload.get("type") != "password_reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token"
            )
        
        user_id = payload.get("sub")
        user = self.db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update password
        user.password_hash = get_password_hash(new_password)
        self.db.commit()
```

### User Service (`app/services/user_service.py`)

```python
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
        alphabet = string.ascii_letters + string.digits + string.punctuation
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        return password
    
    async def create_user(self, user_data: UserCreate, company_id: UUID):
        """Create new user"""
        # Check if user exists
        existing_user = self.db.query(User).filter(
            User.email == user_data.email,
            User.company_id == company_id
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Check if name exists (as per requirement)
        existing_name = self.db.query(User).filter(
            User.name == user_data.name,
            User.company_id == company_id
        ).first()
        
        if existing_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User with name '{user_data.name}' already exists"
            )
        
        # Validate manager assignment
        if user_data.role == UserRole.EMPLOYEE and not user_data.manager_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee must have an assigned manager"
            )
        
        if user_data.manager_id:
            manager = self.db.query(User).filter(
                User.id == user_data.manager_id,
                User.role == UserRole.MANAGER
            ).first()
            if not manager:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid manager ID or user is not a manager"
                )
        
        # Generate random password
        random_password = self.generate_random_password()
        
        # Create user
        user = User(
            email=user_data.email,
            name=user_data.name,
            role=user_data.role,
            password_hash=get_password_hash(random_password),
            company_id=company_id,
            manager_id=user_data.manager_id
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        # Send credentials via email
        await self.email_service.send_new_user_credentials(
            email=user.email,
            name=user.name,
            password=random_password
        )
        
        return user
    
    async def get_users(self, company_id: UUID, role: Optional[str] = None) -> List[User]:
        """Get all users in company"""
        query = self.db.query(User).filter(User.company_id == company_id)
        
        if role:
            query = query.filter(User.role == role)
        
        return query.all()
    
    async def get_user_by_id(self, user_id: str, company_id: UUID):
        """Get user by ID"""
        user = self.db.query(User).filter(
            User.id == user_id,
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
        if user_data.name is not None:
            user.name = user_data.name
        if user_data.role is not None:
            user.role = user_data.role
        if user_data.manager_id is not None:
            # Validate manager
            if user_data.manager_id == user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User cannot be their own manager"
                )
            user.manager_id = user_data.manager_id
        if user_data.is_active is not None:
            user.is_active = user_data.is_active
        
        self.db.commit()
        self.db.refresh(user)
        return user
    
    async def send_new_password(self, user_id: str, company_id: UUID):
        """Generate new password and send to user"""
        user = await self.get_user_by_id(user_id, company_id)
        
        # Generate new random password
        new_password = self.generate_random_password()
        user.password_hash = get_password_hash(new_password)
        
        self.db.commit()
        
        # Send email
        await self.email_service.send_new_password(
            email=user.email,
            name=user.name,
            password=new_password
        )
    
    async def delete_user(self, user_id: str, company_id: UUID):
        """Delete user"""
        user = await self.get_user_by_id(user_id, company_id)
        self.db.delete(user)
        self.db.commit()
```

### Expense Service (`app/services/expense_service.py`)

```python
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import List, Optional
from datetime import datetime
from app.models.expense import Expense, ExpenseStatus
from app.models.approval_history import ApprovalHistory, ApprovalAction
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseUpdate
from app.services.currency_service import CurrencyService
from app.services.email_service import EmailService
from app.services.approval_service import ApprovalWorkflowService

class ExpenseService:
    def __init__(self, db: Session):
        self.db = db
        self.currency_service = CurrencyService()
        self.email_service = EmailService()
        self.approval_workflow = ApprovalWorkflowService(db)
    
    async def create_expense(self, expense_data: ExpenseCreate, current_user: User):
        """Create new expense in draft status"""
        # Convert to base currency
        company_currency = current_user.company.base_currency
        
        if expense_data.currency != company_currency:
            converted_amount = await self.currency_service.convert(
                expense_data.currency,
                company_currency,
                float(expense_data.amount)
            )
            amount_in_base = converted_amount['converted_amount']
        else:
            amount_in_base = expense_data.amount
        
        # Create expense
        expense = Expense(
            employee_id=current_user.id,
            company_id=current_user.company_id,
            amount=expense_data.amount,
            currency=expense_data.currency,
            amount_in_base_currency=amount_in_base,
            category=expense_data.category,
            description=expense_data.description,
            expense_date=expense_data.expense_date,
            paid_by=expense_data.paid_by,
            remarks=expense_data.remarks,
            receipt_url=expense_data.receipt_url,
            status=ExpenseStatus.DRAFT
        )
        
        self.db.add(expense)
        self.db.commit()
        self.db.refresh(expense)
        
        return expense
    
    async def submit_expense(self, expense_id: str, current_user: User, approval_rule_id: Optional[str] = None):
        """Submit expense for approval"""
        expense = await self.get_expense_by_id(expense_id, current_user)
        
        if expense.status != ExpenseStatus.DRAFT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only draft expenses can be submitted"
            )
        
        # Start approval workflow
        await self.approval_workflow.initiate_approval(expense, approval_rule_id)
        
        expense.status = ExpenseStatus.SUBMITTED
        expense.submitted_at = datetime.utcnow()
        self.db.commit()
    
    async def approve_expense(self, expense_id: str, approver: User, comments: Optional[str] = None):
        """Approve expense"""
        expense = self.db.query(Expense).filter(Expense.id == expense_id).first()
        
        if not expense:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
        
        if expense.current_approver_id != approver.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to approve this expense"
            )
        
        # Process approval
        await self.approval_workflow.process_approval(
            expense=expense,
            approver=approver,
            action=ApprovalAction.APPROVED,
            comments=comments
        )
    
    async def reject_expense(self, expense_id: str, approver: User, comments: str):
        """Reject expense"""
        expense = self.db.query(Expense).filter(Expense.id == expense_id).first()
        
        if not expense:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
        
        if expense.current_approver_id != approver.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to reject this expense"
            )
        
        # Process rejection
        await self.approval_workflow.process_approval(
            expense=expense,
            approver=approver,
            action=ApprovalAction.REJECTED,
            comments=comments
        )
    
    async def get_user_expenses(self, user_id, status_filter: Optional[str] = None):
        """Get user's expenses"""
        query = self.db.query(Expense).filter(Expense.employee_id == user_id)
        
        if status_filter:
            query = query.filter(Expense.status == status_filter)
        
        return query.order_by(Expense.created_at.desc()).all()
    
    async def get_pending_approvals(self, approver_id):
        """Get expenses pending approval for user"""
        return self.db.query(Expense).filter(
            Expense.current_approver_id == approver_id,
            Expense.status == ExpenseStatus.PENDING_APPROVAL
        ).all()
    
    async def get_expense_by_id(self, expense_id: str, current_user: User):
        """Get expense by ID"""
        expense = self.db.query(Expense).filter(Expense.id == expense_id).first()
        
        if not expense:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
        
        # Check access rights
        if (expense.employee_id != current_user.id and 
            expense.current_approver_id != current_user.id and 
            current_user.role != "admin"):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
        
        return expense
    
    async def get_approval_history(self, expense_id: str):
        """Get approval history for expense"""
        return self.db.query(ApprovalHistory).filter(
            ApprovalHistory.expense_id == expense_id
        ).order_by(ApprovalHistory.approved_at).all()
```

### Approval Workflow Service (`app/services/approval_service.py`)

```python
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional
from app.models.expense import Expense, ExpenseStatus
from app.models.approval_rule import ApprovalRule, RuleApprover
from app.models.approval_history import ApprovalHistory, ApprovalAction
from app.models.user import User
from app.services.email_service import EmailService

class ApprovalWorkflowService:
    def __init__(self, db: Session):
        self.db = db
        self.email_service = EmailService()
    
    async def initiate_approval(self, expense: Expense, approval_rule_id: Optional[str] = None):
        """Start approval workflow for expense"""
        # Get approval rule
        if approval_rule_id:
            rule = self.db.query(ApprovalRule).filter(ApprovalRule.id == approval_rule_id).first()
        else:
            # Use default rule or employee's manager
            rule = self.db.query(ApprovalRule).filter(
                ApprovalRule.company_id == expense.company_id
            ).first()
        
        if not rule:
            # No rule found, assign to employee's manager directly
            employee = self.db.query(User).filter(User.id == expense.employee_id).first()
            if not employee.manager_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="No approval rule found and employee has no assigned manager"
                )
            
            expense.current_approver_id = employee.manager_id
            expense.status = ExpenseStatus.PENDING_APPROVAL
            self.db.commit()
            
            # Send notification
            await self.email_service.send_expense_status_notification(
                expense=expense,
                status="approved"
            )
    
    async def _process_parallel_approval(self, expense: Expense, rule: ApprovalRule):
        """Process parallel approval with percentage rule"""
        # Count total approvals
        total_approvals = self.db.query(ApprovalHistory).filter(
            ApprovalHistory.expense_id == expense.id,
            ApprovalHistory.action == ApprovalAction.APPROVED
        ).count()
        
        # Get total approvers
        total_approvers = self.db.query(RuleApprover).filter(
            RuleApprover.approval_rule_id == rule.id
        ).count()
        
        # Check if required approver approved (e.g., CFO)
        required_approvers = self.db.query(RuleApprover).filter(
            RuleApprover.approval_rule_id == rule.id,
            RuleApprover.is_required == True
        ).all()
        
        for req_approver in required_approvers:
            approved = self.db.query(ApprovalHistory).filter(
                ApprovalHistory.expense_id == expense.id,
                ApprovalHistory.approver_id == req_approver.approver_id,
                ApprovalHistory.action == ApprovalAction.APPROVED
            ).first()
            
            if approved:
                # Required approver approved - auto approve
                expense.status = ExpenseStatus.APPROVED
                expense.current_approver_id = None
                self.db.commit()
                
                await self.email_service.send_expense_status_notification(
                    expense=expense,
                    status="approved"
                )
                return
        
        # Check percentage threshold
        if rule.minimum_approval_percentage:
            approval_percentage = (total_approvals / total_approvers) * 100
            
            if approval_percentage >= rule.minimum_approval_percentage:
                expense.status = ExpenseStatus.APPROVED
                expense.current_approver_id = None
                self.db.commit()
                
                await self.email_service.send_expense_status_notification(
                    expense=expense,
                    status="approved"
                )

class ApprovalRuleService:
    def __init__(self, db: Session):
        self.db = db
    
    async def create_rule(self, rule_data, company_id):
        """Create approval rule"""
        rule = ApprovalRule(
            company_id=company_id,
            manager_id=rule_data.manager_id,
            rule_name=rule_data.rule_name,
            description=rule_data.description,
            is_manager_first_approver=rule_data.is_manager_first_approver,
            is_sequential=rule_data.is_sequential,
            minimum_approval_percentage=rule_data.minimum_approval_percentage
        )
        
        self.db.add(rule)
        self.db.flush()
        
        # Add approvers
        for approver_data in rule_data.approvers:
            approver = RuleApprover(
                approval_rule_id=rule.id,
                approver_id=approver_data.approver_id,
                sequence_order=approver_data.sequence_order,
                is_required=approver_data.is_required
            )
            self.db.add(approver)
        
        self.db.commit()
        self.db.refresh(rule)
        return rule
    
    async def get_rules(self, company_id):
        """Get all approval rules"""
        return self.db.query(ApprovalRule).filter(
            ApprovalRule.company_id == company_id
        ).all()
    
    async def get_rule_by_id(self, rule_id: str, company_id):
        """Get approval rule by ID"""
        rule = self.db.query(ApprovalRule).filter(
            ApprovalRule.id == rule_id,
            ApprovalRule.company_id == company_id
        ).first()
        
        if not rule:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Approval rule not found"
            )
        
        return rule
    
    async def update_rule(self, rule_id: str, rule_data, company_id):
        """Update approval rule"""
        rule = await self.get_rule_by_id(rule_id, company_id)
        
        if rule_data.rule_name is not None:
            rule.rule_name = rule_data.rule_name
        if rule_data.description is not None:
            rule.description = rule_data.description
        if rule_data.is_manager_first_approver is not None:
            rule.is_manager_first_approver = rule_data.is_manager_first_approver
        if rule_data.is_sequential is not None:
            rule.is_sequential = rule_data.is_sequential
        if rule_data.minimum_approval_percentage is not None:
            rule.minimum_approval_percentage = rule_data.minimum_approval_percentage
        
        self.db.commit()
        self.db.refresh(rule)
        return rule
    
    async def delete_rule(self, rule_id: str, company_id):
        """Delete approval rule"""
        rule = await self.get_rule_by_id(rule_id, company_id)
        self.db.delete(rule)
        self.db.commit()
```

### Currency Service (`app/services/currency_service.py`)

```python
import httpx
from fastapi import HTTPException
from typing import Dict, Optional
from app.config import settings

class CurrencyService:
    def __init__(self):
        self.countries_api_url = settings.COUNTRIES_API_URL
        self.currency_api_url = settings.CURRENCY_API_BASE_URL
    
    async def get_countries(self):
        """Get all countries with their currencies"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(self.countries_api_url)
                response.raise_for_status()
                countries_data = response.json()
                
                # Format data
                formatted_countries = []
                for country in countries_data:
                    if 'currencies' in country and country['currencies']:
                        currency_code = list(country['currencies'].keys())[0]
                        currency_info = country['currencies'][currency_code]
                        
                        formatted_countries.append({
                            'name': country['name']['common'],
                            'currency_code': currency_code,
                            'currency_name': currency_info.get('name', ''),
                            'currency_symbol': currency_info.get('symbol', '')
                        })
                
                return formatted_countries
            
            except httpx.HTTPError as e:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to fetch countries data"
                )
    
    async def get_country_currency(self, country_name: str) -> Optional[Dict]:
        """Get currency for specific country"""
        countries = await self.get_countries()
        
        for country in countries:
            if country['name'].lower() == country_name.lower():
                return {
                    'currency': country['currency_code'],
                    'symbol': country['currency_symbol']
                }
        
        return None
    
    async def get_rates(self, base_currency: str):
        """Get exchange rates for base currency"""
        async with httpx.AsyncClient() as client:
            try:
                url = f"{self.currency_api_url}/{base_currency}"
                response = await client.get(url)
                response.raise_for_status()
                return response.json()
            
            except httpx.HTTPError:
                raise HTTPException(
                    status_code=500,
                    detail="Failed to fetch exchange rates"
                )
    
    async def convert(self, from_currency: str, to_currency: str, amount: float):
        """Convert currency amount"""
        rates_data = await self.get_rates(from_currency)
        
        if to_currency not in rates_data['rates']:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid currency code: {to_currency}"
            )
        
        rate = rates_data['rates'][to_currency]
        converted_amount = amount * rate
        
        return {
            'from_currency': from_currency,
            'to_currency': to_currency,
            'original_amount': amount,
            'converted_amount': round(converted_amount, 2),
            'exchange_rate': rate
        }
```

### Email Service (`app/services/email_service.py`)

```python
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from app.config import settings
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.conf = ConnectionConfig(
            MAIL_USERNAME=settings.SMTP_USER,
            MAIL_PASSWORD=settings.SMTP_PASSWORD,
            MAIL_FROM=settings.EMAILS_FROM_EMAIL,
            MAIL_PORT=settings.SMTP_PORT,
            MAIL_SERVER=settings.SMTP_HOST,
            MAIL_FROM_NAME=settings.EMAILS_FROM_NAME,
            MAIL_STARTTLS=True,
            MAIL_SSL_TLS=False,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True
        )
    
    async def send_email(self, email: str, subject: str, body: str):
        """Send email helper"""
        try:
            message = MessageSchema(
                subject=subject,
                recipients=[email],
                body=body,
                subtype="html"
            )
            
            fm = FastMail(self.conf)
            await fm.send_message(message)
            logger.info(f"Email sent to {email}")
        
        except Exception as e:
            logger.error(f"Failed to send email to {email}: {str(e)}")
            # Don't raise exception - email failures shouldn't break the flow
    
    async def send_new_user_credentials(self, email: str, name: str, password: str):
        """Send credentials to new user"""
        subject = "Welcome to Expense Management"
        body = f"""
        <html>
            <body>
                <h2>Welcome {name}!</h2>
                <p>Your account has been created. Here are your login credentials:</p>
                <p><strong>Email:</strong> {email}</p>
                <p><strong>Password:</strong> {password}</p>
                <p>Please change your password after first login.</p>
                <p>Login at: <a href="http://localhost:3000">http://localhost:3000</a></p>
            </body>
        </html>
        """
        await self.send_email(email, subject, body)
    
    async def send_new_password(self, email: str, name: str, password: str):
        """Send new password to user"""
        subject = "Your New Password"
        body = f"""
        <html>
            <body>
                <h2>Hello {name},</h2>
                <p>Your password has been reset. Here is your new password:</p>
                <p><strong>Password:</strong> {password}</p>
                <p>Please change your password after login.</p>
            </body>
        </html>
        """
        await self.send_email(email, subject, body)
    
    async def send_password_reset_email(self, email: str, name: str, token: str):
        """Send password reset link"""
        reset_link = f"http://localhost:3000/reset-password?token={token}"
        subject = "Reset Your Password"
        body = f"""
        <html>
            <body>
                <h2>Hello {name},</h2>
                <p>We received a request to reset your password.</p>
                <p>Click the link below to reset your password:</p>
                <p><a href="{reset_link}">{reset_link}</a></p>
                <p>This link will expire in 1 hour.</p>
                <p>If you didn't request this, please ignore this email.</p>
            </body>
        </html>
        """
        await self.send_email(email, subject, body)
    
    async def send_approval_notification(self, expense, approver_id):
        """Send notification to approver"""
        from app.models.user import User
        from app.database import SessionLocal
        
        db = SessionLocal()
        approver = db.query(User).filter(User.id == approver_id).first()
        employee = db.query(User).filter(User.id == expense.employee_id).first()
        db.close()
        
        if not approver:
            return
        
        subject = "New Expense Awaiting Your Approval"
        body = f"""
        <html>
            <body>
                <h2>Hello {approver.name},</h2>
                <p>A new expense requires your approval.</p>
                <p><strong>Employee:</strong> {employee.name}</p>
                <p><strong>Description:</strong> {expense.description}</p>
                <p><strong>Amount:</strong> {expense.amount} {expense.currency}</p>
                <p><strong>Category:</strong> {expense.category}</p>
                <p><strong>Date:</strong> {expense.expense_date.strftime('%Y-%m-%d')}</p>
                <p>Please login to review and approve/reject this expense.</p>
                <p><a href="http://localhost:3000/dashboard/manager/approvals">View Pending Approvals</a></p>
            </body>
        </html>
        """
        await self.send_email(approver.email, subject, body)
    
    async def send_expense_status_notification(self, expense, status: str):
        """Send status notification to employee"""
        from app.models.user import User
        from app.database import SessionLocal
        
        db = SessionLocal()
        employee = db.query(User).filter(User.id == expense.employee_id).first()
        db.close()
        
        if not employee:
            return
        
        subject = f"Expense {status.title()}"
        body = f"""
        <html>
            <body>
                <h2>Hello {employee.name},</h2>
                <p>Your expense has been <strong>{status}</strong>.</p>
                <p><strong>Description:</strong> {expense.description}</p>
                <p><strong>Amount:</strong> {expense.amount} {expense.currency}</p>
                <p><strong>Category:</strong> {expense.category}</p>
                <p>Login to view details.</p>
                <p><a href="http://localhost:3000/dashboard/employee/expenses">View My Expenses</a></p>
            </body>
        </html>
        """
        await self.send_email(employee.email, subject, body)
```

### OCR Service (`app/services/ocr_service.py`)

```python
from fastapi import UploadFile, HTTPException
import pytesseract
from PIL import Image
import io
import re
from datetime import datetime
from typing import Dict, List
import logging

logger = logging.getLogger(__name__)

class OCRService:
    def __init__(self, db):
        self.db = db
    
    async def process_receipt(self, file: UploadFile) -> Dict:
        """Process receipt image and extract data"""
        try:
            # Read image
            contents = await file.read()
            image = Image.open(io.BytesIO(contents))
            
            # Extract text using Tesseract
            text = pytesseract.image_to_string(image)
            
            # Parse extracted text
            parsed_data = self._parse_receipt_text(text)
            
            return parsed_data
        
        except Exception as e:
            logger.error(f"OCR processing failed: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="Failed to process receipt image"
            )
    
    def _parse_receipt_text(self, text: str) -> Dict:
        """Parse receipt text to extract structured data"""
        data = {
            'amount': None,
            'currency': 'USD',
            'date': None,
            'vendor': None,
            'category': 'Other',
            'line_items': []
        }
        
        # Extract amount (looks for patterns like $123.45, 123.45, etc.)
        amount_pattern = r'[\$€£]?\s*(\d+[.,]\d{2})'
        amounts = re.findall(amount_pattern, text)
        if amounts:
            # Take the largest amount (usually the total)
            data['amount'] = max([float(a.replace(',', '.')) for a in amounts])
        
        # Extract date (various formats)
        date_patterns = [
            r'(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
            r'(\d{4}[-/]\d{1,2}[-/]\d{1,2})',
            r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}'
        ]
        
        for pattern in date_patterns:
            date_match = re.search(pattern, text, re.IGNORECASE)
            if date_match:
                try:
                    data['date'] = self._parse_date(date_match.group(1))
                    break
                except:
                    continue
        
        # Extract vendor name (usually first line or after "vendor"/"merchant")
        lines = text.split('\n')
        for line in lines[:5]:  # Check first 5 lines
            if line.strip() and len(line.strip()) > 3:
                data['vendor'] = line.strip()
                break
        
        # Categorize based on keywords
        text_lower = text.lower()
        if any(word in text_lower for word in ['restaurant', 'cafe', 'food', 'pizza', 'burger']):
            data['category'] = 'Food'
        elif any(word in text_lower for word in ['hotel', 'inn', 'resort', 'accommodation']):
            data['category'] = 'Accommodation'
        elif any(word in text_lower for word in ['taxi', 'uber', 'lyft', 'transport', 'airline']):
            data['category'] = 'Travel'
        elif any(word in text_lower for word in ['office', 'supplies', 'staples', 'depot']):
            data['category'] = 'Office Supplies'
        
        # Extract line items (simplified)
        item_pattern = r'([A-Za-z\s]+)\s+[\$€£]?\s*(\d+[.,]\d{2})'
        items = re.findall(item_pattern, text)
        
        for item in items[:10]:  # Limit to 10 items
            data['line_items'].append({
                'description': item[0].strip(),
                'amount': float(item[1].replace(',', '.'))
            })
        
        return data
    
    def _parse_date(self, date_str: str) -> str:
        """Parse date string to ISO format"""
        date_formats = [
            '%m/%d/%Y', '%d/%m/%Y', '%Y-%m-%d',
            '%m-%d-%Y', '%d-%m-%Y', '%Y/%m/%d',
            '%B %d, %Y', '%b %d, %Y'
        ]
        
        for fmt in date_formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.strftime('%Y-%m-%d')
            except ValueError:
                continue
        
        return datetime.now().strftime('%Y-%m-%d')
```

---

## Security Utilities (`app/utils/security.py`)

```python
from datetime import datetime, timedelta
from typing import Optional, Dict
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from app.config import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash password"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    return encoded_jwt

def decode_access_token(token: str) -> Optional[Dict]:
    """Decode JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
```

### Dependencies (`app/utils/dependencies.py`)

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.utils.security import decode_access_token

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    token = credentials.credentials
    payload = decode_access_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    return user

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Require admin role"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

async def require_manager(current_user: User = Depends(get_current_user)) -> User:
    """Require manager or admin role"""
    if current_user.role not in [UserRole.MANAGER, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager access required"
        )
    return current_user
```

---

## Main Application (`app/main.py`)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.api import auth, users, expenses, approval_rules, currency, companies

# Create tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(expenses.router)
app.include_router(approval_rules.router)
app.include_router(currency.router)
app.include_router(companies.router)

@app.get("/")
async def root():
    return {"message": "Expense Management API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

---

## Requirements.txt

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
alembic==1.12.1
pydantic==2.5.0
pydantic-settings==2.1.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
httpx==0.25.1
fastapi-mail==1.4.1
pytesseract==0.3.10
Pillow==10.1.0
python-dotenv==1.0.0
psycopg2-binary==2.9.9  # For PostgreSQL
```

---

## Environment Variables (`.env.example`)

```env
# App
DEBUG=True

# Database
DATABASE_URL=sqlite:///./expense_management.db
# DATABASE_URL=postgresql://user:password@localhost/expense_db

# JWT
SECRET_KEY=your-super-secret-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:3000"]

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAILS_FROM_EMAIL=noreply@expensemanagement.com
EMAILS_FROM_NAME=Expense Management

# External APIs
CURRENCY_API_BASE_URL=https://api.exchangerate-api.com/v4/latest
COUNTRIES_API_URL=https://restcountries.com/v3.1/all?fields=name,currencies

# File Upload
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=5242880
```

---

## Database Migration with Alembic

### Initialize Alembic
```bash
alembic init alembic
```

### Create First Migration
```bash
alembic revision --autogenerate -m "Initial migration"
```

### Apply Migration
```bash
alembic upgrade head
```

---

## Running the Application

```bash
# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

---

## API Testing (Postman/cURL Examples)

### 1. Signup
```bash
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123!",
    "confirm_password": "SecurePass123!",
    "country": "United States"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

### 3. Create User (Admin)
```bash
curl -X POST http://localhost:8000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "email": "employee@example.com",
    "name": "Jane Employee",
    "role": "employee",
    "manager_id": "manager-uuid-here"
  }'
```

### 4. Create Expense
```bash
curl -X POST http://localhost:8000/api/expenses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "amount": 567.00,
    "currency": "EUR",
    "category": "Food",
    "description": "Client dinner",
    "expense_date": "2025-10-10T00:00:00",
    "paid_by": "Cash"
  }'
```

### 5. Submit Expense
```bash
curl -X POST http://localhost:8000/api/expenses/{expense_id}/submit \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6. Approve Expense
```bash
curl -X POST http://localhost:8000/api/expenses/{expense_id}/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "comments": "Approved"
  }'
```

---

This comprehensive FastAPI backend implementation provides all the functionality needed for your expense management system with proper security, error handling, and scalability!.