import { localDate } from "./new-look";

/** Follow local midnights (including DST), and catch up after a suspended tab. */
export function watchCheckinDay(onChange: (day: string) => void) {
  let timer: ReturnType<typeof setTimeout>;
  function update() {
    clearTimeout(timer);
    const now = new Date();
    onChange(localDate(now));
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    timer = setTimeout(update, midnight.getTime() - now.getTime() + 25);
  }
  update();
  window.addEventListener("focus", update);
  document.addEventListener("visibilitychange", update);
  return () => {
    clearTimeout(timer);
    window.removeEventListener("focus", update);
    document.removeEventListener("visibilitychange", update);
  };
}
