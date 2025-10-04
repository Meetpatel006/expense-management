"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useAppStore } from "@/lib/state"
import type { ApprovalRule, RuleApprover, User } from "@/lib/types"

export default function ApprovalRulesPage() {
  const { usersByCompany, listRules, createRule, updateRule, reorderRuleApprover } = useAppStore()
  const users = usersByCompany()
  const managers = useMemo(() => users.filter((u) => u.role === "manager"), [users])
  const rules = listRules()

  const [form, setForm] = useState<Partial<ApprovalRule>>({
    ruleName: "",
    description: "",
    isManagerFirstApprover: true,
    isSequential: true,
    minimumApprovalPercentage: 100,
    approvers: [],
  })

  const addApprover = (uid: string) => {
    if (!uid) return
    setForm((f) => {
      const cur = f.approvers || []
      if (cur.some((a) => a.approverId === uid)) return f
      const next: RuleApprover = {
        id: crypto.randomUUID(),
        approverId: uid,
        sequenceOrder: (cur[cur.length - 1]?.sequenceOrder || 0) + 1,
        isRequired: false,
      }
      return { ...f, approvers: [...cur, next] }
    })
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Approval Rules</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create New Rule</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Rule name</Label>
              <Input
                value={form.ruleName || ""}
                onChange={(e) => setForm((f) => ({ ...f, ruleName: e.target.value }))}
                placeholder="Manager then Admin"
              />
            </div>
            <div className="grid gap-2">
              <Label>Manager (optional)</Label>
              <Select
                value={form.managerId || "none"}
                onValueChange={(v) => setForm((f) => ({ ...f, managerId: v === "none" ? undefined : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea
              value={form.description || ""}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Explain the rule purpose"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={!!form.isManagerFirstApprover}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isManagerFirstApprover: !!v }))}
                id="mgr-first"
              />
              <Label htmlFor="mgr-first">Is manager an approver?</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={!!form.isSequential}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isSequential: !!v }))}
                id="seq"
              />
              <Label htmlFor="seq">Approvers Sequence (Sequential)</Label>
            </div>
            <div className="grid gap-2">
              <Label>Minimum Approval Percentage</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.minimumApprovalPercentage ?? 100}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    minimumApprovalPercentage: Math.min(Math.max(Number(e.target.value), 1), 100),
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Specify the percentage of approvers required to approve the request
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Approvers</h3>
              <Select onValueChange={addApprover}>
                <SelectTrigger className="h-8 w-[220px]">
                  <SelectValue placeholder="Add approver…" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}{" "}
                      <Badge variant="outline" className="ml-2 text-xs">
                        {u.role}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              {(form.approvers || [])
                .slice()
                .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
                .map((a, idx, arr) => {
                  const u = users.find((x) => x.id === a.approverId)
                  return (
                    <div key={a.id} className="flex items-center justify-between rounded-md border p-2">
                      <div className="flex items-center gap-3">
                        <span className="w-6 text-sm text-muted-foreground">{idx + 1}</span>
                        <span className="text-sm">{u?.name || "Unknown"}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <Checkbox
                            checked={a.isRequired}
                            onCheckedChange={(v) =>
                              setForm((f) => ({
                                ...f,
                                approvers: (f.approvers || []).map((x) =>
                                  x.id === a.id ? { ...x, isRequired: !!v } : x,
                                ),
                              }))
                            }
                            id={`req-${a.id}`}
                          />
                          <Label htmlFor={`req-${a.id}`}>Required</Label>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setForm((f) => {
                              const list = (f.approvers || []).slice().sort((a, b) => a.sequenceOrder - b.sequenceOrder)
                              if (idx <= 0) return f
                              ;[list[idx - 1].sequenceOrder, list[idx].sequenceOrder] = [
                                list[idx].sequenceOrder,
                                list[idx - 1].sequenceOrder,
                              ]
                              return { ...f, approvers: list }
                            })
                          }
                          disabled={idx === 0}
                        >
                          Up
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setForm((f) => {
                              const list = (f.approvers || []).slice().sort((a, b) => a.sequenceOrder - b.sequenceOrder)
                              if (idx >= arr.length - 1) return f
                              ;[list[idx + 1].sequenceOrder, list[idx].sequenceOrder] = [
                                list[idx].sequenceOrder,
                                list[idx + 1].sequenceOrder,
                              ]
                              return { ...f, approvers: list }
                            })
                          }
                          disabled={idx === arr.length - 1}
                        >
                          Down
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              approvers: (f.approvers || []).filter((x) => x.id !== a.id),
                            }))
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  )
                })}
              {!(form.approvers || []).length && (
                <div className="text-sm text-muted-foreground">No approvers added yet.</div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              onClick={() => {
                if (!form.ruleName) return
                const newRule: ApprovalRule = {
                  id: crypto.randomUUID(),
                  ruleName: form.ruleName!,
                  description: form.description,
                  managerId: form.managerId,
                  isManagerFirstApprover: !!form.isManagerFirstApprover,
                  isSequential: !!form.isSequential,
                  minimumApprovalPercentage: form.minimumApprovalPercentage ?? 100,
                  approvers: (form.approvers || []).slice(),
                }
                createRule(newRule)
                setForm({
                  ruleName: "",
                  description: "",
                  isManagerFirstApprover: true,
                  isSequential: true,
                  minimumApprovalPercentage: 100,
                  approvers: [],
                })
              }}
            >
              Create Rule
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Existing Rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rules.map((r) => {
            const line = [
              r.isSequential ? "Sequential approval" : "Parallel approval",
              `${r.minimumApprovalPercentage ?? 100}% min`,
              r.isManagerFirstApprover ? "Manager first" : "No manager first",
            ].join(" • ")
            return (
              <div key={r.id} className="border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{r.ruleName}</div>
                    <div className="text-xs text-muted-foreground">{line}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">ID: {r.id}</div>
                </div>
                <div className="grid gap-2">
                  {(r.approvers || [])
                    .slice()
                    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
                    .map((a, idx, arr) => {
                      const u = users.find((x) => x.id === a.approverId)
                      return (
                        <div key={a.id} className="flex items-center justify-between rounded-md border p-2">
                          <div className="flex items-center gap-3">
                            <span className="w-6 text-sm text-muted-foreground">{idx + 1}</span>
                            <span className="text-sm">{u?.name || a.approverId}</span>
                            {a.isRequired && (
                              <Badge variant="outline" className="bg-warning/15 text-warning">
                                Required
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => reorderRuleApprover(r.id, a.id, "up")}
                              disabled={idx === 0}
                            >
                              Up
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => reorderRuleApprover(r.id, a.id, "down")}
                              disabled={idx === arr.length - 1}
                            >
                              Down
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  {!(r.approvers || []).length && (
                    <div className="text-sm text-muted-foreground">No approvers listed.</div>
                  )}
                </div>
                {/* Visual flow */}
                <div className="pt-2">
                  <FlowPreview rule={r} users={users} />
                </div>
              </div>
            )
          })}
          {rules.length === 0 && <div className="text-sm text-muted-foreground">No rules yet.</div>}
        </CardContent>
      </Card>
    </main>
  )
}

function FlowPreview({ rule, users }: { rule: ApprovalRule; users: User[] }) {
  // simple flow preview using arrows/boxes
  const approverNames = rule.approvers
    .slice()
    .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
    .map((a) => users.find((u) => u.id === a.approverId)?.name || a.approverId)
  const items = [rule.isManagerFirstApprover ? "Manager" : null, ...approverNames].filter(Boolean) as string[]

  return (
    <div className="flex items-center flex-wrap gap-2 text-xs">
      {items.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="rounded-md border px-2 py-1 bg-card">{label}</div>
          {i < items.length - 1 && (
            <span aria-hidden className="text-muted-foreground">
              →
            </span>
          )}
        </div>
      ))}
      {!items.length && <div className="text-muted-foreground">No approvers configured</div>}
    </div>
  )
}
