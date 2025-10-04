from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.database import Base, UUIDType

class Company(Base):
    __tablename__ = "companies"

    id = Column(UUIDType(), primary_key=True, default=uuid.uuid4)
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