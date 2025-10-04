/**
 * Expense status enum
 */
export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

/**
 * Expense category enum
 */
export enum ExpenseCategory {
  TRAVEL = 'TRAVEL',
  MEALS = 'MEALS',
  OFFICE_SUPPLIES = 'OFFICE_SUPPLIES',
  EQUIPMENT = 'EQUIPMENT',
  TRAINING = 'TRAINING',
  OTHER = 'OTHER'
}

/**
 * Expense model representing a single expense submission
 */
export interface Expense {
  id: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  description: string;
  date: Date;
  status: ExpenseStatus;
  submittedAt?: Date;
  approvalHistory: ApprovalRecord[];
  attachments?: string[];
}

/**
 * Record of a single approval action
 */
export interface ApprovalRecord {
  approverId: string;
  approverName: string;
  approverLevel: number;
  action: 'APPROVED' | 'REJECTED';
  timestamp: Date;
  comments?: string;
}
