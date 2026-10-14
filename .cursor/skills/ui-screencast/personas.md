# Onboarding coach screencast personas

Four realistic first-run users for `scripts/record-onboarding-coach-walkthroughs.mjs`.

| Slug | Name | Path | Situation | Notes |
|------|------|------|-----------|-------|
| `maya-beginner` | Maya | Beginner guided | Paycheck to paycheck | Never budgeted; needs teaching + starter amounts |
| `maya-habit-guide` | Maya | Habit Guide (after setup) | First week habit loop | Light-mode screencast: coach exit → dashboard tip → fund → log → check → Help reopen (`scripts/record-maya-habit-guide-walkthrough.mjs`) |
| `derek-debt` | Derek | Some experience | Pay down debt | Tried budgeting before; focuses on debt payment |
| `priya-power` | Priya | Power / fast track | Stable optimizer | Spreadsheet native; wants quick setup |
| `sam-freelance` | Sam | Free-text intake | Irregular income / rebuilding | Describes situation in own words first |

## Expected story beats (shared spine)

1. Coach opens on empty account
2. Experience / path choice (or free text for Sam)
3. Situation (when shown)
4. Money snapshot form (balances + income)
5. Envelope multi-select
6. Review plan (editable amounts)
7. Confirm create
8. Next-steps walkthrough
9. Land on dashboard

Gemini may reword buttons; recorders match with flexible regexes and fall back to deterministic copy.
