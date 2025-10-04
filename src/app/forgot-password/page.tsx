"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)

  const onSend = () => {
    setSent(true)
    console.log("[mock-email] Password reset link sent to", email)
  }

  return (
    <main className="min-h-[100svh] grid place-items-center p-4">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader>
          <CardTitle>Password Reset</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sent ? (
            <p className="text-sm">Password reset link sent to your email</p>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
              <Button onClick={onSend} className="w-full">
                Send Reset Link
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
