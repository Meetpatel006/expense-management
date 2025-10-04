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