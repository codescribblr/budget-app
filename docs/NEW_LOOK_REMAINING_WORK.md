# New interface: remaining work

Updated November 3, 2026. Working backlog for `codex/guided-budget-interface`.

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

**Status: deployed in `bfcc399` — history and AI import review implemented and validated; measured automatic assignment remains pending.**

Help users spend their review time on uncertain transactions. Use global merchant identity, the active budget's confirmed history, and the existing AI categorizer; automatically assign only sufficiently reliable results from either source. Give AI useful personal context, keep a prominent batch/selected-row action, and make source disagreements reviewable. Offer quick alternatives and splits for mixed-use merchants. No port of the classic Category Rules page.

Detailed design, current-code findings, examples, implementation stages, and acceptance criteria: [Categorization and import review](NEW_LOOK_CATEGORIZATION_PLAN.md).

### N02 — Pending checks and deposits

**Status: local review — implemented November 3, 2026; not yet deployed.**

Their combined amount already affects Available to save, but `/new` lacks the individual records and add/edit/remove workflow. Show what is outstanding and explain its effect. Design clearing/removal around the actual accounting model before implementation; the current help text and form are not fully aligned. Avoid counting a cleared/imported payment twice.

Implemented at `/new/pending-checks`, reached from Accounts and the home Available to save card. Separate payment/deposit totals, direction labels, filtering, add/edit, and explicit clearing/removal show the effect before saving. Clearing means updating the recorded bank balance first, then removing the temporary adjustment; imports do not clear it automatically. Deposits increase available funds immediately, so the form explains that they are for money already received. This preserves the existing accounting model; these records have no account/envelope link and never change those balances.

Existing revision-checked database writes are now wired into the pending edit/delete routes. Drafts survive live updates, changes are reviewed before saving, and untouched fields retain newer values. Classic payloads remain supported. An uncertain create blocks another submission until the user closes the form and checks the list. No migration is required.

### N03 — Cash account and credit card details

**Status: local review — implemented November 3, 2026; not yet deployed.**

Balance entry and setup are covered. Add account-specific balance history/audit review, relevant card utilization and optional statement information, and a considered removal workflow. Keep available credit as the daily card input. Statement balances must remain separate from the live debt calculation.

Account names now open `/new/accounts/[id]` or `/new/credit-cards/[id]`. Details show the current recorded balance or calculated card debt, budget inclusion/effect, a quick guarded balance edit, paginated balance-change history, and account-filtered recent transactions. Cards show available credit, limit/utilization, and an optional statement reference. Card history charts available credit as recorded rather than recalculating past debt using today’s limit.

Edit details reuses the safe setup editor. Less frequent removal explains lost history and account links while preserving transactions/envelopes, recommends exclusion for closed accounts, and requires the exact name plus the original record revision. Responsive layouts, both themes, independent load/error states, and bank/card/pending skeletons are included.

N02/N03 validation: 25 focused schema/route/guard tests, TypeScript, production build, and rollback-only test-database checks. Database checks cover adjustment effects, untouched envelopes, stale edits/deletes, account/card audit writes, statement isolation, and unauthorized removal. Browser checks cover mobile/desktop/light/dark, create/edit/clear, balance previews, populated/empty activity, and two-tab conflict review with retained draft and untouched latest values. Disposable pending items were removed after QA. No production data was changed.

#### N03 extension — Carried credit-card debt

Implemented for local review. `/new/loans?cards=carried` adds an optional card group and includes only explicitly reviewed carried balances in the payoff total. Card details provide the same review: not reviewed (null), no carried balance (zero), or a dated, manually recorded remaining balance from earlier billing cycles. No current-balance or statement-balance fallback is used; imports do not infer or update this amount. Users update it after payments or a statement review.

The full card liability still drives Available to save and net worth and is never counted twice. Existing statement-based goals are unchanged. Migration 152 is required and has been applied only to the test database.

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

**Status: local review — implemented November 3, 2026; not yet deployed.**

Real-estate details now include address/property attributes, automatic valuation settings, RentCast request usage/limits, dated low/central/high estimates, comparable properties, value-selection previews, and manual values. Selecting a saved estimate uses no provider request. Refreshing explicitly fetches and updates the recorded value using the saved preference; monthly automatic updates retain existing behavior. Turning tracking off allows a manually maintained value. Integration settings remain at `/new/settings/integrations`.

