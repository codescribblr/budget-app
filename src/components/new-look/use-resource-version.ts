"use client";
import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { resourceRefresh, type ResourceFamily } from "@/lib/resource-refresh";
/** Shared screens participate only while mounted in the new interface. No socket,
 * timer or global fetch is created by an individual view. */
export function useResourceVersion(...resources: ResourceFamily[]) {
  const modern = usePathname()?.startsWith("/new");
  return useSyncExternalStore(
    resourceRefresh.subscribe,
    () => (modern ? resourceRefresh.snapshot(resources) : 0),
    () => 0,
  );
}
