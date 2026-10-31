/** Coalesce wake-ups, including invalidations arriving during a failed read. */
export function createRefreshQueue(read: () => Promise<void>) {
  let running: Promise<void> | null = null;
  let again = false;
  return () => {
    if (running) { again = true; return running; }
    running = (async () => {
      let failure: unknown;
      do {
        again = false;
        try { await read(); failure = undefined; }
        catch (error) { failure = error; }
      } while (again);
      if (failure !== undefined) throw failure;
    })().finally(() => { running = null; });
    return running;
  };
}
