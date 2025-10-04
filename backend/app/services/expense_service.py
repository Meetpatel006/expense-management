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
        # Convert currency to base currency
        company = current_user.company
        converted_amount = await self.currency_service.convert(
            expense_data.currency,
            company.base_currency,
            float(expense_data.amount)
        )

        # Create expense
        expense = Expense(
            employee_id=current_user.id,
            company_id=current_user.company_id,
            amount=expense_data.amount,
            currency=expense_data.currency,
            amount_in_base_currency=converted_amount,
            category=expense_data.category,
            description=expense_data.description,
            expense_date=expense_data.expense_date,
            paid_by=expense_data.paid_by,
            remarks=expense_data.remarks,
            receipt_url=expense_data.receipt_url
        )

        self.db.add(expense)
        self.db.flush()  # Get expense ID for expense lines

        # Create expense lines if provided
        if expense_data.expense_lines:
            from app.models.expense_line import ExpenseLine
            for line_data in expense_data.expense_lines:
                expense_line = ExpenseLine(
                    expense_id=expense.id,
                    item_description=line_data.item_description,
                    amount=line_data.amount
                )
                self.db.add(expense_line)

        self.db.commit()
        self.db.refresh(expense)
        return expense

    async def submit_expense(self, expense_id: str, current_user: User, approval_rule_id: Optional[str] = None):
        """Submit expense for approval"""
        from uuid import UUID

        try:
            uuid_expense_id = UUID(expense_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid expense ID"
            )

        expense = self.db.query(Expense).filter(
            Expense.id == uuid_expense_id,
            Expense.employee_id == current_user.id
        ).first()

        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found"
            )

        if expense.status != ExpenseStatus.DRAFT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only draft expenses can be submitted"
            )

        # Update status and submitted time
        expense.status = ExpenseStatus.SUBMITTED
        expense.submitted_at = datetime.utcnow()

        # Start approval workflow
        await self.approval_workflow.initiate_approval(expense, approval_rule_id)

        self.db.commit()

    async def approve_expense(self, expense_id: str, approver: User, comments: Optional[str] = None):
        """Approve expense"""
        from uuid import UUID

        try:
            uuid_expense_id = UUID(expense_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid expense ID"
            )

        expense = self.db.query(Expense).filter(Expense.id == uuid_expense_id).first()
        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found"
            )

        if expense.current_approver_id != approver.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to approve this expense"
            )

        # Get current sequence step
        current_step = self.db.query(ApprovalHistory).filter(
            ApprovalHistory.expense_id == expense.id
        ).count() + 1
        
        # Create approval history
        approval_history = ApprovalHistory(
            expense_id=expense.id,
            approver_id=approver.id,
            action=ApprovalAction.APPROVED,
            comments=comments,
            sequence_step=current_step
        )
        self.db.add(approval_history)

        # Check if approval is complete
        await self.approval_workflow.process_approval(expense, approver, ApprovalAction.APPROVED, comments)

        self.db.commit()

    async def reject_expense(self, expense_id: str, approver: User, comments: str):
        """Reject expense"""
        from uuid import UUID

        try:
            uuid_expense_id = UUID(expense_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid expense ID"
            )

        expense = self.db.query(Expense).filter(Expense.id == uuid_expense_id).first()
        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found"
            )

        if expense.current_approver_id != approver.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to reject this expense"
            )

        # Update expense status
        expense.status = ExpenseStatus.REJECTED

        # Get current sequence step
        current_step = self.db.query(ApprovalHistory).filter(
            ApprovalHistory.expense_id == expense.id
        ).count() + 1

        # Create approval history
        approval_history = ApprovalHistory(
            expense_id=expense.id,
            approver_id=approver.id,
            action=ApprovalAction.REJECTED,
            comments=comments,
            sequence_step=current_step
        )
        self.db.add(approval_history)

        self.db.commit()

        # Send notification
        await self.email_service.send_expense_status_notification(expense, "rejected")

    async def get_user_expenses(self, user_id, status_filter: Optional[str] = None):
        """Get user's expenses"""
        query = self.db.query(Expense).filter(Expense.employee_id == user_id)

        if status_filter:
            try:
                expense_status = ExpenseStatus(status_filter)
                query = query.filter(Expense.status == expense_status)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid status"
                )

        return query.order_by(Expense.created_at.desc()).all()

    async def get_pending_approvals(self, approver_id):
        """Get expenses pending approval for user"""
        return self.db.query(Expense).filter(
            Expense.current_approver_id == approver_id,
            Expense.status == ExpenseStatus.PENDING_APPROVAL
        ).all()

    async def get_expense_by_id(self, expense_id: str, current_user: User):
        """Get expense by ID"""
        from uuid import UUID

        try:
            uuid_expense_id = UUID(expense_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid expense ID"
            )

        expense = self.db.query(Expense).filter(Expense.id == uuid_expense_id).first()
        if not expense:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expense not found"
            )

        # Check if user has access to this expense
        if (expense.employee_id != current_user.id and
            expense.current_approver_id != current_user.id and
            current_user.role.name != "ADMIN"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        return expense

    async def get_approval_history(self, expense_id: str):
        """Get approval history for expense"""
        from uuid import UUID

        try:
            uuid_expense_id = UUID(expense_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid expense ID"
            )

        return self.db.query(ApprovalHistory).filter(
            ApprovalHistory.expense_id == uuid_expense_id
        ).order_by(ApprovalHistory.approved_at).all()