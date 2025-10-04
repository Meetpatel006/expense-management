"use client"

import Link from "next/link"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAppStore } from "@/lib/state"
import type { Company, User } from "@/lib/types"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type CountryItem = {
  name?: { common?: string }
  currencies?: Record<string, { name?: string; symbol?: string }>
}

const signupSchema = z
  .object({
    companyName: z.string().min(2, "Company name is required"),
    adminName: z.string().min(2, "Name is required"),
    email: z.string().email(),
    password: z.string().min(8, "Min 8 characters"),
    confirmPassword: z.string().min(8),
    country: z.string().min(1, "Country is required"),
  })
  .refine((val) => val.password === val.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })

export default function SignupPage() {
  const [selectedCountry, setSelectedCountry] = useState("")
  const router = useRouter()
  const { toast } = useToast()
  const { upsertCompanyAndAdmin } = useAppStore()
  const { data: countries } = useSWR<CountryItem[]>(
    "https://restcountries.com/v3.1/all?fields=name,currencies",
    fetcher,
  )

  const countryOptions = useMemo(() => {
    if (!countries) return []
    return countries
      .map((c) => {
        const name = c.name?.common || ""
        const currencyCode = c.currencies ? Object.keys(c.currencies)[0] : ""
        const symbol = currencyCode ? c.currencies?.[currencyCode]?.symbol || "" : ""
        return { name, currencyCode, symbol }
      })
      .filter((c) => !!c.name)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [countries])

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      companyName: "",
      adminName: "",
      email: "",
      password: "",
      confirmPassword: "",
      country: "",
    },
  })

  useEffect(() => {
    if (selectedCountry) form.setValue("country", selectedCountry)
  }, [selectedCountry, form])

  const onSubmit = (values: z.infer<typeof signupSchema>) => {
    const country = countryOptions.find((c) => c.name === values.country)
    const baseCurrency = country?.currencyCode || "USD"
    const company: Company = {
      id: crypto.randomUUID(),
      name: values.companyName,
      baseCurrency,
      country: values.country,
    }
    const admin: User = {
      id: crypto.randomUUID(),
      name: values.adminName,
      email: values.email,
      role: "admin",
      companyId: company.id,
      password: values.password, // persist password for mock auth
    }
    upsertCompanyAndAdmin(company, admin)
    toast({ title: "Signup successful", description: `Base currency set to ${baseCurrency}` })
    router.push("/dashboard")
  }

  return (
    <main className="min-h-[100svh] grid place-items-center px-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-balance">Admin / Company Signup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" placeholder="Tech Corp" {...form.register("companyName")} />
                {form.formState.errors.companyName && (
                  <p className="text-sm text-destructive">{form.formState.errors.companyName.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adminName">Admin Name</Label>
                <Input id="adminName" placeholder="Jane Doe" {...form.register("adminName")} />
                {form.formState.errors.adminName && (
                  <p className="text-sm text-destructive">{form.formState.errors.adminName.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="signupEmail">Email</Label>
                <Input id="signupEmail" type="email" placeholder="admin@company.com" {...form.register("email")} />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" {...form.register("password")} />
                  {form.formState.errors.password && (
                    <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input id="confirmPassword" type="password" {...form.register("confirmPassword")} />
                  {form.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Country</Label>
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger aria-label="Select country">
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {countryOptions.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name}
                        {c.currencyCode ? ` • ${c.currencyCode}${c.symbol ? ` (${c.symbol})` : ""}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.country && (
                  <p className="text-sm text-destructive">{form.formState.errors.country.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Create Company & Admin
              </Button>
            </form>
            <div className="text-sm text-center">
              Already have an account?{" "}
              <Link href="/login" className="text-primary underline">
                Log in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
