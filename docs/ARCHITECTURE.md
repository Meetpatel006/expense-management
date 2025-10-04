# Architecture Documentation

## Overview

The Expense Management System is built with a layered architecture that separates concerns and provides flexibility for customization.

## System Layers

```
┌─────────────────────────────────────────┐
│          Application Layer              │
│  (ExpenseService, API endpoints, UI)    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│         Workflow Layer                  │
│      (ApprovalFlowService)              │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          Rule Engine Layer              │
│      (ApprovalRuleEngine)               │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│           Data Layer                    │
│  (Models: Expense, ApprovalRule, Flow)  │
└─────────────────────────────────────────┘
```

## Core Components

### 1. ExpenseService

**Responsibility**: Manages the complete lifecycle of expenses

**Key Operations**:
- Create new expenses
- Submit expenses for approval
- Process approval decisions
- Track expense status
- Retrieve expense information

**Dependencies**:
- ApprovalFlowService

### 2. ApprovalFlowService

**Responsibility**: Manages multi-level approval workflows

**Key Operations**:
- Create approval flows based on rules
- Process approval actions at each level
- Track approval progress
- Validate approver permissions
- Advance through approval levels

**Dependencies**:
- ApprovalRuleEngine

### 3. ApprovalRuleEngine

**Responsibility**: Evaluates rules to determine approval requirements

**Key Operations**:
- Match expenses to approval rules
- Evaluate rule conditions
- Manage rule priorities
- Support rule CRUD operations

**Dependencies**:
- None (bottom layer)

## Data Flow

### Expense Submission Flow

```
1. Employee creates expense
   ↓
2. ExpenseService.createExpense()
   ↓
3. Employee submits expense
   ↓
4. ExpenseService.submitExpense()
   ↓
5. ApprovalFlowService.createApprovalFlow()
   ↓
6. ApprovalRuleEngine.findMatchingRule()
   ↓
7. Rule matched → Flow created
   ↓
8. Expense status: PENDING
```

### Approval Process Flow

```
1. Approver reviews expense
   ↓
2. ExpenseService.processExpenseApproval()
   ↓
3. ApprovalFlowService.processApproval()
   ↓
4. Validate approver role and permissions
   ↓
5. Record approval action
   ↓
6. Check if level requirements met
   ↓
7a. Requirements met → Advance to next level
7b. All levels complete → Mark as APPROVED
7c. Rejection → Mark as REJECTED
   ↓
8. Update expense status
```

## Rule Evaluation Algorithm

```typescript
function findMatchingRule(expense: Expense): ApprovalRule | null {
  // 1. Get all active rules sorted by priority (highest first)
  const activeRules = rules.filter(r => r.active)
    .sort((a, b) => b.priority - a.priority);
  
  // 2. Evaluate each rule until a match is found
  for (const rule of activeRules) {
    // 3. All conditions must be met for a match
    if (allConditionsMet(rule.conditions, expense)) {
      return rule; // First match wins (highest priority)
    }
  }
  
  // 4. No matching rule found
  return null;
}
```

## Design Patterns

### 1. Strategy Pattern
- Different approval strategies based on rules
- Rules can be swapped at runtime
- New rules can be added without modifying core logic

### 2. Chain of Responsibility
- Approval levels form a chain
- Each level processes the request and passes to next
- Chain breaks on rejection

### 3. State Pattern
- Expenses transition through states (DRAFT → PENDING → APPROVED/REJECTED)
- Valid state transitions are enforced

### 4. Repository Pattern
- Services act as repositories for their domain objects
- Centralized data access

## Extensibility Points

### 1. Custom Approval Rules

Add new rule types by:
- Defining new condition types
- Implementing condition evaluation logic
- Adding to the ApprovalRuleEngine

### 2. Additional Approval Levels

Support more levels by:
- Adding new approver roles
- Defining level requirements
- Configuring in approval rules

### 3. Integration Points

The system can be integrated with:
- **User Management Systems**: For employee and approver data
- **Notification Services**: For approval alerts
- **Accounting Systems**: For approved expense processing
- **Audit Logging**: For compliance tracking

## Security Considerations

### Authorization

- Role-based access control (RBAC)
- Approvers can only act on their authorized levels
- Employees can only manage their own expenses

### Validation

- Amount validation
- Date validation
- Status transition validation
- Duplicate approval prevention

### Audit Trail

- Complete approval history
- Timestamp for all actions
- Approver identification
- Comments/reasoning captured

## Future Enhancements

1. **Parallel Approvals**: Support multiple approvers at same level
2. **Conditional Auto-Approval**: Auto-approve under certain conditions
3. **Delegation**: Allow approvers to delegate to others
4. **Time-based Escalation**: Auto-escalate if not approved within timeframe
5. **Budget Integration**: Check against department budgets
