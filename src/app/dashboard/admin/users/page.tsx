"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAppStore } from "@/lib/state"
import type { User } from "@/lib/types"

export default function UsersPage() {
  const { usersByCompany, currentCompany, createUser, updateUser, sendPasswordMock } = useAppStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Partial<User>>({ role: "employee" as const })
  const { toast } = useToast()

  const users = usersByCompany()
  const managers = useMemo(() => users.filter((u) => u.role === "manager"), [users])

  const columns = [
    {
      header: "User",
      accessorKey: "name",
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-muted" aria-hidden />
          <div className="flex flex-col">
            <span className="text-sm">{row.getValue("name")}</span>
            <span className="text-xs text-muted-foreground">{row.original.email}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Role",
      accessorKey: "role",
      cell: (row: any) => (
        <Select
          value={row.getValue("role")}
          onValueChange={(v) => updateUser(row.original.id, { role: v as User["role"] })}
        >
          <SelectTrigger className="h-8 w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      header: "Manager",
      accessorKey: "managerId",
      cell: (row: any) => (
        <Select
          value={row.getValue("managerId") || "none"}
          onValueChange={(v) => updateUser(row.original.id, { managerId: v === "none" ? undefined : v })}
          disabled={row.original.role !== "employee"}
        >
          <SelectTrigger className="h-8 w-[180px]">
            <SelectValue placeholder="Assign manager" />
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
      ),
    },
    {
      header: "Email",
      accessorKey: "email",
    },
    {
      header: "Actions",
      cell: (row: any) => (
        <Button
          size="sm"
          onClick={() => {
            const pwd = sendPasswordMock(row.original.email)
            toast({ title: "Password sent", description: `Password sent to ${row.original.email}` })
            console.log("[mock-email] Generated password:", pwd)
          }}
        >
          Send Password
        </Button>
      ),
    },
  ]

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-pretty">User Management</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>New User</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input
                  value={form.name || ""}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  onBlur={() => {
                    /* could check if exists by email/name later */
                  }}
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input value={form.email || ""} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select value={form.role!} onValueChange={(v) => setForm((f) => ({ ...f, role: v as User["role"] }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Manager</Label>
                <Select
                  value={form.managerId || "none"}
                  onValueChange={(v) => setForm((f) => ({ ...f, managerId: v === "none" ? undefined : v }))}
                  disabled={form.role !== "employee"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign manager" />
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
              <Button
                onClick={() => {
                  if (!form.name || !form.email || !currentCompany) return
                  createUser({
                    id: crypto.randomUUID(),
                    name: form.name,
                    email: form.email.toLowerCase(),
                    role: (form.role || "employee") as User["role"],
                    managerId: form.role === "employee" ? form.managerId : undefined,
                    companyId: currentCompany.id,
                  })
                  setOpen(false)
                  setForm({ role: "employee" })
                }}
              >
                Submit
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Users</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={users}
            getRowId={(r: User) => r.id}
            emptyState={<div className="text-sm text-muted-foreground">No users yet</div>}
          />
          <div className="mt-4 flex gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary">
              Manager
            </Badge>
            <Badge variant="outline" className="bg-muted">
              Employee
            </Badge>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
