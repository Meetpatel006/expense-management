"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"

type OCRData = {
  amount: number
  currency: string
  date: string
  vendor: string
  category: string
  lineItems: { description: string; amount: number }[]
}

export function OCRUploadZone({
  value,
  onChange,
  disabled,
}: {
  value?: string
  onChange: (url: string, extracted?: Partial<OCRData>) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  const handleFile = (file: File) => {
    setLoading(true)
    const url = URL.createObjectURL(file)
    setTimeout(() => {
      // Mock extracted data
      onChange(url, {
        amount: 567,
        currency: "USD",
        date: "2025-10-10",
        vendor: "Restaurant XYZ",
        category: "Food",
      })
      setLoading(false)
    }, 2000)
  }

  return (
    <div className={`border rounded-md p-3 ${disabled ? "opacity-60 pointer-events-none" : ""}`}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">
          <div className="font-medium">Attach Receipt</div>
          <div className="text-xs text-muted-foreground">
            Drag & drop or click upload. {loading ? "Processing OCR…" : value ? "Uploaded" : "No file"}
          </div>
        </div>
        <Button size="sm" onClick={() => inputRef.current?.click()} disabled={loading}>
          Upload
        </Button>
      </div>
      {value && (
        <div className="mt-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value || "/placeholder.svg"}
            alt="Receipt preview"
            className="max-h-40 rounded-md object-contain"
            crossOrigin="anonymous"
          />
        </div>
      )}
    </div>
  )
}
