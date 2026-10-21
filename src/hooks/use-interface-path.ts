"use client";
import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { currentInterfacePath } from "@/lib/new-look";
/** Shared workflows keep their destinations in the currently active interface. */
export function useInterfacePath() {
 const pathname = usePathname();
 const modern = pathname === "/new" || pathname.startsWith("/new/");
 return useCallback((path: string) => currentInterfacePath(path,modern),[modern]);
}
