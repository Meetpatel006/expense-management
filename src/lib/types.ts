export interface User {
  id: string
  name: string
  email: string
  role: "admin" | "manager" | "employee"
  managerId?: string
  companyId: string
  password?: string
}

export interface Company {
  id: string
  name: string
  baseCurrency: string
  country: string
}

export interface ApprovalHistory {
  id: string
  expenseId: string
  approverId: string
  action: "approved" | "rejected"
  comments?: string
  approvedAt: string
  sequenceStep: number
}

export interface Expense {
  id: string
  employeeId: string
  amount: number
  currency: string
  amountInBaseCurrency: number
  category: string
  description: string
  expenseDate: string
  receiptUrl?: string
  status: "draft" | "submitted" | "pending_approval" | "approved" | "rejected"
  currentApproverId?: string
  approvalRuleId?: string
  remarks?: string
  paidBy?: string
  approvalHistory?: ApprovalHistory[]
  // UI helpers
  __ownerName?: string
  __baseCurrency?: string
}

export interface RuleApprover {
  id: string
  approverId: string
  sequenceOrder: number
  isRequired: boolean
}

export interface ApprovalRule {
  id: string
  ruleName: string
  description?: string
  managerId?: string
  isManagerFirstApprover: boolean
  isSequential: boolean
  minimumApprovalPercentage?: number // 0-100
  approvers: RuleApprover[]
}
