"use client"

import { create } from "zustand"
import type { Company, Expense, User, ApprovalHistory, ApprovalRule } from "./types"

type Store = {
  users: User[]
  companies: Company[]
  expenses: Expense[]
  currentUser: User | null
  currentCompany: Company | null
  rules: ApprovalRule[]

  // auth
  upsertCompanyAndAdmin: (company: Company, admin: User) => void
  login: (email: string, password: string) => boolean
  logout: () => void
  setCurrentUser: (u: User | null) => void

  // users
  usersByCompany: () => User[]
  createUser: (u: User) => void
  updateUser: (id: string, patch: Partial<User>) => void
  sendPasswordMock: (email: string) => string

  // expenses
  myExpenses: () => Expense[]
  approvalsAssignedToMe: () => Expense[]
  createExpense: (e: Expense) => Expense
  updateExpense: (id: string, patch: Partial<Expense>) => void
  submitExpense: (id: string) => void
  approveExpense: (id: string) => void
  rejectExpense: (id: string) => void

  // rules api
  listRules: () => ApprovalRule[]
  createRule: (r: ApprovalRule) => void
  updateRule: (id: string, patch: Partial<ApprovalRule>) => void
  reorderRuleApprover: (ruleId: string, approverId: string, dir: "up" | "down") => void

  // helpers
  getRuleForEmployee: (employeeId: string) => ApprovalRule | null
  getApproverIdsForExpense: (e: Expense) => string[]
  canCurrentUserActOn: (e: Expense) => boolean

  refresh: () => void
}

const initialUsers: User[] = [
  { id: "1", name: "Admin User", email: "admin@company.com", role: "admin", companyId: "c1", password: "admin1234" },
  { id: "2", name: "Sarah", email: "sarah@company.com", role: "manager", companyId: "c1", password: "manager1234" },
  {
    id: "3",
    name: "Marc",
    email: "marc@company.com",
    role: "employee",
    managerId: "2",
    companyId: "c1",
    password: "employee1234",
  },
]

const initialCompany: Company = {
  id: "c1",
  name: "Tech Corp",
  baseCurrency: "USD",
  country: "United States",
}

const initialExpenses: Expense[] = [
  {
    id: "e1",
    employeeId: "3",
    amount: 567,
    currency: "EUR",
    amountInBaseCurrency: 628.96,
    category: "Food",
    description: "Restaurant bill on 10th Oct, 2025",
    expenseDate: "2025-10-10",
    status: "approved",
    remarks: "Client dinner",
    paidBy: "Cash",
    approvalHistory: [
      {
        id: crypto.randomUUID(),
        expenseId: "e1",
        approverId: "2",
        action: "approved",
        approvedAt: "2025-10-04T12:44:00Z",
        sequenceStep: 1,
      },
    ],
  },
]

const initialRules: ApprovalRule[] = [
  {
    id: "r1",
    ruleName: "Default Rule",
    description: "Manager first, then Admin",
    isManagerFirstApprover: true,
    isSequential: true,
    minimumApprovalPercentage: 100,
    approvers: [
      // manager is injected dynamically when set as first approver
      { id: "ra1", approverId: "1", sequenceOrder: 2, isRequired: true }, // Admin as required approver
    ],
  },
]

