import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { watchCheckinDay } from "../checkin-calendar";
import { localDate } from "../new-look";

let stop: (() => void) | undefined;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("document", new EventTarget());
});
afterEach(() => {
  stop?.();
  stop = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("open check-in calendar", () => {
  it("rolls over at midnight without needing a reload and cleans up on unmount", () => {
    vi.setSystemTime(new Date(2026, 9, 31, 23, 59, 59));
    const onChange = vi.fn();
    stop = watchCheckinDay(onChange);
    expect(onChange).toHaveBeenLastCalledWith("2026-10-31");
    vi.advanceTimersByTime(1100);
    expect(onChange).toHaveBeenLastCalledWith("2026-11-01");
    stop();
    expect(vi.getTimerCount()).toBe(0);
    onChange.mockClear();
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
    expect(onChange).not.toHaveBeenCalled();
  });
  it("catches up when a sleeping tab returns after several calendar periods", () => {
    vi.setSystemTime(new Date(2026, 9, 25, 20));
    const onChange = vi.fn();
    stop = watchCheckinDay(onChange);
    vi.setSystemTime(new Date(2026, 10, 2, 9));
    window.dispatchEvent(new Event("focus"));
    expect(onChange).toHaveBeenLastCalledWith("2026-11-02");
    vi.setSystemTime(new Date(2026, 10, 3, 9));
    document.dispatchEvent(new Event("visibilitychange"));
    expect(onChange).toHaveBeenLastCalledWith("2026-11-03");
    expect(vi.getTimerCount()).toBe(1);
  });
  it.each([new Date(2026, 2, 8), new Date(2026, 10, 1)])(
    "waits for local midnight across clock changes on %s",
    (date) => {
      vi.setSystemTime(date);
      const onChange = vi.fn();
      stop = watchCheckinDay(onChange);
      const midnight = new Date(date);
      midnight.setDate(midnight.getDate() + 1);
      vi.advanceTimersByTime(midnight.getTime() - date.getTime() - 1);
      expect(onChange).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(26);
      expect(onChange).toHaveBeenLastCalledWith(localDate(midnight));
    },
  );
});
