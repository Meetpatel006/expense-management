"use client"

import type React from "react"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Column<T> = {
  header: string
  accessorKey?: keyof T | string
  cell?: (row: any) => React.ReactNode
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  emptyState,
}: {
  columns: Column<T>[]
  data: T[]
  getRowId: (row: T) => string
  emptyState?: React.ReactNode
}) {
  const [q, setQ] = useState("")
  const rows = useMemo(() => {
    if (!q) return data
    const lower = q.toLowerCase()
    return data.filter((row: any) => JSON.stringify(row).toLowerCase().includes(lower))
  }, [q, data])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Input placeholder="Search..." className="max-w-xs h-8" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={String(c.header)}>{c.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row: any) => (
            <TableRow key={getRowId(row)}>
              {columns.map((c, idx) => {
                if (c.cell)
                  return <TableCell key={idx}>{c.cell({ original: row, getValue: (k: string) => row[k] })}</TableCell>
                const ak = c.accessorKey as string
                return <TableCell key={idx}>{(row as any)[ak]}</TableCell>
              })}
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length}>{emptyState || "No data"}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