export const useAppStore = create<Store>((set, get) => ({
  users: initialUsers,
  companies: [initialCompany],
  expenses: initialExpenses.map((e) => ({ ...e, __ownerName: "Marc", __baseCurrency: initialCompany.baseCurrency })),
  currentUser: null,
  currentCompany: initialCompany,
  rules: initialRules,

  upsertCompanyAndAdmin: (company, admin) => {
    set((s) => ({
      companies: [...s.companies.filter((c) => c.id !== company.id), company],
      users: [...s.users, admin],
      currentUser: admin,
      currentCompany: company,
    }))
  },
  setCurrentUser: (u) => set(() => ({ currentUser: u })),
  login: (email, password) => {
    const u = get().users.find((x) => x.email.toLowerCase() === email.toLowerCase())
    if (!u || (u.password && u.password !== password)) return false
    set({ currentUser: u, currentCompany: get().companies.find((c) => c.id === u.companyId) || null })
    return true
  },
  logout: () => {
    set({ currentUser: null })
    window.location.href = "/auth/login"
  },

  usersByCompany: () => {
    const u = get().currentUser
    if (!u) return []
    return get().users.filter((x) => x.companyId === u.companyId)
  },
  createUser: (u) => {
    set((s) => ({ users: [...s.users, u] }))
  },
  updateUser: (id, patch) => {
    set((s) => ({ users: s.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }))
  },
  sendPasswordMock: (email) => {
    const pwd = Math.random().toString(36).slice(-10)
    console.log("[mock-email] Password sent to", email, "password:", pwd)
    return pwd
  },

  myExpenses: () => {
    const u = get().currentUser
    if (!u) return []
    return get()
      .expenses.filter((e) => e.employeeId === u.id)
      .map((e) => ({ ...e, __baseCurrency: get().currentCompany?.baseCurrency }))
  },

  approvalsAssignedToMe: () => {
    const me = get().currentUser
    if (!me) return []
    const users = get().users
    return get()
      .expenses.filter((e) => get().canCurrentUserActOn(e))
      .map((e) => {
        const ownerName = users.find((x) => x.id === e.employeeId)?.name || "Employee"
        return { ...e, __ownerName: ownerName, __baseCurrency: get().currentCompany?.baseCurrency }
      })
  },

  createExpense: (e) => {
    set((s) => ({ expenses: [{ ...e }, ...s.expenses] }))
    return e
  },
  updateExpense: (id, patch) => {
    set((s) => ({ expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)) }))
  },
  submitExpense: (id) => {
    const { users } = get()
    set((s) => {
      const exp = s.expenses.find((e) => e.id === id)
      if (!exp) return s
      const rule = get().getRuleForEmployee(exp.employeeId)
      const employee = users.find((u) => u.id === exp.employeeId)
      const approverIds = rule
        ? get().getApproverIdsForExpense({ ...exp, approvalRuleId: rule.id })
        : employee?.managerId
          ? [employee.managerId]
          : []
      const next: Expense = {
        ...exp,
        approvalRuleId: rule?.id,
        status: "pending_approval",
        currentApproverId: rule?.isSequential ? approverIds[0] : undefined,
        approvalHistory: exp.approvalHistory || [],
      }
      console.log("[mock-email] Approval notification sent")
      return { ...s, expenses: s.expenses.map((e) => (e.id === id ? next : e)) }
    })
  },
  approveExpense: (id) => {
    const me = get().currentUser
    if (!me) return
    set((s) => {
      const exp = s.expenses.find((e) => e.id === id)
      if (!exp || exp.status !== "pending_approval") return s

      const rule = exp.approvalRuleId ? s.rules.find((r) => r.id === exp.approvalRuleId) : null
      const approverIds = get().getApproverIdsForExpense(exp)
      const acted = (exp.approvalHistory || []).some((h) => h.approverId === me.id)
      if (!approverIds.includes(me.id) || acted) return s

      const history: ApprovalHistory[] = [
        ...(exp.approvalHistory || []),
        {
          id: crypto.randomUUID(),
          expenseId: exp.id,
          approverId: me.id,
          action: "approved",
          approvedAt: new Date().toISOString(),
          sequenceStep: (exp.approvalHistory?.length || 0) + 1,
        },
      ]

      // Sequential flow
      if (rule?.isSequential) {
        // move to next approver or finalize
        const idx = approverIds.indexOf(me.id)
        if (idx >= 0 && idx < approverIds.length - 1) {
          const updated: Expense = {
            ...exp,
            approvalHistory: history,
            currentApproverId: approverIds[idx + 1],
          }
          console.log("[mock-email] Approval notification sent to next approver")
          return { ...s, expenses: s.expenses.map((e) => (e.id === id ? updated : e)) }
        }
        // last approver => approved
        const updated: Expense = { ...exp, approvalHistory: history, currentApproverId: undefined, status: "approved" }
        console.log("[mock-email] Expense approved - notification sent to employee")
        return { ...s, expenses: s.expenses.map((e) => (e.id === id ? updated : e)) }
      }

      // Parallel flow with percentage rule
      const total = approverIds.length || 1
      const approvals = history.filter((h) => h.action === "approved")
      const requiredApproverIds = (rule?.approvers || []).filter((a) => a.isRequired).map((a) => a.approverId)
      const hasRequiredApproved = approvals.some((h) => requiredApproverIds.includes(h.approverId))

      const threshold = Math.min(Math.max(rule?.minimumApprovalPercentage ?? 100, 1), 100)
      const pct = (approvals.length / total) * 100

      if (hasRequiredApproved || pct >= threshold) {
        const updated: Expense = { ...exp, approvalHistory: history, currentApproverId: undefined, status: "approved" }
        console.log("[mock-email] Expense approved - notification sent to employee")
        return { ...s, expenses: s.expenses.map((e) => (e.id === id ? updated : e)) }
      }

      // Keep pending while collecting more votes
      const updated: Expense = { ...exp, approvalHistory: history }
      return { ...s, expenses: s.expenses.map((e) => (e.id === id ? updated : e)) }
    })
  },

  rejectExpense: (id) => {
    const me = get().currentUser
    if (!me) return
    set((s) => {
      const exp = s.expenses.find((e) => e.id === id)
      if (!exp || exp.status !== "pending_approval") return s

      const rule = exp.approvalRuleId ? s.rules.find((r) => r.id === exp.approvalRuleId) : null
      const approverIds = get().getApproverIdsForExpense(exp)
      const acted = (exp.approvalHistory || []).some((h) => h.approverId === me.id)
      if (!approverIds.includes(me.id) || acted) return s

      const history: ApprovalHistory[] = [
        ...(exp.approvalHistory || []),
        {
          id: crypto.randomUUID(),
          expenseId: exp.id,
          approverId: me.id,
          action: "rejected",
          approvedAt: new Date().toISOString(),
          sequenceStep: (exp.approvalHistory?.length || 0) + 1,
        },
      ]

      if (rule?.isSequential) {
        // any rejection rejects entire request
        const updated: Expense = { ...exp, approvalHistory: history, currentApproverId: undefined, status: "rejected" }
        console.log("[mock-email] Expense rejected - notification sent to employee")
        return { ...s, expenses: s.expenses.map((e) => (e.id === id ? updated : e)) }
      }

      // Parallel: do not auto-reject unless all votes are in and threshold not met
      const total = approverIds.length || 1
      const approvals = history.filter((h) => h.action === "approved")
      const requiredApproverIds = (rule?.approvers || []).filter((a) => a.isRequired).map((a) => a.approverId)
      const hasRequiredApproved = approvals.some((h) => requiredApproverIds.includes(h.approverId))

      const threshold = Math.min(Math.max(rule?.minimumApprovalPercentage ?? 100, 1), 100)
      const pct = (approvals.length / total) * 100

      if (hasRequiredApproved || pct >= threshold) {
        const updated: Expense = { ...exp, approvalHistory: history, currentApproverId: undefined, status: "approved" }
        console.log("[mock-email] Expense approved - notification sent to employee")
        return { ...s, expenses: s.expenses.map((e) => (e.id === id ? updated : e)) }
      }

      const uniqueVoters = new Set(history.map((h) => h.approverId)).size
      if (uniqueVoters >= total) {
        const updated: Expense = { ...exp, approvalHistory: history, currentApproverId: undefined, status: "rejected" }
        console.log("[mock-email] Expense rejected - notification sent to employee")
        return { ...s, expenses: s.expenses.map((e) => (e.id === id ? updated : e)) }
      }

      // Still pending
      const updated: Expense = { ...exp, approvalHistory: history }
      return { ...s, expenses: s.expenses.map((e) => (e.id === id ? updated : e)) }
    })
  },

  listRules: () => get().rules,
  createRule: (r) => set((s) => ({ rules: [r, ...s.rules] })),
  updateRule: (id, patch) => set((s) => ({ rules: s.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
  reorderRuleApprover: (ruleId, approverId, dir) =>
    set((s) => {
      const rule = s.rules.find((r) => r.id === ruleId)
      if (!rule) return s
      const sorted = [...rule.approvers].sort((a, b) => a.sequenceOrder - b.sequenceOrder)
      const idx = sorted.findIndex((a) => a.id === approverId)
      if (idx < 0) return s
      const swapIdx = dir === "up" ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= sorted.length) return s
      const a = sorted[idx]
      const b = sorted[swapIdx]
      ;[a.sequenceOrder, b.sequenceOrder] = [b.sequenceOrder, a.sequenceOrder]
      const next = s.rules.map((r) => (r.id === ruleId ? ({ ...r, approvers: sorted } as ApprovalRule) : r))
      return { ...s, rules: next }
    }),

  getRuleForEmployee: (employeeId) => {
    const u = get().users.find((x) => x.id === employeeId)
    if (!u) return null
    // basic strategy: first rule in company
    const rule = get().rules[0]
    return rule || null
  },

  getApproverIdsForExpense: (e) => {
    const { users, rules } = get()
    if (!e.approvalRuleId) {
      // fallback to manager if any
      const emp = users.find((u) => u.id === e.employeeId)
      return emp?.managerId ? [emp.managerId] : []
    }
    const rule = rules.find((r) => r.id === e.approvalRuleId)
    if (!rule) return []
    const emp = users.find((u) => u.id === e.employeeId)
    const seq: string[] = []
    if (rule.isManagerFirstApprover && emp?.managerId) seq.push(emp.managerId)
    const rest = [...rule.approvers].sort((a, b) => a.sequenceOrder - b.sequenceOrder).map((a) => a.approverId)
    for (const id of rest) if (!seq.includes(id)) seq.push(id)
    return seq
  },

  canCurrentUserActOn: (e) => {
    const me = get().currentUser
    if (!me) return false
    if (e.status !== "pending_approval") return false
    const rule = e.approvalRuleId ? get().rules.find((r) => r.id === e.approvalRuleId) : null
    const approverIds = get().getApproverIdsForExpense(e)
    if (!approverIds.includes(me.id)) return false
    const alreadyActed = (e.approvalHistory || []).some((h) => h.approverId === me.id)
    if (alreadyActed) return false
    if (rule?.isSequential) {
      return e.currentApproverId === me.id
    }
    // parallel
    return true
  },

  refresh: () => {
    // no-op for now; could re-fetch server data in future
  },
}))
