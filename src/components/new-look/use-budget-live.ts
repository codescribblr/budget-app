"use client";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** A single shared browser client multiplexes both private topics. Realtime only
 * invalidates reads; it never applies financial payloads or retries mutations. */
export function useBudgetLive(accountId: number | undefined, userId: string | undefined, refresh: () => Promise<void>) {
  useEffect(() => {
    if (!accountId || !userId || process.env.NEXT_PUBLIC_BUDGET_LIVE_SYNC === "false") return;
    const client = createClient();
    let channels: ReturnType<typeof client.channel>[] = [];
    let timer: ReturnType<typeof setTimeout>;
    let disposed = false;
    let generation = 0;
    let starting = false;
    const update = (checkins = false) => {
      if (disposed || document.visibilityState === "hidden") return;
      if (checkins) window.dispatchEvent(new Event("budget:checkins-refresh"));
      else { clearTimeout(timer); timer = setTimeout(() => void refresh().catch(() => {}), 250); }
    };
    const stop = () => {
      generation++; starting = false;
      clearTimeout(timer);
      channels.forEach(channel => { void client.removeChannel(channel); });
      channels = [];
    };
    const start = async () => {
      if (document.visibilityState === "hidden" || !navigator.onLine) { stop(); return; }
      if (channels.length || starting) return;
      starting = true;
      const token = ++generation;
      try {
        const { data } = await client.auth.getSession();
        if (!data.session || disposed || token !== generation) return;
        await client.realtime.setAuth(data.session.access_token);
        if (disposed || token !== generation || document.hidden) return;
      for (const personal of [false, true]) {
        const topic = `budget-sync:${accountId}${personal ? `:user:${userId}` : ""}`;
        const channel = client.channel(topic, { config: { private: true } })
          .on("broadcast", { event: "invalidate" }, () => update(personal))
          .subscribe(status => { if (status === "SUBSCRIBED") update(personal); });
        channels.push(channel);
      }
      } catch { /* Resume/periodic HTTP refresh remains available. */ }
      finally { if (token === generation) starting = false; }
    };
    start();
    document.addEventListener("visibilitychange", start);
    window.addEventListener("online", start);
    window.addEventListener("offline", stop);
    return () => {
      disposed = true; stop();
      document.removeEventListener("visibilitychange", start);
      window.removeEventListener("online", start);
      window.removeEventListener("offline", stop);
    };
  }, [accountId, userId, refresh]);
}
