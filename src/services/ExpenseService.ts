import { Expense, ExpenseStatus, ExpenseCategory, ApprovalRecord } from '../models/Expense';
import { ApprovalFlowService } from './ApprovalFlowService';

/**
 * Service that manages expense submissions and lifecycle
 */
export class ExpenseService {
  private expenses: Map<string, Expense> = new Map();
  private approvalFlowService: ApprovalFlowService;

  constructor(approvalFlowService: ApprovalFlowService) {
    this.approvalFlowService = approvalFlowService;
  }

  /**
   * Create a new expense
   */
  createExpense(
    employeeId: string,
    employeeName: string,
    amount: number,
    currency: string,
    category: ExpenseCategory,
    description: string,
    date: Date,
    attachments?: string[]
  ): Expense {
    const expense: Expense = {
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      employeeId,
      employeeName,
      amount,
      currency,
      category,
      description,
      date,
      status: ExpenseStatus.DRAFT,
      approvalHistory: [],
      attachments: attachments || []
    };

    this.expenses.set(expense.id, expense);
    return expense;
  }

  /**
   * Submit an expense for approval
   */
  submitExpense(expenseId: string): { expense: Expense; flowId: string } {
    const expense = this.expenses.get(expenseId);
    
    if (!expense) {
      throw new Error(`Expense ${expenseId} not found`);
    }

    if (expense.status !== ExpenseStatus.DRAFT) {
      throw new Error(`Expense ${expenseId} has already been submitted`);
    }

    // Update expense status
    expense.status = ExpenseStatus.PENDING;
    expense.submittedAt = new Date();

    // Create approval flow
    const flow = this.approvalFlowService.createApprovalFlow(expense);
    
    if (!flow) {
      throw new Error('Failed to create approval flow');
    }

    return { expense, flowId: flow.id };
  }

  /**
   * Approve or reject an expense
   */
  processExpenseApproval(
    expenseId: string,
    approverId: string,
    approverName: string,
    approverRole: string,
    action: 'APPROVED' | 'REJECTED',
    comments?: string
  ): Expense {
    const expense = this.expenses.get(expenseId);
    
    if (!expense) {
      throw new Error(`Expense ${expenseId} not found`);
    }

    if (expense.status !== ExpenseStatus.PENDING) {
      throw new Error(`Expense ${expenseId} is not pending approval`);
    }

    const flow = this.approvalFlowService.getFlowByExpenseId(expenseId);
    
    if (!flow) {
      throw new Error(`No approval flow found for expense ${expenseId}`);
    }

    // Process the approval
    const updatedFlow = this.approvalFlowService.processApproval(
      flow.id,
      approverId,
      approverName,
      approverRole,
      action,
      comments
    );

    // Add to approval history
    const approvalRecord: ApprovalRecord = {
      approverId,
      approverName,
      approverLevel: updatedFlow.currentLevel - (action === 'APPROVED' && updatedFlow.status === 'APPROVED' ? 0 : 1),
      action,
      timestamp: new Date(),
      comments
    };

    expense.approvalHistory.push(approvalRecord);

    // Update expense status based on flow status
    if (updatedFlow.status === 'APPROVED') {
      expense.status = ExpenseStatus.APPROVED;
    } else if (updatedFlow.status === 'REJECTED') {
      expense.status = ExpenseStatus.REJECTED;
    }

    return expense;
  }

  /**
   * Get an expense by ID
   */
  getExpense(expenseId: string): Expense | undefined {
    return this.expenses.get(expenseId);
  }

  /**
   * Get all expenses for an employee
   */
  getExpensesByEmployee(employeeId: string): Expense[] {
    return Array.from(this.expenses.values())
      .filter(expense => expense.employeeId === employeeId);
  }

  /**
   * Get expenses pending approval for a specific approver role
   */
  getPendingExpensesForApprover(approverRole: string): Expense[] {
    const pendingFlows = this.approvalFlowService.getPendingApprovalsForRole(approverRole);
    const expenseIds = pendingFlows.map(flow => flow.expenseId);
    
    return Array.from(this.expenses.values())
      .filter(expense => expenseIds.includes(expense.id));
  }

  /**
   * Get all expenses
   */
  getAllExpenses(): Expense[] {
    return Array.from(this.expenses.values());
  }

  /**
   * Cancel an expense
   */
  cancelExpense(expenseId: string, employeeId: string): Expense {
    const expense = this.expenses.get(expenseId);
    
    if (!expense) {
      throw new Error(`Expense ${expenseId} not found`);
    }

    if (expense.employeeId !== employeeId) {
      throw new Error('Only the expense owner can cancel it');
    }

    if (expense.status === ExpenseStatus.APPROVED || expense.status === ExpenseStatus.REJECTED) {
      throw new Error(`Cannot cancel an expense that is already ${expense.status}`);
    }

    expense.status = ExpenseStatus.CANCELLED;
    return expense;
  }
}
