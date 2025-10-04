# Expense Management System

A flexible and powerful expense management system with multi-level approval flows, threshold-based rules, and transparent reimbursement processes.

## Features

- ✅ **Multi-Level Approval Flows**: Support for complex approval hierarchies with multiple levels
- ✅ **Threshold-Based Rules**: Define approval requirements based on expense amounts
- ✅ **Flexible Approval Rules**: Create custom rules based on amount, category, department, and employee level
- ✅ **Rule Priority System**: Higher priority rules are evaluated first
- ✅ **Role-Based Approvals**: Different approver roles at each level (Manager, Director, VP, CFO, etc.)
- ✅ **Transparent Process**: Complete approval history and status tracking
- ✅ **Type-Safe**: Written in TypeScript with full type definitions
- ✅ **Well-Tested**: Comprehensive test coverage

## Problem Solved

Companies often struggle with manual expense reimbursement processes that are:
- **Time-consuming**: Manual routing and paper-based approvals
- **Error-prone**: Lack of validation and consistency
- **Opaque**: No visibility into approval status and bottlenecks

This system provides:
- **Automated Routing**: Expenses are automatically routed based on predefined rules
- **Clear Approval Flows**: Multi-level approvals with transparent status
- **Flexible Configuration**: Easy to adapt rules to your organization's needs

## Installation

```bash
npm install
```

## Building

```bash
npm run build
```

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Quick Start

```typescript
import { 
  ExpenseCategory,
  DEFAULT_APPROVAL_RULES,
  ApprovalRuleEngine,
  ApprovalFlowService,
  ExpenseService 
} from 'expense-management';

// Initialize the system
const ruleEngine = new ApprovalRuleEngine(DEFAULT_APPROVAL_RULES);
const approvalFlowService = new ApprovalFlowService(ruleEngine);
const expenseService = new ExpenseService(approvalFlowService);

// Create an expense
const expense = expenseService.createExpense(
  'emp-001',
  'John Doe',
  75,
  'USD',
  ExpenseCategory.MEALS,
  'Team lunch',
  new Date()
);

// Submit for approval
const { flowId } = expenseService.submitExpense(expense.id);

// Approve the expense
expenseService.processExpenseApproval(
  expense.id,
  'mgr-001',
  'Sarah Manager',
  'MANAGER',
  'APPROVED',
  'Approved - within budget'
);

// Check status
console.log(expenseService.getExpense(expense.id)?.status); // "APPROVED"
```

## Running the Example

See the system in action with multiple scenarios:

```bash
npm run example
```

This will demonstrate:
- Small expense with single-level approval
- Large expense with multi-level approval
- Very large expense with three-level approval
- Rejected expense
- Travel expense with special approval rules

## Default Approval Rules

The system comes with 5 pre-configured approval rules:

### 1. Small Expenses (< $100)
- **Level 1**: Manager approval (1 required)

### 2. Medium Expenses ($100 - $1,000)
- **Level 1**: Manager approval (1 required)

### 3. Large Expenses ($1,000 - $5,000)
- **Level 1**: Manager approval (1 required)
- **Level 2**: Director approval (1 required)

### 4. Very Large Expenses (≥ $5,000)
- **Level 1**: Manager approval (1 required)
- **Level 2**: Director approval (1 required)
- **Level 3**: VP or CFO approval (1 required)

### 5. Travel Expenses Special Rule (> $500)
- **Level 1**: Manager approval (1 required)
- **Level 2**: Travel Coordinator approval (1 required)

## Creating Custom Approval Rules

```typescript
import { ApprovalRule } from 'expense-management';

const customRule: ApprovalRule = {
  id: 'custom-rule-1',
  name: 'Equipment Purchases',
  description: 'Special rule for equipment purchases over $2000',
  conditions: [
    {
      type: 'CATEGORY',
      operator: 'EQUALS',
      value: 'EQUIPMENT'
    },
    {
      type: 'AMOUNT',
      operator: 'GREATER_THAN',
      value: 2000
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
      approverRoles: ['IT_DIRECTOR'],
      requiredApprovers: 1
    },
    {
      level: 3,
      approverRoles: ['CFO'],
      requiredApprovers: 1
    }
  ],
  priority: 10, // Higher priority
  active: true
};

ruleEngine.addRule(customRule);
```

## API Reference

### ExpenseService

Main service for managing expenses:

- `createExpense(employeeId, employeeName, amount, currency, category, description, date, attachments?)`: Create a new expense
- `submitExpense(expenseId)`: Submit an expense for approval
- `processExpenseApproval(expenseId, approverId, approverName, approverRole, action, comments?)`: Approve or reject an expense
- `getExpense(expenseId)`: Get expense details
- `getExpensesByEmployee(employeeId)`: Get all expenses for an employee
- `getPendingExpensesForApprover(approverRole)`: Get expenses pending approval for a role
- `cancelExpense(expenseId, employeeId)`: Cancel an expense

### ApprovalFlowService

Manages approval workflows:

- `createApprovalFlow(expense)`: Create an approval flow for an expense
- `processApproval(flowId, approverId, approverName, approverRole, action, comments?)`: Process an approval action
- `getFlow(flowId)`: Get approval flow details
- `getFlowByExpenseId(expenseId)`: Get flow by expense ID
- `getPendingApprovalsForRole(approverRole)`: Get pending approvals for a role
- `getApprovalSummary(flowId)`: Get approval status summary
- `canApprove(flowId, approverRole, approverId)`: Check if user can approve

### ApprovalRuleEngine

Evaluates approval rules:

- `findMatchingRule(expense)`: Find the matching rule for an expense
- `getRules()`: Get all active rules
- `addRule(rule)`: Add a new rule
- `updateRule(ruleId, updates)`: Update an existing rule
- `deactivateRule(ruleId)`: Deactivate a rule

## Condition Types

- `AMOUNT`: Expense amount conditions
- `CATEGORY`: Expense category conditions
- `DEPARTMENT`: Department-based conditions
- `EMPLOYEE_LEVEL`: Employee level conditions

## Operators

- `EQUALS`: Exact match
- `GREATER_THAN`: Greater than
- `LESS_THAN`: Less than
- `GREATER_THAN_OR_EQUAL`: Greater than or equal to
- `LESS_THAN_OR_EQUAL`: Less than or equal to
- `IN`: Value in list

## Expense Categories

- `TRAVEL`: Travel expenses
- `MEALS`: Meal expenses
- `OFFICE_SUPPLIES`: Office supply expenses
- `EQUIPMENT`: Equipment purchases
- `TRAINING`: Training and development
- `OTHER`: Other expenses

## Expense Statuses

- `DRAFT`: Not yet submitted
- `PENDING`: Awaiting approval
- `APPROVED`: Fully approved
- `REJECTED`: Rejected by an approver
- `CANCELLED`: Cancelled by submitter

## Architecture

The system consists of three main layers:

1. **Models**: Data structures for expenses, rules, and flows
2. **Services**: Business logic for rule evaluation and workflow management
3. **Configuration**: Default rules and customization options

### Key Components

- **ApprovalRuleEngine**: Evaluates rules and finds matching approval flows
- **ApprovalFlowService**: Manages multi-level approval workflows
- **ExpenseService**: Handles expense lifecycle and approval integration

## Benefits

- **Reduced Processing Time**: Automated routing eliminates manual expense tracking
- **Improved Accuracy**: Rule-based validation ensures consistent application of policies
- **Enhanced Transparency**: Real-time status tracking and complete audit trail
- **Flexible Configuration**: Easy to adapt to changing business requirements
- **Scalable**: Handles complex multi-level approval hierarchies

## License

ISC
