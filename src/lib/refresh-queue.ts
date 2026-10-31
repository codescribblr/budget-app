/** Coalesce wake-ups, but never lose an invalidation arriving during a read. */
export function createRefreshQueue(read: () => Promise<void>) {
  let running: Promise<void> | null = null;
  let again = false;
  return () => {
    if (running) { again = true; return running; }
    running = (async () => {
      do { again = false; await read(); } while (again);
    })().finally(() => { running = null; });
    return running;
  };
}
