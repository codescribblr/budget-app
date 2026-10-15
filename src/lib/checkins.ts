import type { Cadence } from "./new-look";

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
