"use client";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { parseCheckinProgress } from "@/lib/checkins";

// Share progress across the header, footer and home, including when storage is
// unavailable. The key includes the user, household, cadence and calendar period.
const cache = new Map<string, Record<string, string>>();
const listeners = new Set<() => void>();
let listening = false;
const notify = () => listeners.forEach((listener) => listener());
function storageChanged(event: StorageEvent) {
  if (event.key) cache.delete(event.key);
  else cache.clear();
  notify();
}
function subscribe(listener: () => void) {
  if (!listening) {
    window.addEventListener("storage", storageChanged);
    listening = true;
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function read(key: string) {
  if (!cache.has(key)) {
    try {
      cache.set(key, parseCheckinProgress(localStorage.getItem(key)));
    } catch {
      cache.set(key, {});
    }
  }
  return cache.get(key)!;
}
const empty: Record<string, string> = {};
function write(key: string, updated: Record<string, string>) {
  cache.set(key, updated);
  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    toast.warning(
      "Review progress is kept for this visit, but could not be saved in this browser. Your budget is unaffected.",
    );
  }
  notify();
  return updated;
}
export function useCheckinProgress(key: string | null) {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => (key ? read(key) : null),
    () => null,
  );
  function mark(task: string, done = true) {
    if (!key) return empty;
    const updated = { ...read(key) };
    if (done) updated[task] ??= new Date().toISOString();
    else delete updated[task];
    return write(key, updated);
  }
  return { items: snapshot ?? empty, ready: snapshot !== null, mark };
}
