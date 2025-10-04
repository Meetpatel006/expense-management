"use client"

import type React from "react"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { StatusBadge } from "@/components/status-badge"
import { OCRUploadZone } from "@/components/ocr-upload-zone"
import { ApprovalTimeline } from "@/components/approval-timeline"
import { CurrencyConverterInline } from "@/components/currency-converter"
import { useAppStore } from "@/lib/state"
import type { Expense } from "@/lib/types"

const categories = ["Food", "Travel", "Accommodation", "Office Supplies", "Other"]

export default function EmployeeExpensesPage() {
  const { myExpenses, currentUser, currentCompany, createExpense, updateExpense, submitExpense } = useAppStore()
  const { toast } = useToast()
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null)
  const expenses = myExpenses()
  const filteredBy = (status?: Expense["status"]) => (!status ? expenses : expenses.filter((e) => e.status === status))
  const selectedExpense = selectedId && selectedId !== "new" ? expenses.find((e) => e.id === selectedId) : undefined

  const handleCreate = () => setSelectedId("new")

  const listTabs: { id: string; label: string; filter?: Expense["status"] }[] = [
    { id: "all", label: "All" },
    { id: "draft", label: "Draft", filter: "draft" },
    { id: "submitted", label: "Submitted", filter: "submitted" },
    { id: "pending_approval", label: "Waiting", filter: "pending_approval" },
    { id: "approved", label: "Approved", filter: "approved" },
    { id: "rejected", label: "Rejected", filter: "rejected" },
  ]

  return (
    <main className="p-4 md:p-6 grid gap-4 md:grid-cols-5">
      <section className="md:col-span-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">My Expenses</h1>
          <div className="flex gap-2">
            <Button onClick={handleCreate}>New</Button>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="all">
              <TabsList className="mb-4">
                {listTabs.map((t) => (
                  <TabsTrigger key={t.id} value={t.id}>
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {listTabs.map((t) => (
                <TabsContent key={t.id} value={t.id}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Paid By</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBy(t.filter).map((e) => (
                        <TableRow
                          key={e.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedId(e.id)}
                        >
                          <TableCell className="max-w-[220px] truncate">{e.description}</TableCell>
                          <TableCell>{e.expenseDate}</TableCell>
                          <TableCell>{e.category}</TableCell>
                          <TableCell>{e.paidBy || "-"}</TableCell>
                          <TableCell>
                            {e.amount} {e.currency}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={e.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredBy(t.filter).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                            No expenses
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </section>

      <section className="md:col-span-2 space-y-3">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle className="text-base">
              {selectedId === "new" ? "New Expense" : selectedExpense ? "Expense Detail" : "Select an expense"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedId && (
              <p className="text-sm text-muted-foreground">Choose an expense from the list or create a new one.</p>
            )}
            {selectedId && (
              <ExpenseDetailForm
                key={selectedId}
                mode={selectedId === "new" ? "new" : "detail"}
                expense={selectedExpense}
                onSave={(payload) => {
                  if (!currentUser || !currentCompany) return
                  if (selectedId === "new") {
                    const created = createExpense({
                      id: crypto.randomUUID(),
                      employeeId: currentUser.id,
                      amount: payload.amount,
                      currency: payload.currency,
                      amountInBaseCurrency: payload.amountInBaseCurrency ?? payload.amount,
                      category: payload.category,
                      description: payload.description,
                      expenseDate: payload.expenseDate,
                      status: "draft",
                      remarks: payload.remarks,
                      paidBy: payload.paidBy,
                    })
                    setSelectedId(created.id)
                  } else if (selectedExpense) {
                    updateExpense(selectedExpense.id, payload)
                  }
                }}
                onSubmit={(id) => {
                  submitExpense(id)
                }}
              />
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

function ExpenseDetailForm({
  mode,
  expense,
  onSave,
  onSubmit,
}: {
  mode: "new" | "detail"
  expense?: Expense
  onSave: (
    payload: Partial<Expense> & {
      amount: number
      currency: string
      description: string
      expenseDate: string
      category: string
    },
  ) => void
  onSubmit: (id: string) => void
}) {
  const { currentCompany } = useAppStore()
  const [local, setLocal] = useState({
    description: expense?.description || "",
    expenseDate: expense?.expenseDate || "",
    category: expense?.category || "",
    amount: expense?.amount || 0,
    currency: expense?.currency || (currentCompany?.baseCurrency ?? "USD"),
    paidBy: expense?.paidBy || "",
    remarks: expense?.remarks || "",
    receiptUrl: expense?.receiptUrl || "",
  })
  const isSubmitted = expense ? expense.status !== "draft" : false

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <div className="flex items-center gap-2 text-xs">
        <Step done={!!local.receiptUrl}>Attach Receipt</Step>
        <Connector />
  <Step done={expense ? expense.status !== "draft" : false}>{"Draft"}</Step>
        <Connector />
        <Step done={expense?.status === "pending_approval" || expense?.status === "approved"}>Waiting approval</Step>
        <Connector />
        <Step done={expense?.status === "approved"}>Approved</Step>
      </div>

      {/* OCR upload */}
      <OCRUploadZone
        disabled={isSubmitted}
        value={local.receiptUrl}
        onChange={(url, extracted) => {
          setLocal((s) => ({
            ...s,
            receiptUrl: url,
            amount: extracted?.amount ?? s.amount,
            currency: extracted?.currency ?? s.currency,
            expenseDate: extracted?.date ?? s.expenseDate,
            description: extracted?.vendor
              ? `${extracted.vendor}${s.description ? ` - ${s.description}` : ""}`
              : s.description,
            category: extracted?.category ?? s.category,
          }))
        }}
      />
      <p className="text-xs text-muted-foreground">
        Employee can submit expense in any currency (currency in which they spent the money in receipt)
      </p>

      {/* Form */}
      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label>Description</Label>
          <Input
            value={local.description}
            onChange={(e) => setLocal({ ...local, description: e.target.value })}
            disabled={isSubmitted}
          />
        </div>

        <div className="grid gap-2">
          <Label>Expense Date</Label>
          <Input
            type="date"
            value={local.expenseDate}
            onChange={(e) => setLocal({ ...local, expenseDate: e.target.value })}
            disabled={isSubmitted}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Category</Label>
            <Select
              value={local.category}
              onValueChange={(v) => setLocal({ ...local, category: v })}
              disabled={isSubmitted}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Paid By</Label>
            <Input
              value={local.paidBy}
              onChange={(e) => setLocal({ ...local, paidBy: e.target.value })}
              disabled={isSubmitted}
              placeholder="Cash / Card / Company"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2">
            <Label>Total Amount</Label>
            <Input
              type="number"
              value={local.amount}
              onChange={(e) => setLocal({ ...local, amount: Number(e.target.value) })}
              disabled={isSubmitted}
            />
          </div>
          <div className="grid gap-2">
            <Label>Currency</Label>
            <Select
              value={local.currency}
              onValueChange={(v) => setLocal({ ...local, currency: v })}
              disabled={isSubmitted}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "INR", "CNY"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {currentCompany && (
          <CurrencyConverterInline amount={local.amount} from={local.currency} to={currentCompany.baseCurrency} />
        )}

        <div className="grid gap-2">
          <Label>Remarks</Label>
          <Textarea
            value={local.remarks}
            onChange={(e) => setLocal({ ...local, remarks: e.target.value })}
            disabled={isSubmitted}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={() =>
            onSave({
              description: local.description,
              amount: local.amount,
              currency: local.currency,
              expenseDate: local.expenseDate,
              category: local.category,
              paidBy: local.paidBy,
              remarks: local.remarks,
            })
          }
          disabled={isSubmitted}
        >
          Save
        </Button>
        {expense && expense.status === "draft" && (
          <Button variant="secondary" onClick={() => onSubmit(expense.id)}>
            Submit
          </Button>
        )}
      </div>

      {expense && expense.status !== "draft" && (
        <>
          <h3 className="text-sm font-medium">Approval History</h3>
          <ApprovalTimeline history={expense.approvalHistory || []} />
        </>
      )}
    </div>
  )
}

function Step({ children, done }: { children: React.ReactNode; done?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-5 w-5 rounded-full grid place-items-center text-[10px] ${done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
      >
        •
      </div>
      <span className="text-xs">{children}</span>
    </div>
  )
}
function Connector() {
  return <div className="h-px flex-1 bg-border" aria-hidden />
}
