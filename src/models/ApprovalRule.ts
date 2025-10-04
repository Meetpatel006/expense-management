import { ExpenseCategory } from './Expense';

/**
 * Defines an approval rule based on thresholds and conditions
 */
export interface ApprovalRule {
  id: string;
  name: string;
  description: string;
  conditions: ApprovalCondition[];
  approvalLevels: ApprovalLevel[];
  priority: number; // Higher priority rules are evaluated first
  active: boolean;
}

/**
 * Condition that must be met for a rule to apply
 */
export interface ApprovalCondition {
  type: 'AMOUNT' | 'CATEGORY' | 'DEPARTMENT' | 'EMPLOYEE_LEVEL';
  operator: 'EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'GREATER_THAN_OR_EQUAL' | 'LESS_THAN_OR_EQUAL' | 'IN';
  value: string | number | string[];
}

/**
 * Single level in the approval hierarchy
 */
export interface ApprovalLevel {
  level: number;
  approverRoles: string[]; // e.g., ['MANAGER', 'DIRECTOR']
  requiredApprovers: number; // Number of approvers needed at this level
  autoApprove?: boolean; // If true, this level is auto-approved under certain conditions
  autoApproveThreshold?: number; // Auto-approve if amount is below this threshold
}

/**
 * Pre-defined approval rule templates
 */
export const DEFAULT_APPROVAL_RULES: ApprovalRule[] = [
  {
    id: 'rule-1',
    name: 'Small Expenses (< $100)',
    description: 'Single manager approval for expenses under $100',
    conditions: [
      {
        type: 'AMOUNT',
        operator: 'LESS_THAN',
        value: 100
      }
    ],
    approvalLevels: [
      {
        level: 1,
        approverRoles: ['MANAGER'],
        requiredApprovers: 1
      }
    ],
    priority: 1,
    active: true
  },
  {
    id: 'rule-2',
    name: 'Medium Expenses ($100 - $1000)',
    description: 'Manager approval for expenses between $100 and $1000',
    conditions: [
      {
        type: 'AMOUNT',
        operator: 'GREATER_THAN_OR_EQUAL',
        value: 100
      },
      {
        type: 'AMOUNT',
        operator: 'LESS_THAN',
        value: 1000
      }
    ],
    approvalLevels: [
      {
        level: 1,
        approverRoles: ['MANAGER'],
        requiredApprovers: 1
      }
    ],
    priority: 2,
    active: true
  },
  {
    id: 'rule-3',
    name: 'Large Expenses ($1000 - $5000)',
    description: 'Manager and Director approval for expenses between $1000 and $5000',
    conditions: [
      {
        type: 'AMOUNT',
        operator: 'GREATER_THAN_OR_EQUAL',
        value: 1000
      },
      {
        type: 'AMOUNT',
        operator: 'LESS_THAN',
        value: 5000
      }
    ],
    approvalLevels: [
      {
        level: 1,
        approverRoles: ['MANAGER'],
        requiredApprovers: 1
      },
      {
        level: 2,
        approverRoles: ['DIRECTOR'],
        requiredApprovers: 1
      }
    ],
    priority: 3,
    active: true
  },
  {
    id: 'rule-4',
    name: 'Very Large Expenses (>= $5000)',
    description: 'Multi-level approval (Manager, Director, VP) for expenses over $5000',
    conditions: [
      {
        type: 'AMOUNT',
        operator: 'GREATER_THAN_OR_EQUAL',
        value: 5000
      }
    ],
    approvalLevels: [
      {
        level: 1,
        approverRoles: ['MANAGER'],
        requiredApprovers: 1
      },
      {
        level: 2,
        approverRoles: ['DIRECTOR'],
        requiredApprovers: 1
      },
      {
        level: 3,
        approverRoles: ['VP', 'CFO'],
        requiredApprovers: 1
      }
    ],
    priority: 4,
    active: true
  },
  {
    id: 'rule-5',
    name: 'Travel Expenses Special Rule',
    description: 'Special approval flow for travel expenses over $500',
    conditions: [
      {
        type: 'CATEGORY',
        operator: 'EQUALS',
        value: 'TRAVEL'
      },
      {
        type: 'AMOUNT',
        operator: 'GREATER_THAN',
        value: 500
      }
    ],
    approvalLevels: [
      {
        level: 1,
        approverRoles: ['MANAGER'],
        requiredApprovers: 1
      },
      {
        level: 2,
        approverRoles: ['TRAVEL_COORDINATOR'],
        requiredApprovers: 1
      }
    ],
    priority: 5,
    active: true
  }
];
