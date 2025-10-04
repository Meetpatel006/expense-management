import { Expense, ExpenseStatus, ApprovalRecord } from '../models/Expense';
import { ApprovalRule } from '../models/ApprovalRule';
import { ApprovalFlow, ApprovalStep, StepApproval } from '../models/ApprovalFlow';
import { ApprovalRuleEngine } from './ApprovalRuleEngine';

/**
 * Service that manages approval flows for expenses
 */
export class ApprovalFlowService {
  private ruleEngine: ApprovalRuleEngine;
  private flows: Map<string, ApprovalFlow> = new Map();

  constructor(ruleEngine: ApprovalRuleEngine) {
    this.ruleEngine = ruleEngine;
  }

  /**
   * Create an approval flow for an expense
   */
  createApprovalFlow(expense: Expense): ApprovalFlow | null {
    const rule = this.ruleEngine.findMatchingRule(expense);
    
    if (!rule) {
      throw new Error(`No approval rule found for expense ${expense.id}`);
    }

    const flow: ApprovalFlow = {
      id: `flow-${expense.id}-${Date.now()}`,
      expenseId: expense.id,
      ruleId: rule.id,
      currentLevel: 1,
      totalLevels: rule.approvalLevels.length,
      status: 'PENDING',
      steps: rule.approvalLevels.map((level, index) => ({
        level: level.level,
        approverRoles: level.approverRoles,
        requiredApprovers: level.requiredApprovers,
        approvals: [],
        status: index === 0 ? 'PENDING' : 'PENDING',
        startedAt: index === 0 ? new Date() : undefined
      })),
      createdAt: new Date()
    };

    this.flows.set(flow.id, flow);
    return flow;
  }

  /**
   * Process an approval action
   */
  processApproval(
    flowId: string,
    approverId: string,
    approverName: string,
    approverRole: string,
    action: 'APPROVED' | 'REJECTED',
    comments?: string
  ): ApprovalFlow {
    const flow = this.flows.get(flowId);
    
    if (!flow) {
      throw new Error(`Approval flow ${flowId} not found`);
    }

    if (flow.status !== 'PENDING') {
      throw new Error(`Approval flow ${flowId} is already ${flow.status}`);
    }

    const currentStep = flow.steps[flow.currentLevel - 1];
    
    if (!currentStep) {
      throw new Error(`Invalid approval level ${flow.currentLevel}`);
    }

    // Check if approver role is valid for this step
    if (!currentStep.approverRoles.includes(approverRole)) {
      throw new Error(`Approver role ${approverRole} is not authorized for level ${flow.currentLevel}`);
    }

    // Check if approver has already approved
    const existingApproval = currentStep.approvals.find(a => a.approverId === approverId);
    if (existingApproval) {
      throw new Error(`Approver ${approverId} has already submitted an approval for this step`);
    }

    // Add the approval
    const approval: StepApproval = {
      approverId,
      approverName,
      approverRole,
      action,
      timestamp: new Date(),
      comments
    };

    currentStep.approvals.push(approval);

    // If rejected, mark the entire flow as rejected
    if (action === 'REJECTED') {
      currentStep.status = 'REJECTED';
      currentStep.completedAt = new Date();
      flow.status = 'REJECTED';
      flow.completedAt = new Date();
      return flow;
    }

    // Check if current step has enough approvals
    const approvedCount = currentStep.approvals.filter(a => a.action === 'APPROVED').length;
    
    if (approvedCount >= currentStep.requiredApprovers) {
      currentStep.status = 'APPROVED';
      currentStep.completedAt = new Date();

      // Move to next level or complete the flow
      if (flow.currentLevel < flow.totalLevels) {
        flow.currentLevel++;
        const nextStep = flow.steps[flow.currentLevel - 1];
        nextStep.startedAt = new Date();
      } else {
        flow.status = 'APPROVED';
        flow.completedAt = new Date();
      }
    }

    return flow;
  }

  /**
   * Get approval flow by ID
   */
  getFlow(flowId: string): ApprovalFlow | undefined {
    return this.flows.get(flowId);
  }

  /**
   * Get approval flow by expense ID
   */
  getFlowByExpenseId(expenseId: string): ApprovalFlow | undefined {
    return Array.from(this.flows.values()).find(flow => flow.expenseId === expenseId);
  }

  /**
   * Get all pending approvals for a specific approver role
   */
  getPendingApprovalsForRole(approverRole: string): ApprovalFlow[] {
    return Array.from(this.flows.values()).filter(flow => {
      if (flow.status !== 'PENDING') return false;
      
      const currentStep = flow.steps[flow.currentLevel - 1];
      return currentStep && 
             currentStep.status === 'PENDING' && 
             currentStep.approverRoles.includes(approverRole);
    });
  }

  /**
   * Get approval status summary for an expense
   */
  getApprovalSummary(flowId: string): {
    currentLevel: number;
    totalLevels: number;
    status: string;
    steps: Array<{
      level: number;
      roles: string[];
      required: number;
      approved: number;
      status: string;
    }>;
  } | null {
    const flow = this.flows.get(flowId);
    if (!flow) return null;

    return {
      currentLevel: flow.currentLevel,
      totalLevels: flow.totalLevels,
      status: flow.status,
      steps: flow.steps.map(step => ({
        level: step.level,
        roles: step.approverRoles,
        required: step.requiredApprovers,
        approved: step.approvals.filter(a => a.action === 'APPROVED').length,
        status: step.status
      }))
    };
  }

  /**
   * Check if an approver can approve at current level
   */
  canApprove(flowId: string, approverRole: string, approverId: string): boolean {
    const flow = this.flows.get(flowId);
    if (!flow || flow.status !== 'PENDING') return false;

    const currentStep = flow.steps[flow.currentLevel - 1];
    if (!currentStep || currentStep.status !== 'PENDING') return false;

    // Check if role is authorized
    if (!currentStep.approverRoles.includes(approverRole)) return false;

    // Check if already approved
    const hasApproved = currentStep.approvals.some(a => a.approverId === approverId);
    return !hasApproved;
  }
}
