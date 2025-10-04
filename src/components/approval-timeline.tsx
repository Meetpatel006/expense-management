"use client"

import { Check, X } from "lucide-react"
import type { ApprovalHistory } from "@/lib/types"

export function ApprovalTimeline({ history }: { history: ApprovalHistory[] }) {
  if (!history?.length) {
    return <p className="text-sm text-muted-foreground">No approvals yet</p>
  }
  return (
    <ol className="relative border-s pl-4 space-y-3">
      {history.map((h) => (
        <li key={h.id} className="relative">
          <span
            className={`absolute -start-[11px] top-0 grid h-5 w-5 place-items-center rounded-full ${h.action === "approved" ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}
          >
            {h.action === "approved" ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          </span>
          <div className="text-sm">
            <span className="font-medium">{h.action === "approved" ? "Approved" : "Rejected"}</span>
            {h.comments ? (
              <span className="text-muted-foreground">
                {" • "}
                {h.comments}
              </span>
            ) : null}
          </div>
          <div className="text-xs text-muted-foreground">{new Date(h.approvedAt).toLocaleString()}</div>
        </li>
      ))}
    </ol>
  )
}
