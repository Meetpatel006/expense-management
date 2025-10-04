/**
 * Approval flow instance for a specific expense
 */
export interface ApprovalFlow {
  id: string;
  expenseId: string;
  ruleId: string;
  currentLevel: number;
  totalLevels: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  steps: ApprovalStep[];
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Single step in the approval flow
 */
export interface ApprovalStep {
  level: number;
  approverRoles: string[];
  requiredApprovers: number;
  approvals: StepApproval[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Individual approval action within a step
 */
export interface StepApproval {
  approverId: string;
  approverName: string;
  approverRole: string;
  action: 'APPROVED' | 'REJECTED';
  timestamp: Date;
  comments?: string;
}
