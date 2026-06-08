"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Image from "next/image"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

export default function AccountSelectionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const logoSrc = mounted && resolvedTheme === "dark" ? "/icon-darkmode.svg" : "/icon.svg"

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-16 border-b flex items-center justify-between px-4 md:px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          {mounted && (
            <Image
              src={logoSrc}
              alt="Budget App"
              width={32}
              height={32}
              className="h-8 w-8"
            />
          )}
          <span className="font-semibold text-lg">Budget App</span>
        </Link>
        <Button
          onClick={handleSignOut}
          variant="outline"
          size="sm"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}
