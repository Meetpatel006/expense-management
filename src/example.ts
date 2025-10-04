import { ExpenseCategory } from './models/Expense';
import { DEFAULT_APPROVAL_RULES } from './models/ApprovalRule';
import { ApprovalRuleEngine } from './services/ApprovalRuleEngine';
import { ApprovalFlowService } from './services/ApprovalFlowService';
import { ExpenseService } from './services/ExpenseService';

/**
 * Example demonstrating the expense management system with approval flows
 */
function runExample() {
  console.log('=== Expense Management System Example ===\n');

  // Initialize the system
  const ruleEngine = new ApprovalRuleEngine(DEFAULT_APPROVAL_RULES);
  const approvalFlowService = new ApprovalFlowService(ruleEngine);
  const expenseService = new ExpenseService(approvalFlowService);

  console.log('1. System initialized with default approval rules');
  console.log(`   Total active rules: ${ruleEngine.getRules().length}\n`);

  // Example 1: Small expense (< $100)
  console.log('=== Example 1: Small Expense ($75) ===');
  const expense1 = expenseService.createExpense(
    'emp-001',
    'John Doe',
    75,
    'USD',
    ExpenseCategory.MEALS,
    'Team lunch',
    new Date()
  );
  console.log(`Created expense: ${expense1.id} - $${expense1.amount}`);
  
  const { flowId: flowId1 } = expenseService.submitExpense(expense1.id);
  console.log(`Submitted for approval. Flow ID: ${flowId1}`);
  
  const summary1 = approvalFlowService.getApprovalSummary(flowId1);
  console.log(`Approval levels required: ${summary1?.totalLevels}`);
  console.log(`Current level: ${summary1?.currentLevel} (${summary1?.steps[0].roles.join(', ')})`);
  
  // Manager approval
  expenseService.processExpenseApproval(
    expense1.id,
    'mgr-001',
    'Sarah Manager',
    'MANAGER',
    'APPROVED',
    'Approved - within budget'
  );
  console.log('✓ Approved by Manager');
  console.log(`Final status: ${expenseService.getExpense(expense1.id)?.status}\n`);

  // Example 2: Large expense ($3500) requiring multiple approvals
  console.log('=== Example 2: Large Expense ($3,500) ===');
  const expense2 = expenseService.createExpense(
    'emp-002',
    'Jane Smith',
    3500,
    'USD',
    ExpenseCategory.EQUIPMENT,
    'New workstation setup',
    new Date()
  );
  console.log(`Created expense: ${expense2.id} - $${expense2.amount}`);
  
  const { flowId: flowId2 } = expenseService.submitExpense(expense2.id);
  const summary2 = approvalFlowService.getApprovalSummary(flowId2);
  console.log(`Approval levels required: ${summary2?.totalLevels}`);
  
  // Level 1: Manager approval
  console.log(`\nLevel 1: ${summary2?.steps[0].roles.join(', ')}`);
  expenseService.processExpenseApproval(
    expense2.id,
    'mgr-002',
    'Bob Manager',
    'MANAGER',
    'APPROVED',
    'Equipment needed for new project'
  );
  console.log('✓ Approved by Manager');
  
  const summary2After = approvalFlowService.getApprovalSummary(flowId2);
  console.log(`Current level: ${summary2After?.currentLevel} (${summary2After?.steps[1].roles.join(', ')})`);
  
  // Level 2: Director approval
  expenseService.processExpenseApproval(
    expense2.id,
    'dir-001',
    'Carol Director',
    'DIRECTOR',
    'APPROVED',
    'Approved for Q4 budget'
  );
  console.log('✓ Approved by Director');
  console.log(`Final status: ${expenseService.getExpense(expense2.id)?.status}\n`);

  // Example 3: Very large expense ($8000) requiring 3-level approval
  console.log('=== Example 3: Very Large Expense ($8,000) ===');
  const expense3 = expenseService.createExpense(
    'emp-003',
    'Mike Johnson',
    8000,
    'USD',
    ExpenseCategory.TRAINING,
    'Annual conference and certification',
    new Date()
  );
  console.log(`Created expense: ${expense3.id} - $${expense3.amount}`);
  
  const { flowId: flowId3 } = expenseService.submitExpense(expense3.id);
  const summary3 = approvalFlowService.getApprovalSummary(flowId3);
  console.log(`Approval levels required: ${summary3?.totalLevels}`);
  
  // Level 1: Manager
  console.log(`\nLevel 1: ${summary3?.steps[0].roles.join(', ')}`);
  expenseService.processExpenseApproval(
    expense3.id,
    'mgr-003',
    'Alice Manager',
    'MANAGER',
    'APPROVED'
  );
  console.log('✓ Approved by Manager');
  
  // Level 2: Director
  const summary3b = approvalFlowService.getApprovalSummary(flowId3);
  console.log(`\nLevel 2: ${summary3b?.steps[1].roles.join(', ')}`);
  expenseService.processExpenseApproval(
    expense3.id,
    'dir-002',
    'David Director',
    'DIRECTOR',
    'APPROVED'
  );
  console.log('✓ Approved by Director');
  
  // Level 3: VP/CFO
  const summary3c = approvalFlowService.getApprovalSummary(flowId3);
  console.log(`\nLevel 3: ${summary3c?.steps[2].roles.join(', ')}`);
  expenseService.processExpenseApproval(
    expense3.id,
    'vp-001',
    'Emily VP',
    'VP',
    'APPROVED',
    'High-value investment in employee development'
  );
  console.log('✓ Approved by VP');
  console.log(`Final status: ${expenseService.getExpense(expense3.id)?.status}\n`);

  // Example 4: Rejected expense
  console.log('=== Example 4: Rejected Expense ($2,000) ===');
  const expense4 = expenseService.createExpense(
    'emp-004',
    'Tom Wilson',
    2000,
    'USD',
    ExpenseCategory.OTHER,
    'Luxury office chair',
    new Date()
  );
  console.log(`Created expense: ${expense4.id} - $${expense4.amount}`);
  
  const { flowId: flowId4 } = expenseService.submitExpense(expense4.id);
  
  // Manager rejects
  expenseService.processExpenseApproval(
    expense4.id,
    'mgr-004',
    'Frank Manager',
    'MANAGER',
    'REJECTED',
    'Not aligned with company equipment policy'
  );
  console.log('✗ Rejected by Manager');
  console.log(`Final status: ${expenseService.getExpense(expense4.id)?.status}\n`);

  // Example 5: Travel expense with special rule
  console.log('=== Example 5: Travel Expense ($1,200) ===');
  const expense5 = expenseService.createExpense(
    'emp-005',
    'Lisa Brown',
    1200,
    'USD',
    ExpenseCategory.TRAVEL,
    'Client meeting in New York - flights and hotel',
    new Date()
  );
  console.log(`Created expense: ${expense5.id} - $${expense5.amount}`);
  
  const { flowId: flowId5 } = expenseService.submitExpense(expense5.id);
  const summary5 = approvalFlowService.getApprovalSummary(flowId5);
  console.log(`Approval levels required: ${summary5?.totalLevels}`);
  console.log(`Special rule applied: Travel expenses require Travel Coordinator approval`);
  
  // Level 1: Manager
  console.log(`\nLevel 1: ${summary5?.steps[0].roles.join(', ')}`);
  expenseService.processExpenseApproval(
    expense5.id,
    'mgr-005',
    'Gary Manager',
    'MANAGER',
    'APPROVED'
  );
  console.log('✓ Approved by Manager');
  
  // Level 2: Travel Coordinator
  const summary5b = approvalFlowService.getApprovalSummary(flowId5);
  console.log(`\nLevel 2: ${summary5b?.steps[1].roles.join(', ')}`);
  expenseService.processExpenseApproval(
    expense5.id,
    'tc-001',
    'Helen Travel Coordinator',
    'TRAVEL_COORDINATOR',
    'APPROVED',
    'Travel dates and budget verified'
  );
  console.log('✓ Approved by Travel Coordinator');
  console.log(`Final status: ${expenseService.getExpense(expense5.id)?.status}\n`);

  // Summary
  console.log('=== System Summary ===');
  const allExpenses = expenseService.getAllExpenses();
  console.log(`Total expenses: ${allExpenses.length}`);
  console.log(`Approved: ${allExpenses.filter(e => e.status === 'APPROVED').length}`);
  console.log(`Rejected: ${allExpenses.filter(e => e.status === 'REJECTED').length}`);
  console.log(`Pending: ${allExpenses.filter(e => e.status === 'PENDING').length}`);
  
  const totalAmount = allExpenses
    .filter(e => e.status === 'APPROVED')
    .reduce((sum, e) => sum + e.amount, 0);
  console.log(`Total approved amount: $${totalAmount.toFixed(2)}`);
}

// Run the example if this file is executed directly
if (require.main === module) {
  runExample();
}

export { runExample };
