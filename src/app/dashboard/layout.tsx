"use client"

import { useEffect } from "react"
import type { ReactNode } from "react"
import { useRouter } from "next/navigation"
import { RoleBasedLayout } from "@/components/role-based-layout"

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    try {
      const m = document.cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith("auth="))
      if (!m) {
        router.replace("/auth/login")
      }
    } catch (e) {
      router.replace("/auth/login")
    }
  }, [router])

  return <RoleBasedLayout>{children}</RoleBasedLayout>
}
