# Usage Guide

## Getting Started

This guide will walk you through common scenarios and best practices for using the Expense Management System.

## Basic Workflow

### 1. System Initialization

```typescript
import { 
  DEFAULT_APPROVAL_RULES,
  ApprovalRuleEngine,
  ApprovalFlowService,
  ExpenseService 
} from 'expense-management';

// Initialize the rule engine with default rules
const ruleEngine = new ApprovalRuleEngine(DEFAULT_APPROVAL_RULES);

// Create the approval flow service
const approvalFlowService = new ApprovalFlowService(ruleEngine);

// Create the expense service
const expenseService = new ExpenseService(approvalFlowService);
```

### 2. Creating an Expense

```typescript
import { ExpenseCategory } from 'expense-management';

const expense = expenseService.createExpense(
  'emp-123',                    // Employee ID
  'John Doe',                   // Employee name
  150.00,                       // Amount
  'USD',                        // Currency
  ExpenseCategory.MEALS,        // Category
  'Client dinner',              // Description
  new Date(),                   // Expense date
  ['receipt1.pdf']              // Optional attachments
);

console.log(`Expense created: ${expense.id}`);
```

### 3. Submitting for Approval

```typescript
const { expense, flowId } = expenseService.submitExpense(expense.id);

console.log(`Expense submitted with flow ID: ${flowId}`);
console.log(`Status: ${expense.status}`); // "PENDING"

// Get approval summary
const summary = approvalFlowService.getApprovalSummary(flowId);
console.log(`Total approval levels: ${summary?.totalLevels}`);
console.log(`Current level: ${summary?.currentLevel}`);
```

### 4. Approving an Expense

```typescript
// Manager approves
const approvedExpense = expenseService.processExpenseApproval(
  expense.id,
  'mgr-456',              // Approver ID
  'Sarah Manager',        // Approver name
  'MANAGER',              // Approver role
  'APPROVED',             // Action
  'Looks good!'           // Optional comments
);

console.log(`Status: ${approvedExpense.status}`);
```

### 5. Checking Approval Status

```typescript
// Check if an expense is fully approved
const currentExpense = expenseService.getExpense(expense.id);
if (currentExpense?.status === 'APPROVED') {
  console.log('Expense is fully approved!');
}

// Check approval history
currentExpense?.approvalHistory.forEach(record => {
  console.log(`${record.approverName} (${record.action}) at level ${record.approverLevel}`);
  if (record.comments) {
    console.log(`  Comments: ${record.comments}`);
  }
});
```

## Common Scenarios

### Scenario 1: Small Expense (<$100)

```typescript
// Create a small expense
const smallExpense = expenseService.createExpense(
  'emp-001', 'Alice Smith', 45.00, 'USD',
  ExpenseCategory.OFFICE_SUPPLIES, 'Notebooks and pens', new Date()
);

// Submit and get flow
const { flowId } = expenseService.submitExpense(smallExpense.id);

// Check required approvals
const summary = approvalFlowService.getApprovalSummary(flowId);
console.log(`Requires ${summary?.totalLevels} level(s) of approval`); // 1

// Manager approval is sufficient
expenseService.processExpenseApproval(
  smallExpense.id, 'mgr-001', 'Manager One', 'MANAGER', 'APPROVED'
);

// Status is now APPROVED
console.log(expenseService.getExpense(smallExpense.id)?.status); // "APPROVED"
```

### Scenario 2: Large Expense Requiring Multiple Approvals

```typescript
// Create a large expense
const largeExpense = expenseService.createExpense(
  'emp-002', 'Bob Jones', 3500.00, 'USD',
  ExpenseCategory.EQUIPMENT, 'New laptop', new Date()
);

// Submit for approval
const { flowId } = expenseService.submitExpense(largeExpense.id);
const summary = approvalFlowService.getApprovalSummary(flowId);
console.log(`Requires ${summary?.totalLevels} levels`); // 2

// Level 1: Manager approval
expenseService.processExpenseApproval(
  largeExpense.id, 'mgr-001', 'Manager One', 'MANAGER', 'APPROVED'
);

// Check if more approvals needed
const updatedSummary = approvalFlowService.getApprovalSummary(flowId);
console.log(`Current level: ${updatedSummary?.currentLevel}`); // 2

// Level 2: Director approval
expenseService.processExpenseApproval(
  largeExpense.id, 'dir-001', 'Director One', 'DIRECTOR', 'APPROVED'
);

// Now fully approved
console.log(expenseService.getExpense(largeExpense.id)?.status); // "APPROVED"
```

### Scenario 3: Rejecting an Expense

```typescript
const expense = expenseService.createExpense(
  'emp-003', 'Carol White', 500.00, 'USD',
  ExpenseCategory.OTHER, 'Personal item', new Date()
);

const { flowId } = expenseService.submitExpense(expense.id);

// Manager rejects (workflow stops immediately)
expenseService.processExpenseApproval(
  expense.id,
  'mgr-001',
  'Manager One',
  'MANAGER',
  'REJECTED',
  'This does not comply with company policy'
);

console.log(expenseService.getExpense(expense.id)?.status); // "REJECTED"
```

### Scenario 4: Cancelling an Expense

```typescript
const expense = expenseService.createExpense(
  'emp-004', 'Dave Brown', 200.00, 'USD',
  ExpenseCategory.MEALS, 'Conference dinner', new Date()
);

// Submit for approval
expenseService.submitExpense(expense.id);

// Employee decides to cancel before approval
const cancelledExpense = expenseService.cancelExpense(expense.id, 'emp-004');
console.log(cancelledExpense.status); // "CANCELLED"
```

