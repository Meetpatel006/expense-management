import { Expense, ExpenseCategory } from '../models/Expense';
import { ApprovalRule, ApprovalCondition } from '../models/ApprovalRule';

/**
 * Engine that evaluates approval rules against expenses
 */
export class ApprovalRuleEngine {
  private rules: ApprovalRule[];

  constructor(rules: ApprovalRule[]) {
    // Sort rules by priority (highest first)
    this.rules = [...rules].sort((a, b) => b.priority - a.priority);
  }

  /**
   * Find the matching approval rule for an expense
   */
  findMatchingRule(expense: Expense): ApprovalRule | null {
    // Filter active rules at evaluation time
    const activeRules = this.rules.filter(rule => rule.active);
    
    for (const rule of activeRules) {
      if (this.evaluateRule(rule, expense)) {
        return rule;
      }
    }
    return null;
  }

  /**
   * Evaluate if a rule matches an expense
   */
  private evaluateRule(rule: ApprovalRule, expense: Expense): boolean {
    // All conditions must be met for a rule to match
    return rule.conditions.every(condition => 
      this.evaluateCondition(condition, expense)
    );
  }

  /**
   * Evaluate a single condition against an expense
   */
  private evaluateCondition(condition: ApprovalCondition, expense: Expense): boolean {
    switch (condition.type) {
      case 'AMOUNT':
        return this.evaluateAmountCondition(condition, expense.amount);
      
      case 'CATEGORY':
        return this.evaluateCategoryCondition(condition, expense.category);
      
      case 'DEPARTMENT':
        // This would typically come from employee data
        // For now, we'll return true as a placeholder
        return true;
      
      case 'EMPLOYEE_LEVEL':
        // This would typically come from employee data
        // For now, we'll return true as a placeholder
        return true;
      
      default:
        return false;
    }
  }

  /**
   * Evaluate amount-based conditions
   */
  private evaluateAmountCondition(condition: ApprovalCondition, amount: number): boolean {
    const threshold = condition.value as number;
    
    switch (condition.operator) {
      case 'EQUALS':
        return amount === threshold;
      case 'GREATER_THAN':
        return amount > threshold;
      case 'LESS_THAN':
        return amount < threshold;
      case 'GREATER_THAN_OR_EQUAL':
        return amount >= threshold;
      case 'LESS_THAN_OR_EQUAL':
        return amount <= threshold;
      default:
        return false;
    }
  }

  /**
   * Evaluate category-based conditions
   */
  private evaluateCategoryCondition(condition: ApprovalCondition, category: ExpenseCategory): boolean {
    switch (condition.operator) {
      case 'EQUALS':
        return category === condition.value;
      case 'IN':
        const allowedCategories = condition.value as string[];
        return allowedCategories.includes(category);
      default:
        return false;
    }
  }

  /**
   * Get all active rules
   */
  getRules(): ApprovalRule[] {
    return [...this.rules];
  }

  /**
   * Add a new rule
   */
  addRule(rule: ApprovalRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Update an existing rule
   */
  updateRule(ruleId: string, updates: Partial<ApprovalRule>): boolean {
    const index = this.rules.findIndex(r => r.id === ruleId);
    if (index === -1) return false;
    
    this.rules[index] = { ...this.rules[index], ...updates };
    this.rules.sort((a, b) => b.priority - a.priority);
    return true;
  }

  /**
   * Deactivate a rule
   */
  deactivateRule(ruleId: string): boolean {
    return this.updateRule(ruleId, { active: false });
  }
}
