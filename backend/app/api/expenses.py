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