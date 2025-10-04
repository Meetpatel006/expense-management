"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAppStore } from "@/lib/state"
import { StatusBadge } from "@/components/status-badge"
import { ApprovalTimeline } from "@/components/approval-timeline"
import { CurrencyConverterInline } from "@/components/currency-converter"

export default function ApprovalsPage() {
  const { approvalsAssignedToMe, currentCompany, approveExpense, rejectExpense, refresh, canCurrentUserActOn } =
    useAppStore()
  const approvals = approvalsAssignedToMe()
  const [openId, setOpenId] = useState<string | null>(null)

  const record = approvals.find((a) => a.id === openId)

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Approvals to Review</h1>
        <Button variant="outline" onClick={refresh}>
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Approval Subject</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {approvals.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="max-w-[220px] truncate">{e.description}</TableCell>
                  <TableCell>
                    {/* Owner name shown via store helper */}
                    {e.__ownerName}
                  </TableCell>
                  <TableCell>{e.category}</TableCell>
                  <TableCell>
                    <StatusBadge status={e.status} />
                  </TableCell>
                  <TableCell>
                    {currentCompany?.baseCurrency ? (
                      <CurrencyConverterInline amount={e.amount} from={e.currency} to={currentCompany.baseCurrency} />
                    ) : (
                      `${e.amount} ${e.currency}`
                    )}
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" onClick={() => setOpenId(e.id)}>
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => approveExpense(e.id)}
                      disabled={!canCurrentUserActOn(e)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rejectExpense(e.id)}
                      disabled={!canCurrentUserActOn(e)}
                    >
                      Reject
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {approvals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    No pending approvals
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approval Detail</DialogTitle>
          </DialogHeader>
          {record && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Description: </span>
                  {record.description}
                </div>
                <div>
                  <span className="text-muted-foreground">Category: </span>
                  {record.category}
                </div>
                <div>
                  <span className="text-muted-foreground">Original: </span>
                  {record.amount} {record.currency}
                </div>
                <div>
                  <span className="text-muted-foreground">Converted: </span>
                  <CurrencyConverterInline amount={record.amount} from={record.currency} to={record.__baseCurrency || "USD"} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Converted to {record.__baseCurrency || "USD"} using real-time rates
              </p>
              <h3 className="text-sm font-medium">Approval History</h3>
              <ApprovalTimeline history={record.approvalHistory || []} />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="default"
                  onClick={() => {
                    approveExpense(record.id)
                    setOpenId(null)
                  }}
                  disabled={!canCurrentUserActOn(record)}
                >
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    rejectExpense(record.id)
                    setOpenId(null)
                  }}
                  disabled={!canCurrentUserActOn(record)}
                >
                  Reject
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