Migration 152 expands guarded property settings, reserves request quota atomically, and commits the estimate, recorded value, and audit entry together. A provider response cannot overwrite a newer edit. Selecting an estimate checks both the asset revision and the reviewed estimate ID. Classic requests remain compatible. Migration 152 is applied only to the test database and must precede deployment of this code.

N03 extension/N11 validation: 33 focused tests, TypeScript, an isolated production build, and rollback-only database checks covering stale writes, permissions, audit entries, and unchanged spendable balances. Browser checks exercised saving property details, selecting a saved estimate, viewing comparables, and reviewing carried debt on a narrow phone layout. A clearly labeled sample property uses synthetic estimates/comparables; no live RentCast request was made. Mobile property settings and the summary were subsequently verified at 390px in both themes without horizontal overflow.

Property detail follow-up: removed the stale specialized-settings fallback. Existing property/RentCast and retirement/forecast controls remain in the new interface. Asset removal now lives under “Manage this asset,” previews the current net worth decrease, requires the exact name and original revision, preserves loans/income/transactions/envelopes, and blocks assets used by a goal. The non-actionable property goal card is replaced with property value, linked loans/equity when available, and net worth/loan links. Goal cards appear only for linked goals or an available goal-creation workflow. Vehicle VIN editing and specialized loan tools still have precise classic fallbacks.

Follow-up validation: 18 focused tests, TypeScript, isolated production build, and rollback-only removal checks for stale revisions, goal dependencies, history cleanup, unchanged spendable money, and retained mortgage balances. Desktop and 390px layouts, light/dark property settings, and the removal confirmation were inspected. No preview asset was deleted.

### N12 — First-time setup and help

**Status: backlog; required before making the new interface the default.**

The shared first-login wizard still runs, but parts of setup and help use classic concepts/routes. Rework onboarding, budget/buffer setup guidance, and contextual help around the new workflow. New users should understand balances versus imported transactions versus envelope funding.

## Small routing fixes

- [x] Transaction duplicate cleanup opens `/new/settings/duplicates`; the classic-to-new switch also maps to this route.
- [x] Payday’s empty state opens `/new/budget/manage?edit=new`.
- [x] Audited new-interface fallback links and shared workflows on November 3, 2026 (local, not deployed). Envelope activity now has one link to its new detail page; payday recovery points to new envelope activity; funding-priority text reflects new allocation support. Goal-envelope management points to new goals. Genuine classic-only tools are collapsed, labeled by action, and linked to the actual destination: goal deletion on the goal list, loan deletion on the dashboard, category ordering/system/deletion, VIN editing, tag/retirement reports, and remaining transaction bulk edits. The nonexistent classic amortization claim and redundant sidebar/settings/import guidance were removed. Keep rechecking these destinations as remaining features are built. Validation: 75 focused existing tests, TypeScript, and the production build pass; browser navigation confirms duplicate cleanup and envelope details remain in the new interface. Loading headings were updated to match the shortened copy.

## Deliberately outside the immediate backlog

- **Recurring bills:** held until a replacement is designed.
- **Income scenarios:** omitted by product decision.
- **User-managed merchant grouping/category-rule directory:** not the intended product direction.
- **AI assistant:** classic-only; lower priority than completing core budget workflows. The AI categorization tool is separate from the chat assistant and is included in N01's first review release.
- **Legacy dashboard layout and every legacy chart/shortcut:** no requirement for exact parity. Preserve useful outcomes, not unnecessary controls.

## How to work through this list

Keep the N01–N12 identifiers stable. For each item, record the design decision, implementation scope, validation, and release commit here or in a linked feature plan. Use statuses: backlog → design → implementation → local review → deployed. Do not mark an item complete merely because a route exists. Reorder priorities as usage feedback changes them.

For N01, test the new review with representative imports and a configured AI provider, then deploy migration 151 before the interface. Collect explicit review outcomes before enabling automatic Ready promotion. See the detailed plan for completed work, validation, and remaining calibration.
