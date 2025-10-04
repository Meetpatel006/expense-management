"use client"

import type { ReactNode } from "react"
import { RoleBasedLayout } from "@/components/role-based-layout"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <RoleBasedLayout>{children}</RoleBasedLayout>
}
