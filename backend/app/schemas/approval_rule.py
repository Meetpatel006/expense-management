from pydantic import BaseModel, UUID4
from typing import Optional, List

class RuleApproverCreate(BaseModel):
    approver_id: UUID4
    sequence_order: int
    is_required: bool = False

class ApproverInRule(BaseModel):
    id: UUID4
    name: str
    email: str
    
    class Config:
        from_attributes = True

class RuleApproverResponse(RuleApproverCreate):
    id: UUID4
    approver: ApproverInRule

    class Config:
        from_attributes = True

class ApprovalRuleCreate(BaseModel):
    rule_name: str
    description: Optional[str] = None
    manager_id: UUID4
    is_manager_first_approver: bool = True
    is_sequential: bool = True
    minimum_approval_percentage: Optional[int] = None
    approvers: List[RuleApproverCreate]

class ApprovalRuleUpdate(BaseModel):
    rule_name: Optional[str] = None
    description: Optional[str] = None
    is_manager_first_approver: Optional[bool] = None
    is_sequential: Optional[bool] = None
    minimum_approval_percentage: Optional[int] = None

class ApprovalRuleResponse(BaseModel):
    id: UUID4
    company_id: UUID4
    manager_id: UUID4
    rule_name: str
    description: Optional[str]
    is_manager_first_approver: bool
    is_sequential: bool
    minimum_approval_percentage: Optional[int]

    class Config:
        from_attributes = True

class ApprovalRuleWithApprovers(ApprovalRuleResponse):
    rule_approvers: List[RuleApproverResponse]