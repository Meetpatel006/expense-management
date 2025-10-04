"use client"

import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function CurrencyConverterInline({ amount, from, to }: { amount: number; from: string; to: string }) {
  const shouldConvert = from !== to && amount > 0
  const { data, isLoading, error } = useSWR(
    shouldConvert ? `https://api.exchangerate-api.com/v4/latest/${from}` : null,
    fetcher,
  )
  if (!shouldConvert)
    return (
      <span className="text-sm">
        {amount} {from}
      </span>
    )
  if (isLoading) return <span className="text-xs text-muted-foreground">Converting…</span>
  if (error || !data?.rates?.[to]) return <span className="text-xs text-destructive">Conversion unavailable</span>
  const rate = data.rates[to]
  const converted = (amount * rate).toFixed(2)
  return (
    <span className="text-sm">
      {amount} {from} = {converted} {to}
    </span>
  )
}