## Querying Expenses

### Get Expenses by Employee

```typescript
const employeeExpenses = expenseService.getExpensesByEmployee('emp-001');
console.log(`Employee has ${employeeExpenses.length} expenses`);
```

### Get Pending Approvals for a Role

```typescript
// Get all expenses waiting for manager approval
const pendingForManager = expenseService.getPendingExpensesForApprover('MANAGER');

pendingForManager.forEach(expense => {
  console.log(`${expense.id}: $${expense.amount} - ${expense.description}`);
});
```

### Check if User Can Approve

```typescript
const canApprove = approvalFlowService.canApprove(
  flowId,
  'MANAGER',
  'mgr-001'
);

if (canApprove) {
  console.log('User is authorized to approve this expense');
} else {
  console.log('User cannot approve this expense');
}
```

## Custom Approval Rules

### Creating a Custom Rule

```typescript
import { ApprovalRule } from 'expense-management';

const customRule: ApprovalRule = {
  id: 'custom-training-rule',
  name: 'Training Expenses Over $1000',
  description: 'Requires HR approval for training over $1000',
  conditions: [
    {
      type: 'CATEGORY',
      operator: 'EQUALS',
      value: 'TRAINING'
    },
    {
      type: 'AMOUNT',
      operator: 'GREATER_THAN',
      value: 1000
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
      approverRoles: ['HR_DIRECTOR'],
      requiredApprovers: 1
    }
  ],
  priority: 15, // Higher priority to override default rules
  active: true
};

// Add the rule to the engine
ruleEngine.addRule(customRule);
```

### Modifying Existing Rules

```typescript
// Update a rule
ruleEngine.updateRule('rule-1', {
  name: 'Updated Small Expenses Rule',
  priority: 5
});

// Deactivate a rule
ruleEngine.deactivateRule('rule-2');
```

## Error Handling

```typescript
try {
  const expense = expenseService.createExpense(
    'emp-001', 'John Doe', 100, 'USD',
    ExpenseCategory.MEALS, 'Lunch', new Date()
  );
  
  const { flowId } = expenseService.submitExpense(expense.id);
  
  expenseService.processExpenseApproval(
    expense.id, 'mgr-001', 'Manager', 'MANAGER', 'APPROVED'
  );
  
} catch (error) {
  if (error instanceof Error) {
    console.error('Error:', error.message);
    
    // Handle specific error cases
    if (error.message.includes('not found')) {
      console.error('Expense or approver not found');
    } else if (error.message.includes('not authorized')) {
      console.error('User not authorized to approve');
    } else if (error.message.includes('already')) {
      console.error('Action already taken');
    }
  }
}
```

## Best Practices

### 1. Rule Priority Management

- Use higher priorities (10+) for exception rules
- Use lower priorities (1-5) for general rules
- Leave gaps between priorities for future rules

### 2. Error Handling

- Always wrap service calls in try-catch blocks
- Check return values for null/undefined
- Validate input data before submission

### 3. Approval Flow Management

- Check approval summary before processing
- Verify approver permissions with `canApprove()`
- Track approval history for audit purposes

### 4. Performance Optimization

- Cache frequently accessed expenses
- Batch process multiple approvals
- Index expenses by employee and status

### 5. Security

- Validate approver roles against user database
- Log all approval actions for audit trail
- Implement timeout for pending approvals
- Encrypt sensitive expense data

## Integration Examples

### With a REST API

```typescript
// POST /api/expenses
app.post('/api/expenses', async (req, res) => {
  try {
    const expense = expenseService.createExpense(
      req.user.id,
      req.user.name,
      req.body.amount,
      req.body.currency,
      req.body.category,
      req.body.description,
      new Date(req.body.date),
      req.body.attachments
    );
    
    res.json({ success: true, expense });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/expenses/:id/submit
app.post('/api/expenses/:id/submit', async (req, res) => {
  try {
    const result = expenseService.submitExpense(req.params.id);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/expenses/:id/approve
app.post('/api/expenses/:id/approve', async (req, res) => {
  try {
    const expense = expenseService.processExpenseApproval(
      req.params.id,
      req.user.id,
      req.user.name,
      req.user.role,
      req.body.action,
      req.body.comments
    );
    
    res.json({ success: true, expense });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
```

### With Notifications

```typescript
// Send notification when approval is needed
function notifyApprovers(expense: Expense, flowId: string) {
  const flow = approvalFlowService.getFlow(flowId);
  if (!flow) return;
  
  const currentStep = flow.steps[flow.currentLevel - 1];
  const roles = currentStep.approverRoles;
  
  // Send notification to users with these roles
  roles.forEach(role => {
    notificationService.send({
      to: getUsersWithRole(role),
      subject: `Expense Approval Needed: ${expense.description}`,
      body: `${expense.employeeName} submitted an expense for $${expense.amount}`,
      action: `/expenses/${expense.id}/approve`
    });
  });
}
```

## Troubleshooting

### Issue: No matching rule found

**Solution**: Ensure your expense matches at least one rule's conditions. Add a catch-all rule if needed.

### Issue: Unauthorized approver error

**Solution**: Verify the approver's role matches the required roles for the current approval level.

### Issue: Duplicate approval error

**Solution**: Check if the approver has already approved at this level. Each approver can only approve once per level.

### Issue: Cannot cancel approved expense

**Solution**: Only draft or pending expenses can be cancelled. Approved/rejected expenses are final.
