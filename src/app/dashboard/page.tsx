"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/state"
import { Spinner } from "@/components/ui/spinner"

export default function DashboardEntry() {
  const router = useRouter()
  const { currentUser } = useAppStore()

  useEffect(() => {
    if (!currentUser) {
      router.replace("/")
      return
    }
    if (currentUser.role === "admin") router.replace("/dashboard/admin/users")
    else if (currentUser.role === "manager") router.replace("/dashboard/manager/approvals")
    else router.replace("/dashboard/employee/expenses")
  }, [currentUser, router])

  return (
    <main className="min-h-[100svh] grid place-items-center">
      <Spinner />
    </main>
  )
}
