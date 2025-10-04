"use client"

import { Badge } from "@/components/ui/badge"
import type { Expense } from "@/lib/types"

export function StatusBadge({ status }: { status: Expense["status"] }) {
  const map: Record<Expense["status"], string> = {
    draft: "bg-muted text-muted-foreground",
    submitted: "bg-warning/15 text-warning",
    pending_approval: "bg-warning/15 text-warning",
    approved: "bg-success/15 text-success",
    rejected: "bg-destructive/15 text-destructive",
  }
  return (
    <Badge variant="outline" className={map[status]}>
      {status.replace("_", " ")}
    </Badge>
  )
}
