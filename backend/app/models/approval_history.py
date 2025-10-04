from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Enum, Integer
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.database import Base, UUIDType
import enum

class ApprovalAction(str, enum.Enum):
    APPROVED = "approved"
    REJECTED = "rejected"

class ApprovalHistory(Base):
    __tablename__ = "approval_history"

    id = Column(UUIDType(), primary_key=True, default=uuid.uuid4)

    # Foreign Keys
    expense_id = Column(UUIDType(), ForeignKey("expenses.id"), nullable=False)
    approver_id = Column(UUIDType(), ForeignKey("users.id"), nullable=False)

    # Approval Details
    action = Column(Enum(ApprovalAction), nullable=False)
    comments = Column(Text, nullable=True)
    sequence_step = Column(Integer, nullable=False)  # Which step in approval flow

    # Timestamp
    approved_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    expense = relationship("Expense", back_populates="approval_history")
    approver = relationship("User")