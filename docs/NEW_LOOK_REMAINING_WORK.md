# New interface: remaining work

Updated November 2, 2026. Working backlog for `codex/guided-budget-interface`.

This tracks useful workflows still missing or incomplete in `/new`, rather than a requirement to copy every classic page. Findings come from the interface and source audit at `9e7ec0b`, amended by the product owner's November 2 merchant clarification. Status describes this backlog, not production readiness.

## Product decisions

- Keep the focused pages and daily/weekly/monthly check-in cadence. Put less frequent management actions in contextual menus or settings.
- Global merchant identity is managed centrally by admins. Users should not maintain local merchant groups or a merchant-to-category rules directory.
- Categorization is personal to the active budget. Recognizing a merchant does not establish what was bought. Replace item 1 from the original audit with trustworthy suggestions and efficient import review. Include both budget-history categorization and the existing AI categorization tool in the first release; AI is a core capability, not deferred research.
- Recurring bills remain **on hold** pending a replacement plan. Income scenario planning remains **intentionally omitted**.
- Reuse production data and APIs where appropriate. Any shared infrastructure changes must keep classic compatible while both interfaces remain available.
- Every new view follows [loading standards](NEW_LOOK_LOADING.md) and [freshness/safe-editing contracts](NEW_LOOK_SYNC_PLAN.md).

## Prioritized backlog

### N01 — Trustworthy categorization during imports

**Status: November 2 release approved — history and AI import review implemented and validated; measured automatic assignment remains pending.**

Help users spend their review time on uncertain transactions. Use global merchant identity, the active budget's confirmed history, and the existing AI categorizer; automatically assign only sufficiently reliable results from either source. Give AI useful personal context, keep a prominent batch/selected-row action, and make source disagreements reviewable. Offer quick alternatives and splits for mixed-use merchants. No port of the classic Category Rules page.

Detailed design, current-code findings, examples, implementation stages, and acceptance criteria: [Categorization and import review](NEW_LOOK_CATEGORIZATION_PLAN.md).

### N02 — Pending checks and deposits

**Status: backlog.**

Their combined amount already affects Available to save, but `/new` lacks the individual records and add/edit/remove workflow. Show what is outstanding and explain its effect. Design clearing/removal around the actual accounting model before implementation; the current help text and form are not fully aligned. Avoid counting a cleared/imported payment twice.

Done when users can understand and manage these adjustments entirely in the new interface, with the impact on available money visible before saving.

### N03 — Cash account and credit card details

**Status: backlog.**

Balance entry and setup are covered. Add account-specific balance history/audit review, relevant card utilization and optional statement information, and a considered removal workflow. Keep available credit as the daily card input. Statement balances must remain separate from the live debt calculation.

Done when users can investigate a balance change and manage the account without switching to classic.

### N04 — Remaining bulk transaction corrections

**Status: backlog.**

Bulk envelope assignment and tags already work. Add batch changes to account/card, date, income/expense type, and historical status, with an explicit preview of affected records and financial impact. Preserve splits unless the user explicitly replaces them.

Done when a mistaken import assignment can be corrected in `/new`, with stale-write protection and recoverable partial failures.

### N05 — Envelope and goal housekeeping

**Status: backlog.**

Add saved custom envelope order, system-category management where appropriate, bulk archive/restore, and safe permanent removal. Add missing goal tracking-source changes and deletion, clearly distinguishing removal of a goal from removal of its envelope or account. Ordinary envelope archive/restore and goal editing already exist.

Done when these infrequent maintenance tasks have contextual entry points and explain effects on balances, links, and history before a write.

### N06 — Tag management and reports

**Status: backlog.**

Creation, assignment, filtering, and bulk tagging already exist. Add rename/merge/delete, review how automatic tagging should fit the new import experience, and provide cross-envelope tag reporting for trips, projects, or other user-defined groupings. Do not assume the old tag-rule editor is the right design.

Done when users can maintain their tags and review the complete cost of a tagged activity without leaving `/new`.

### N07 — Longer-term spending analysis

**Status: backlog.**

Spending review, three-month plan comparison, and six-month envelope history already exist. Consider longer periods, category/merchant trends, and spending pace. Lead with useful questions such as what is getting more expensive and whether a budget needs changing; evaluate each classic chart rather than porting all of them.

Done when users can investigate meaningful changes across time and act from the report, with clear period and data-completeness labels.

### N08 — Global search and quick navigation

**Status: backlog.**

Classic has a command palette across transactions, envelopes, accounts, goals, and settings. Add a compact equivalent that opens new-interface destinations, respects features/permissions, and works on mobile as well as with a keyboard shortcut.

### N09 — Notification inbox and detail views

**Status: backlog.**

The bell and preferences are covered. Full inbox, unread/archive views, detail pages, and applicable notification destinations still leave `/new`. Keep administrative notifications directed to admin tools where appropriate.

### N10 — Retirement projections

**Status: backlog; separate design pass.**

Current net worth and history are covered. Retirement timing, forecast assumptions, timeline events, and investment distributions remain in classic. These need an understandable planning workflow with assumptions and uncertainty visible, rather than a copy of the existing long form.

### N11 — Property valuation workflows

**Status: backlog.**

Integration settings exist. Property-specific setup, requesting valuations, reviewing estimates/comparables, and selecting a recorded value still use classic asset views. Show the source/date of an estimate and distinguish it from spendable money.

### N12 — First-time setup and help

**Status: backlog; required before making the new interface the default.**

The shared first-login wizard still runs, but parts of setup and help use classic concepts/routes. Rework onboarding, budget/buffer setup guidance, and contextual help around the new workflow. New users should understand balances versus imported transactions versus envelope funding.

## Small routing fixes

- [ ] Link the transaction duplicate-cleanup action to `/new/settings/duplicates`, which already exists.
- [ ] Link payday's empty state to `/new/budget/manage`, which already exists.
- [ ] Reconcile stale classic-fallback copy as each task above is completed. The absence of a new route alone does not prove that an action is missing, and old rollout notes are not the source of truth.

## Deliberately outside the immediate backlog

- **Recurring bills:** held until a replacement is designed.
- **Income scenarios:** omitted by product decision.
- **User-managed merchant grouping/category-rule directory:** not the intended product direction.
- **AI assistant:** classic-only; lower priority than completing core budget workflows. The AI categorization tool is separate from the chat assistant and is included in N01's first review release.
- **Legacy dashboard layout and every legacy chart/shortcut:** no requirement for exact parity. Preserve useful outcomes, not unnecessary controls.

## How to work through this list

Keep the N01–N12 identifiers stable. For each item, record the design decision, implementation scope, validation, and release commit here or in a linked feature plan. Use statuses: backlog → design → implementation → local review → deployed. Do not mark an item complete merely because a route exists. Reorder priorities as usage feedback changes them.

For N01, test the new review with representative imports and a configured AI provider, then deploy migration 151 before the interface. Collect explicit review outcomes before enabling automatic Ready promotion. See the detailed plan for completed work, validation, and remaining calibration.
