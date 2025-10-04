import { redirect } from "next/navigation"

export default function IndexRedirect() {
  redirect("/auth/login")
}
