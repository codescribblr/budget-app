"use client";

import { usePathname } from "next/navigation";

/** Portals render outside the page shell, so they must carry its theme themselves. */
export function usePortalTheme() {
  const pathname = usePathname();
  return pathname === "/new" || pathname?.startsWith("/new/")
    ? "new-look-theme"
    : undefined;
}
