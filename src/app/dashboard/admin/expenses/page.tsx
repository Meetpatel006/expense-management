"use client"

import { useAppStore } from "@/lib/state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

export default function AdminAllExpensesPage() {
  const { expenses, users } = useAppStore.getState()
  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">All Expenses</h1>
        <Button
          variant="outline"
          onClick={() => {
            const header = ["Description", "Employee", "Date", "Category", "Amount", "Currency", "Status"]
            const rows = expenses.map((e) => [
              `"${e.description?.replace(/"/g, '""')}"`,
              `"${(users.find((u) => u.id === e.employeeId)?.name || "-").replace(/"/g, '""')}"`,
              e.expenseDate,
              e.category,
              e.amount,
              e.currency,
              e.status,
            ])
            const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n")
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const a = document.createElement("a")
            a.href = url
            a.download = "expenses.csv"
            a.click()
            URL.revokeObjectURL(url)
          }}
        >
          Export CSV
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="max-w-[220px] truncate">{e.description}</TableCell>
                  <TableCell>{users.find((u) => u.id === e.employeeId)?.name || "—"}</TableCell>
                  <TableCell>{e.expenseDate}</TableCell>
                  <TableCell>{e.category}</TableCell>
                  <TableCell>
                    {e.amount} {e.currency}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={e.status} />
                  </TableCell>
                </TableRow>
              ))}
              {expenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-sm text-muted-foreground text-center">
                    No data
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  )
}
