from sqlalchemy import Column, Numeric, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from app.database import Base, UUIDType

class ExpenseLine(Base):
    __tablename__ = "expense_lines"

    id = Column(UUIDType(), primary_key=True, default=uuid.uuid4)

    # Foreign Key
    expense_id = Column(UUIDType(), ForeignKey("expenses.id"), nullable=False)

    # Line Details
    item_description = Column(String(500), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    expense = relationship("Expense", back_populates="expense_lines")