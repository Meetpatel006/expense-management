"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useAppStore } from "@/lib/state"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { login } = useAppStore()

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = (values: z.infer<typeof loginSchema>) => {
    const ok = login(values.email, values.password)
    if (!ok) {
      toast({ title: "Login failed", description: "Invalid credentials", variant: "destructive" })
      return
    }
    router.push("/dashboard")
  }

  return (
    <main className="min-h-[100svh] grid place-items-center px-4">
      <div className="w-full max-w-md">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-balance">User Login</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-2">
                <Label htmlFor="loginEmail">Email</Label>
                <Input id="loginEmail" type="email" placeholder="you@company.com" {...form.register("email")} />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="loginPassword">Password</Label>
                <Input id="loginPassword" type="password" {...form.register("password")} />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
            </form>

            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium mb-2">Mock credentials</p>
              <ul className="grid gap-1">
                <li>
                  <span className="font-medium">Admin</span>: admin@company.com / admin1234
                </li>
                <li>
                  <span className="font-medium">Manager</span>: sarah@company.com / manager1234
                </li>
                <li>
                  <span className="font-medium">Employee</span>: marc@company.com / employee1234
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link href="/forgot-password" className="text-primary underline">
                Forgot password?
              </Link>
              <Link href="/signup" className="text-primary underline">
                Don&apos;t have an account? Signup
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
