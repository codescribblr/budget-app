"use client"

import { useEffect } from "react"
import LogRocket from "logrocket"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

// Initialize LogRocket only once
let logRocketInitialized = false

export function LogRocketProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only initialize LogRocket in production or if explicitly enabled
    const appId = process.env.NEXT_PUBLIC_LOGROCKET_APP_ID
    const shouldInit = process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_LOGROCKET_ENABLED === "true"

    if (!appId || !shouldInit || logRocketInitialized) {
      return
    }

    try {
      LogRocket.init(appId, {
        // Configure LogRocket options
        dom: {
          // Mask sensitive data
          inputSanitizer: true,
          // Don't record text inputs by default (can be configured per input)
          textSanitizer: true,
        },
        // Network request capture
        network: {
          isEnabled: true,
          requestSanitizer: (request) => {
            // Don't capture sensitive headers
            if (request.headers) {
              delete request.headers["authorization"]
              delete request.headers["cookie"]
            }
            return request
          },
        },
      })

      logRocketInitialized = true
      console.log("LogRocket initialized")
    } catch (error) {
      console.error("Failed to initialize LogRocket:", error)
    }
  }, [])

  // Set up user identification when auth state changes
  useEffect(() => {
    const supabase = createClient()

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && logRocketInitialized) {
        identifyUser(user)
      }
    })

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && logRocketInitialized) {
        identifyUser(session.user)
      }
      // Note: LogRocket doesn't have a clear/identify(null) method
      // User identification will persist until a new user is identified
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return <>{children}</>
}

function identifyUser(user: User) {
  if (!logRocketInitialized) return

  try {
    const traits: Record<string, string | number | boolean> = {
      name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
      created_at: user.created_at,
    }
    
    // Only include email if it exists
    if (user.email) {
      traits.email = user.email
    }
    
    LogRocket.identify(user.id, traits)
  } catch (error) {
    console.error("Failed to identify user in LogRocket:", error)
  }
}


