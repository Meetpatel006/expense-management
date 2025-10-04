import { ApprovalFlowService } from './ApprovalFlowService';
import { ApprovalRuleEngine } from './ApprovalRuleEngine';
import { Expense, ExpenseStatus, ExpenseCategory } from '../models/Expense';
import { ApprovalRule } from '../models/ApprovalRule';

describe('ApprovalFlowService', () => {
  let service: ApprovalFlowService;
  let ruleEngine: ApprovalRuleEngine;

  beforeEach(() => {
    const rules: ApprovalRule[] = [
      {
        id: 'rule-1',
        name: 'Single Level',
        description: 'Single approval',
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
        name: 'Two Level',
        description: 'Two level approval',
        conditions: [
          {
            type: 'AMOUNT',
            operator: 'GREATER_THAN_OR_EQUAL',
            value: 100
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
        priority: 2,
        active: true
      }
    ];

    ruleEngine = new ApprovalRuleEngine(rules);
    service = new ApprovalFlowService(ruleEngine);
  });

  describe('createApprovalFlow', () => {
    it('should create flow for single level approval', () => {
      const expense: Expense = {
        id: 'exp-1',
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        amount: 50,
        currency: 'USD',
        category: ExpenseCategory.MEALS,
        description: 'Lunch',
        date: new Date(),
        status: ExpenseStatus.DRAFT,
        approvalHistory: []
      };

      const flow = service.createApprovalFlow(expense);
      expect(flow).toBeDefined();
      expect(flow?.totalLevels).toBe(1);
      expect(flow?.currentLevel).toBe(1);
      expect(flow?.status).toBe('PENDING');
      expect(flow?.steps).toHaveLength(1);
    });

    it('should create flow for multi-level approval', () => {
      const expense: Expense = {
        id: 'exp-2',
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        amount: 500,
        currency: 'USD',
        category: ExpenseCategory.EQUIPMENT,
        description: 'Monitor',
        date: new Date(),
        status: ExpenseStatus.DRAFT,
        approvalHistory: []
      };

      const flow = service.createApprovalFlow(expense);
      expect(flow).toBeDefined();
      expect(flow?.totalLevels).toBe(2);
      expect(flow?.steps).toHaveLength(2);
    });
  });

  describe('processApproval', () => {
    it('should process single level approval', () => {
      const expense: Expense = {
        id: 'exp-3',
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        amount: 50,
        currency: 'USD',
        category: ExpenseCategory.MEALS,
        description: 'Lunch',
        date: new Date(),
        status: ExpenseStatus.DRAFT,
        approvalHistory: []
      };

      const flow = service.createApprovalFlow(expense);
      expect(flow).toBeDefined();
      const updated = service.processApproval(
        flow!.id,
        'mgr-1',
        'Manager One',
        'MANAGER',
        'APPROVED'
      );

      expect(updated.status).toBe('APPROVED');
      expect(updated.steps[0].status).toBe('APPROVED');
      expect(updated.steps[0].approvals).toHaveLength(1);
    });

    it('should advance to next level after approval', () => {
      const expense: Expense = {
        id: 'exp-4',
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        amount: 500,
        currency: 'USD',
        category: ExpenseCategory.EQUIPMENT,
        description: 'Monitor',
        date: new Date(),
        status: ExpenseStatus.DRAFT,
        approvalHistory: []
      };

      const flow = service.createApprovalFlow(expense);
      expect(flow).toBeDefined();
      
      // First level approval
      const afterLevel1 = service.processApproval(
        flow!.id,
        'mgr-1',
        'Manager One',
        'MANAGER',
        'APPROVED'
      );

      expect(afterLevel1.currentLevel).toBe(2);
      expect(afterLevel1.status).toBe('PENDING');
      expect(afterLevel1.steps[0].status).toBe('APPROVED');
      expect(afterLevel1.steps[1].status).toBe('PENDING');

      // Second level approval
      const afterLevel2 = service.processApproval(
        flow!.id,
        'dir-1',
        'Director One',
        'DIRECTOR',
        'APPROVED'
      );

      expect(afterLevel2.status).toBe('APPROVED');
      expect(afterLevel2.steps[1].status).toBe('APPROVED');
    });

    it('should reject flow immediately on rejection', () => {
      const expense: Expense = {
        id: 'exp-5',
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        amount: 500,
        currency: 'USD',
        category: ExpenseCategory.EQUIPMENT,
        description: 'Monitor',
        date: new Date(),
        status: ExpenseStatus.DRAFT,
        approvalHistory: []
      };

      const flow = service.createApprovalFlow(expense);
      expect(flow).toBeDefined();
      const rejected = service.processApproval(
        flow!.id,
        'mgr-1',
        'Manager One',
        'MANAGER',
        'REJECTED',
        'Not in budget'
      );

      expect(rejected.status).toBe('REJECTED');
      expect(rejected.steps[0].status).toBe('REJECTED');
    });

    it('should prevent unauthorized approver role', () => {
      const expense: Expense = {
        id: 'exp-6',
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        amount: 50,
        currency: 'USD',
        category: ExpenseCategory.MEALS,
        description: 'Lunch',
        date: new Date(),
        status: ExpenseStatus.DRAFT,
        approvalHistory: []
      };

      const flow = service.createApprovalFlow(expense);
      expect(flow).toBeDefined();

      expect(() => {
        service.processApproval(
          flow!.id,
          'dir-1',
          'Director One',
          'DIRECTOR',
          'APPROVED'
        );
      }).toThrow('not authorized');
    });

    it('should prevent duplicate approval from same user', () => {
      const expense: Expense = {
        id: 'exp-7',
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        amount: 50,
        currency: 'USD',
        category: ExpenseCategory.MEALS,
        description: 'Lunch',
        date: new Date(),
        status: ExpenseStatus.DRAFT,
        approvalHistory: []
      };

      const flow = service.createApprovalFlow(expense);
      expect(flow).toBeDefined();
      
      service.processApproval(
        flow!.id,
        'mgr-1',
        'Manager One',
        'MANAGER',
        'APPROVED'
      );

      expect(() => {
        service.processApproval(
          flow!.id,
          'mgr-1',
          'Manager One',
          'MANAGER',
          'APPROVED'
        );
      }).toThrow('already');
    });
  });

  describe('getPendingApprovalsForRole', () => {
    it('should return pending approvals for specific role', () => {
      const expense1: Expense = {
        id: 'exp-8',
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        amount: 50,
        currency: 'USD',
        category: ExpenseCategory.MEALS,
        description: 'Lunch',
        date: new Date(),
        status: ExpenseStatus.DRAFT,
        approvalHistory: []
      };

      const expense2: Expense = {
        id: 'exp-9',
        employeeId: 'emp-2',
        employeeName: 'Jane Smith',
        amount: 500,
        currency: 'USD',
        category: ExpenseCategory.EQUIPMENT,
        description: 'Monitor',
        date: new Date(),
        status: ExpenseStatus.DRAFT,
        approvalHistory: []
      };

      service.createApprovalFlow(expense1);
      service.createApprovalFlow(expense2);

      const pendingForManager = service.getPendingApprovalsForRole('MANAGER');
      expect(pendingForManager).toHaveLength(2);

      const pendingForDirector = service.getPendingApprovalsForRole('DIRECTOR');
      expect(pendingForDirector).toHaveLength(0);
    });
  });

  describe('canApprove', () => {
    it('should return true for authorized approver', () => {
      const expense: Expense = {
        id: 'exp-10',
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        amount: 50,
        currency: 'USD',
        category: ExpenseCategory.MEALS,
        description: 'Lunch',
        date: new Date(),
        status: ExpenseStatus.DRAFT,
        approvalHistory: []
      };

      const flow = service.createApprovalFlow(expense);
      expect(flow).toBeDefined();
      const canApprove = service.canApprove(flow!.id, 'MANAGER', 'mgr-1');
      expect(canApprove).toBe(true);
    });

    it('should return false for unauthorized role', () => {
      const expense: Expense = {
        id: 'exp-11',
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        amount: 50,
        currency: 'USD',
        category: ExpenseCategory.MEALS,
        description: 'Lunch',
        date: new Date(),
        status: ExpenseStatus.DRAFT,
        approvalHistory: []
      };

      const flow = service.createApprovalFlow(expense);
      expect(flow).toBeDefined();
      const canApprove = service.canApprove(flow!.id, 'DIRECTOR', 'dir-1');
      expect(canApprove).toBe(false);
    });
  });
});
