import { ApprovalRuleEngine } from './ApprovalRuleEngine';
import { ApprovalRule } from '../models/ApprovalRule';
import { Expense, ExpenseStatus, ExpenseCategory } from '../models/Expense';

describe('ApprovalRuleEngine', () => {
  let engine: ApprovalRuleEngine;
  let testRules: ApprovalRule[];

  beforeEach(() => {
    testRules = [
      {
        id: 'rule-1',
        name: 'Small Expenses',
        description: 'Single approval for expenses under $100',
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
        name: 'Large Expenses',
        description: 'Multi-level approval for expenses $1000+',
        conditions: [
          {
            type: 'AMOUNT',
            operator: 'GREATER_THAN_OR_EQUAL',
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
            approverRoles: ['DIRECTOR'],
            requiredApprovers: 1
          }
        ],
        priority: 2,
        active: true
      }
    ];

    engine = new ApprovalRuleEngine(testRules);
  });

  describe('findMatchingRule', () => {
    it('should find rule for small expense', () => {
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

      const rule = engine.findMatchingRule(expense);
      expect(rule).toBeDefined();
      expect(rule?.id).toBe('rule-1');
    });

    it('should find rule for large expense', () => {
      const expense: Expense = {
        id: 'exp-2',
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        amount: 1500,
        currency: 'USD',
        category: ExpenseCategory.EQUIPMENT,
        description: 'Laptop',
        date: new Date(),
        status: ExpenseStatus.DRAFT,
        approvalHistory: []
      };

      const rule = engine.findMatchingRule(expense);
      expect(rule).toBeDefined();
      expect(rule?.id).toBe('rule-2');
    });

    it('should respect rule priority', () => {
      // Add a higher priority rule for amounts >= 50
      const highPriorityRule: ApprovalRule = {
        id: 'rule-high',
        name: 'High Priority',
        description: 'High priority rule',
        conditions: [
          {
            type: 'AMOUNT',
            operator: 'GREATER_THAN_OR_EQUAL',
            value: 50
          }
        ],
        approvalLevels: [
          {
            level: 1,
            approverRoles: ['VP'],
            requiredApprovers: 1
          }
        ],
        priority: 10,
        active: true
      };

      engine.addRule(highPriorityRule);

      const expense: Expense = {
        id: 'exp-3',
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        amount: 75,
        currency: 'USD',
        category: ExpenseCategory.MEALS,
        description: 'Lunch',
        date: new Date(),
        status: ExpenseStatus.DRAFT,
        approvalHistory: []
      };

      const rule = engine.findMatchingRule(expense);
      expect(rule?.id).toBe('rule-high');
    });
  });

  describe('rule management', () => {
    it('should add new rule', () => {
      const newRule: ApprovalRule = {
        id: 'rule-3',
        name: 'Test Rule',
        description: 'Test',
        conditions: [],
        approvalLevels: [],
        priority: 5,
        active: true
      };

      engine.addRule(newRule);
      const rules = engine.getRules();
      expect(rules).toContainEqual(newRule);
    });

    it('should update existing rule', () => {
      const updated = engine.updateRule('rule-1', { name: 'Updated Name' });
      expect(updated).toBe(true);
      
      const rules = engine.getRules();
      const rule = rules.find(r => r.id === 'rule-1');
      expect(rule?.name).toBe('Updated Name');
    });

    it('should deactivate rule', () => {
      const deactivated = engine.deactivateRule('rule-1');
      expect(deactivated).toBe(true);
      
      const expense: Expense = {
        id: 'exp-4',
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

      // After deactivating rule-1, there are no other rules matching this expense
      // So it should return null
      const rule = engine.findMatchingRule(expense);
      // Note: The engine filters out inactive rules, but they remain in the internal list
      // with active: false. Since no other active rules match, we get null.
      expect(rule).toBeNull();
    });
  });

  describe('condition evaluation', () => {
    it('should evaluate EQUALS operator', () => {
      const rule: ApprovalRule = {
        id: 'rule-equals',
        name: 'Equals Test',
        description: 'Test',
        conditions: [
          {
            type: 'AMOUNT',
            operator: 'EQUALS',
            value: 100
          }
        ],
        approvalLevels: [],
        priority: 1,
        active: true
      };

      const testEngine = new ApprovalRuleEngine([rule]);

      const expense: Expense = {
        id: 'exp-5',
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        amount: 100,
        currency: 'USD',
        category: ExpenseCategory.MEALS,
        description: 'Test',
        date: new Date(),
        status: ExpenseStatus.DRAFT,
        approvalHistory: []
      };

      const matchedRule = testEngine.findMatchingRule(expense);
      expect(matchedRule).toBeDefined();
      expect(matchedRule?.id).toBe('rule-equals');
    });

    it('should evaluate GREATER_THAN operator', () => {
      const rule: ApprovalRule = {
        id: 'rule-gt',
        name: 'Greater Than Test',
        description: 'Test',
        conditions: [
          {
            type: 'AMOUNT',
            operator: 'GREATER_THAN',
            value: 100
          }
        ],
        approvalLevels: [],
        priority: 1,
        active: true
      };

      const testEngine = new ApprovalRuleEngine([rule]);

      const expense: Expense = {
        id: 'exp-6',
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        amount: 150,
        currency: 'USD',
        category: ExpenseCategory.MEALS,
        description: 'Test',
        date: new Date(),
        status: ExpenseStatus.DRAFT,
        approvalHistory: []
      };

      const matchedRule = testEngine.findMatchingRule(expense);
      expect(matchedRule).toBeDefined();
    });

    it('should evaluate category conditions', () => {
      const rule: ApprovalRule = {
        id: 'rule-travel',
        name: 'Travel Rule',
        description: 'Test',
        conditions: [
          {
            type: 'CATEGORY',
            operator: 'EQUALS',
            value: 'TRAVEL'
          }
        ],
        approvalLevels: [],
        priority: 1,
        active: true
      };

      const testEngine = new ApprovalRuleEngine([rule]);

      const expense: Expense = {
        id: 'exp-7',
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        amount: 500,
        currency: 'USD',
        category: ExpenseCategory.TRAVEL,
        description: 'Flight',
        date: new Date(),
        status: ExpenseStatus.DRAFT,
        approvalHistory: []
      };

      const matchedRule = testEngine.findMatchingRule(expense);
      expect(matchedRule).toBeDefined();
      expect(matchedRule?.id).toBe('rule-travel');
    });
  });
});
