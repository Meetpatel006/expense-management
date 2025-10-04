"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAppStore } from "@/lib/state"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"

const NavLink = ({ href, label }: { href: string; label: string }) => {
  const pathname = usePathname()
  const active = pathname === href
  return (
    <Link
      href={href}
      className={`block rounded-md px-3 py-2 text-sm ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
    >
      {label}
    </Link>
  )
}

export function RoleBasedLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, logout } = useAppStore()
  const { theme, setTheme } = useTheme()

  return (
    <div className="min-h-[100svh] grid grid-rows-[auto_1fr]">
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <div className="text-sm">Expense App</div>
        <div className="flex items-center gap-2 text-sm">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "Light" : "Dark"}
          </Button>
          <span className="text-muted-foreground">{currentUser?.name}</span>
          <Button size="sm" variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>
      </header>
      <div className="grid md:grid-cols-[240px_1fr]">
        <aside className="hidden md:block border-r p-4 space-y-2">
          {currentUser?.role === "admin" && (
            <>
              <div className="text-xs text-muted-foreground px-3">Admin</div>
              <NavLink href="/dashboard/admin/users" label="Users" />
              <NavLink href="/dashboard/admin/expenses" label="All Expenses" />
              <NavLink href="/dashboard/admin/approval-rules" label="Approval Rules" />
            </>
          )}
          {currentUser?.role === "manager" && (
            <>
              <div className="text-xs text-muted-foreground px-3">Manager</div>
              <NavLink href="/dashboard/manager/approvals" label="Approvals" />
              <NavLink href="/dashboard/manager/team-expenses" label="Team Expenses" />
            </>
          )}
          {currentUser?.role === "employee" && (
            <>
              <div className="text-xs text-muted-foreground px-3">Employee</div>
              <NavLink href="/dashboard/employee/expenses" label="My Expenses" />
            </>
          )}
        </aside>
        <main className="min-h-[70svh]">{children}</main>
      </div>
    </div>
  )
}
