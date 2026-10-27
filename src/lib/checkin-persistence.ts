import { checkinPeriod, type Cadence } from "./new-look";
import { checkinSteps, parseCheckinProgress } from "./checkins";

export interface CheckinRecord {
  items: Record<string, string>;
  completedAt: string | null;
}
export interface CheckinScope {
  userId: string;
  accountId: number;
  cadence: Cadence;
  period: string;
  timeZone: string;
  planning: boolean;
}
export function checkinScopeKey(scope: CheckinScope) {
  return `${scope.userId}:${scope.accountId}:${scope.cadence}:${scope.period}`;
}
/** Calendar dates in the user's zone, regardless of the API server's zone. */
export function zonedCheckinPeriod(
  cadence: Cadence,
  date: Date,
  timeZone: string,
) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  return checkinPeriod(
    cadence,
    new Date(`${part("year")}-${part("month")}-${part("day")}T12:00:00`),
  );
}
export function currentReviewItems(
  value: string | null,
  scope: CheckinScope,
  now = new Date(),
) {
  const allowed = checkinSteps(scope.cadence, true).map((s) => s.key as string);
  return Object.fromEntries(
    Object.entries(parseCheckinProgress(value)).filter(
      ([task, date]) =>
        allowed.includes(task) &&
        Date.parse(date) <= now.getTime() + 60_000 &&
        zonedCheckinPeriod(scope.cadence, new Date(date), scope.timeZone) ===
          scope.period,
    ),
  );
}
/** Preserve current browser-only reviews when moving to account persistence.
 * Read both old Monday-start keys that overlap a Sunday-start week. */
export function legacyCheckinItems(
  scope: CheckinScope,
  read: (key: string) => string | null,
) {
  const prefix = `budget-checkin:v1:${scope.userId}:${scope.accountId}:${scope.cadence}:`;
  const keys = new Set([scope.period]);
  if (scope.cadence === "weekly") {
    const sunday = new Date(`${scope.period}T12:00:00`);
    for (const delta of [-6, 1]) {
      const monday = new Date(sunday);
      monday.setDate(monday.getDate() + delta);
      keys.add(checkinPeriod("daily", monday));
    }
  }
  return Object.assign(
    {},
    ...[...keys].map((key) => currentReviewItems(read(prefix + key), scope)),
  );
}
