import { checkinPeriod, type Cadence } from "./new-look";

export type CheckinTask =
  | "accounts"
  | "budget"
  | "imports"
  | "reports"
  | "plan"
  | "goals";
export interface CheckinStep {
  key: CheckinTask;
  label: string;
  title: string;
  detail: string;
  href: string;
}

/** A task is guided only when a valid check-in was explicitly requested. */
export function taskCheckin(
  task: CheckinTask,
  requested: string | null,
): Cadence | null {
  if (
    requested !== "daily" &&
    requested !== "weekly" &&
    requested !== "monthly"
  )
    return null;
  return checkinSteps(requested, true).some((step) => step.key === task)
    ? requested
    : null;
}
export function checkinSteps(
  cadence: Cadence,
  planning: boolean,
): CheckinStep[] {
  const step = (
    key: CheckinTask,
    label: string,
    title: string,
    detail: string,
  ): CheckinStep => ({ key, label, title, detail, href: `/new/${key}` });
  if (cadence === "daily")
    return [
      step(
        "accounts",
        "Balances",
        "Keep recorded balances current",
        "Check your bank balances and each card’s available credit in one pass.",
      ),
      step(
        "budget",
        "Envelopes",
        "Check the envelopes you’ll use",
        "Scan your envelopes before spending. Move money only if it helps your plan.",
      ),
    ];
  if (cadence === "weekly")
    return [
      step(
        "imports",
        "Import spending",
        "Catch up on where your money went",
        "Import CSVs from your banks and cards. Review descriptions, categories, and duplicates before adding transactions.",
      ),
      step(
        "reports",
        "Spending",
        "Look at your spending",
        "Review the past week. Notice what changed and where spending is ahead of plan.",
      ),
      step(
        "budget",
        "Envelopes",
        "Bring your envelopes back into balance",
        "Cover overages and reconsider money that could serve another purpose.",
      ),
    ];
  return [
    step(
      "reports",
      "Look back",
      "Reflect on the month",
      "Review the previous month. Use what actually happened to shape the next plan.",
    ),
    step(
      "plan",
      "Monthly plan",
      "Make a realistic monthly plan",
      "Review your income and funding targets. Make room for irregular expenses.",
    ),
    ...(planning
      ? [
          step(
            "goals",
            "Goals & buffer",
            "Check your longer-term progress",
            "Review enabled goals and your income buffer. Adjust only where your priorities have changed.",
          ),
        ]
      : []),
  ];
}

/** Prefer the next unreviewed step; circle back if someone started partway through. */
export function nextCheckinStep(
  steps: CheckinStep[],
  task: CheckinTask,
  items: Record<string, string>,
) {
  const index = steps.findIndex((step) => step.key === task);
  return [...steps.slice(index + 1), ...steps.slice(0, index)].find(
    (step) => !items[step.key],
  );
}

export function parseCheckinProgress(
  value: string | null,
): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(value || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        ([key, date]) =>
          [
            "accounts",
            "budget",
            "imports",
            "reports",
            "plan",
            "goals",
          ].includes(key) &&
          typeof date === "string" &&
          Number.isFinite(Date.parse(date)),
      ),
    );
  } catch {
    return {};
  }
}

/** The same local calendar boundaries drive storage, labels, and reset times. */
export function checkinWindow(cadence: Cadence, date = new Date()) {
  const key = checkinPeriod(cadence, date);
  const start = new Date(
    `${key}${cadence === "monthly" ? "-01" : ""}T00:00:00`,
  );
  const next = new Date(start);
  if (cadence === "monthly") next.setMonth(next.getMonth() + 1);
  else next.setDate(next.getDate() + (cadence === "weekly" ? 7 : 1));
  const end = new Date(next);
  end.setDate(end.getDate() - 1);
  const shortDate = (value: Date) =>
    value.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(start.getFullYear() !== end.getFullYear()
        ? { year: "numeric" as const }
        : {}),
    });
  const periodLabel =
    cadence === "monthly"
      ? start.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : cadence === "weekly"
        ? `${shortDate(start)} – ${shortDate(end)}`
        : shortDate(start);
  const nextLabel = `${cadence === "daily" ? "Tomorrow" : next.toLocaleDateString("en-US", { weekday: "long" })}, ${next.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  return { key, start, next, periodLabel, nextLabel };
}

export function checkinStatus(
  steps: CheckinStep[],
  items: Record<string, string>,
  savedCompletion: string | null = null,
) {
  const dates = steps.flatMap((step) =>
    items[step.key] ? [items[step.key]] : [],
  );
  const done = dates.length;
  const complete =
    !!savedCompletion || (steps.length > 0 && done === steps.length);
  return {
    done,
    total: steps.length,
    state: complete
      ? ("complete" as const)
      : done
        ? ("in-progress" as const)
        : ("due" as const),
    completedAt:
      savedCompletion ??
      (complete
        ? new Date(
            Math.max(...dates.map((date) => Date.parse(date))),
          ).toISOString()
        : null),
  };
}

export function checkinStatusLabel(
  cadence: Cadence,
  state: ReturnType<typeof checkinStatus>["state"],
) {
  const period =
    cadence === "daily"
      ? "today"
      : cadence === "weekly"
        ? "this week"
        : "this month";
  return state === "complete"
    ? `Done ${period}`
    : state === "in-progress"
      ? "In progress"
      : `Due ${period}`;
}

export function checkinCompletedLabel(completedAt: string) {
  return `Completed ${new Date(completedAt).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}
