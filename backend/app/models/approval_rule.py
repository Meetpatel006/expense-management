from sqlalchemy import Column, String, Boolean, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.database import Base, UUIDType

class ApprovalRule(Base):
    __tablename__ = "approval_rules"

    id = Column(UUIDType(), primary_key=True, default=uuid.uuid4)

    # Foreign Keys
    company_id = Column(UUIDType(), ForeignKey("companies.id"), nullable=False)
    manager_id = Column(UUIDType(), ForeignKey("users.id"), nullable=False)

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

    id = Column(UUIDType(), primary_key=True, default=uuid.uuid4)

    # Foreign Keys
    approval_rule_id = Column(UUIDType(), ForeignKey("approval_rules.id"), nullable=False)
    approver_id = Column(UUIDType(), ForeignKey("users.id"), nullable=False)

    # Approver Details
    sequence_order = Column(Integer, nullable=False)  # 1, 2, 3...
    is_required = Column(Boolean, default=False)  # Required approver (e.g., CFO)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    approval_rule = relationship("ApprovalRule", back_populates="rule_approvers")
    approver = relationship("User")