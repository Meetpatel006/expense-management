from sqlalchemy import Column, String, Numeric, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.database import Base, UUIDType
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

    id = Column(UUIDType(), primary_key=True, default=uuid.uuid4)

    # Foreign Keys
    employee_id = Column(UUIDType(), ForeignKey("users.id"), nullable=False)
    company_id = Column(UUIDType(), ForeignKey("companies.id"), nullable=False)
    current_approver_id = Column(UUIDType(), ForeignKey("users.id"), nullable=True)
    approval_rule_id = Column(UUIDType(), ForeignKey("approval_rules.id"), nullable=True)

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