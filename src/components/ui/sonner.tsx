"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { usePortalTheme } from "@/hooks/use-portal-theme"
import { cn } from "@/lib/utils"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ className, style, ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()
  const portalTheme = usePortalTheme()
  const guided = Boolean(portalTheme)

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position={guided ? "top-right" : "bottom-right"}
      closeButton={guided}
      className={cn("toaster group", portalTheme, guided && "nl-toaster", className)}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          ...style,
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }

