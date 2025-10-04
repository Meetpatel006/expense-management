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
        from uuid import UUID

        # Find appropriate approval rule
        if approval_rule_id:
            try:
                uuid_rule_id = UUID(approval_rule_id)
                rule = self.db.query(ApprovalRule).filter(
                    ApprovalRule.id == uuid_rule_id,
                    ApprovalRule.company_id == expense.company_id
                ).first()
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid approval rule ID"
                )
        else:
            # Use default rule or first available rule
            rule = self.db.query(ApprovalRule).filter(
                ApprovalRule.company_id == expense.company_id
            ).first()

        if not rule:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No approval rule found for this company"
            )

        expense.approval_rule_id = rule.id

        if rule.is_sequential:
            await self._process_sequential_approval(expense, rule)
        else:
            await self._process_parallel_approval(expense, rule)

    async def _process_sequential_approval(self, expense: Expense, rule: ApprovalRule):
        """Process sequential approval"""
        # Get first approver
        first_approver = self.db.query(RuleApprover).filter(
            RuleApprover.approval_rule_id == rule.id
        ).order_by(RuleApprover.sequence_order).first()

        if first_approver:
            expense.current_approver_id = first_approver.approver_id
            expense.status = ExpenseStatus.PENDING_APPROVAL

            # Send notification
            await self.email_service.send_approval_notification(expense, first_approver.approver_id)

    async def _process_parallel_approval(self, expense: Expense, rule: ApprovalRule):
        """Process parallel approval with percentage rule"""
        # For parallel approval, set status to pending and notify all approvers
        expense.status = ExpenseStatus.PENDING_APPROVAL

        approvers = self.db.query(RuleApprover).filter(
            RuleApprover.approval_rule_id == rule.id
        ).all()

        for approver in approvers:
            # Send notification to each approver
            await self.email_service.send_approval_notification(expense, approver.approver_id)

    async def process_approval(self, expense: Expense, approver: User, action: ApprovalAction, comments: Optional[str] = None):
        """Process approval/rejection"""
        rule = expense.approval_rule

        if rule.is_sequential:
            await self._process_sequential_step(expense, approver, action, comments)
        else:
            await self._process_parallel_step(expense, approver, action, comments)

    async def _process_sequential_step(self, expense: Expense, approver: User, action: ApprovalAction, comments: Optional[str] = None):
        """Process sequential approval step"""
        if action == ApprovalAction.REJECTED:
            expense.status = ExpenseStatus.REJECTED
            return

        # Get next approver
        current_approver = self.db.query(RuleApprover).filter(
            RuleApprover.approval_rule_id == expense.approval_rule_id,
            RuleApprover.approver_id == approver.id
        ).first()

        if not current_approver:
            return

        next_approver = self.db.query(RuleApprover).filter(
            RuleApprover.approval_rule_id == expense.approval_rule_id,
            RuleApprover.sequence_order > current_approver.sequence_order
        ).order_by(RuleApprover.sequence_order).first()

        if next_approver:
            expense.current_approver_id = next_approver.approver_id
            # Send notification
            await self.email_service.send_approval_notification(expense, next_approver.approver_id)
        else:
            # Approval complete
            expense.status = ExpenseStatus.APPROVED
            expense.current_approver_id = None
            await self.email_service.send_expense_status_notification(expense, "approved")

    async def _process_parallel_step(self, expense: Expense, approver: User, action: ApprovalAction, comments: Optional[str] = None):
        """Process parallel approval step"""
        # For simplicity, approve if any approver approves
        # In production, implement percentage-based logic
        if action == ApprovalAction.APPROVED:
            expense.status = ExpenseStatus.APPROVED
            expense.current_approver_id = None
            await self.email_service.send_expense_status_notification(expense, "approved")
        else:
            expense.status = ExpenseStatus.REJECTED
            await self.email_service.send_expense_status_notification(expense, "rejected")

class ApprovalRuleService:
    def __init__(self, db: Session):
        self.db = db

    async def create_rule(self, rule_data, company_id):
        """Create approval rule"""
        from uuid import UUID

        # Create rule
        rule = ApprovalRule(
            company_id=company_id,
            rule_name=rule_data.rule_name,
            description=rule_data.description,
            manager_id=rule_data.manager_id,
            is_manager_first_approver=rule_data.is_manager_first_approver,
            is_sequential=rule_data.is_sequential,
            minimum_approval_percentage=rule_data.minimum_approval_percentage
        )

        self.db.add(rule)
        self.db.flush()  # Get rule ID

        # Create rule approvers
        for approver_data in rule_data.approvers:
            rule_approver = RuleApprover(
                approval_rule_id=rule.id,
                approver_id=approver_data.approver_id,
                sequence_order=approver_data.sequence_order,
                is_required=approver_data.is_required
            )
            self.db.add(rule_approver)

        self.db.commit()
        self.db.refresh(rule)
        return rule

    async def get_rules(self, company_id):
        """Get all approval rules"""
        return self.db.query(ApprovalRule).filter(
            ApprovalRule.company_id == company_id
        ).order_by(ApprovalRule.created_at).all()

    async def get_rule_by_id(self, rule_id: str, company_id):
        """Get approval rule by ID"""
        from uuid import UUID

        try:
            uuid_rule_id = UUID(rule_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid rule ID"
            )

        rule = self.db.query(ApprovalRule).filter(
            ApprovalRule.id == uuid_rule_id,
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

        # Update fields
        for field, value in rule_data.dict(exclude_unset=True).items():
            setattr(rule, field, value)

        self.db.commit()
        self.db.refresh(rule)
        return rule

    async def delete_rule(self, rule_id: str, company_id):
        """Delete approval rule"""
        rule = await self.get_rule_by_id(rule_id, company_id)

        self.db.delete(rule)
        self.db.commit()