import type React from "react"
import type { Metadata } from "next"
// Removed missing geist font imports. Font fallbacks are provided in globals.css
import { Suspense } from "react"
import "@/styles/globals.css"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata: Metadata = {
  title: "Expense App",
  description: "Expense management with approvals",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`antialiased`}>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <Suspense fallback={null}>{children}</Suspense>
        </ThemeProvider>
      </body>
    </html>
  )
}
