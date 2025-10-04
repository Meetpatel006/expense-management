from pydantic import BaseModel, UUID4, validator
from typing import Optional, List, Any
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

class UserInExpense(BaseModel):
    id: UUID4
    name: str
    email: str
    
    class Config:
        from_attributes = True

class ApprovalHistoryInExpense(BaseModel):
    id: UUID4
    approver_id: UUID4
    action: str
    comments: Optional[str]
    approved_at: datetime
    sequence_step: int
    
    class Config:
        from_attributes = True

class ExpenseWithDetails(ExpenseResponse):
    employee: UserInExpense
    approval_history: List[ApprovalHistoryInExpense]
    expense_lines: List[ExpenseLineResponse]
    
    class Config:
        from_attributes = True