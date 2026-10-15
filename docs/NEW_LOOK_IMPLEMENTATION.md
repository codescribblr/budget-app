# Guided interface rollout

The new interface lives at `/new`. Classic remains at its existing URLs. Both use the same authenticated APIs, active household, financial records, subscription, and feature flags. No financial data is copied when switching.

## Delivery order

1. **Implemented — reversible foundation:** classic/new switch, remembered browser preference, protected routes, shared account selection, responsive navigation, light/dark/system themes, and feedback collection. Feedback review is at `/admin/interface-feedback`.
2. **Implemented — daily routine:** guided home; one balance pass for cash accounts and cards; envelope scan, transfers, and direct balance adjustments. Checking balances, importing transactions, and allocating income remain distinct actions.
3. **Implemented — payday and monthly planning:** editable allocations against remaining monthly funding targets; preview available-to-save impact; monthly and annual target editing. Goal-linked settings, balance-target definitions, and income configuration remain in classic. Premium/feature gates control advanced suggestions and category-type edits.
4. **Implemented with existing task screens — weekly routine:** CSV upload, mapping, queue review and approval, transactions, and reports stay within the new shell. These share components with classic to preserve validation, duplicate detection, merchant descriptions, and categorization. Weekly/monthly check-in links preselect a report period. Refine the interior of these screens after feedback on the core routine.
5. **Next — broader coverage:** dedicated goals/buffer management (the overview is implemented), deeper reports, recurring transactions, loans/assets, household settings, and keyboard workflows. Classic tools remain accessible throughout. Prioritize tools that feedback shows are causing users to switch back most often.

## Interaction contract

- Daily, weekly, and monthly check-ins guide attention. Completing a review never requires moving money or achieving a perfect budget.
- Check-in progress is private to this browser, user, and household; it is not financial or import history. It resets by calendar day, Monday-start week, or month. It does not claim that every bank was imported.
- Account balances are entered manually. Card entry is the current amount owed, translated to the existing available-credit API so existing audit behavior is retained.
- A transfer preserves total envelope funds. Direct balance adjustments change available to save but do not count as monthly funding. Payday allocations increase monthly funding.
- Potential surplus applies only to ordinary monthly expense envelopes. Accumulation, target, goal, and buffer balances must not be presented as spare money just because they are high.
- Suggestions are editable. Payday uses money already reflected in recorded balances, never assumed future income. Ordinary envelopes use the current monthly plan minus recorded funding; target-balance envelopes use the remaining balance gap without subtracting prior funding twice. Suggestions leave goals manual until their completion state is part of this screen.
- Financial mutations refresh authoritative server totals. Failed or partial saves are visible; no simulated Undo or success state.
- Viewers retain read-only access. Existing API authorization remains authoritative.

## Local development and release

Branch: `codex/guided-budget-interface`, based on `origin/main` (this repository has no `master`). Use the isolated attached checkout. `.env.local` points to the existing testing Supabase project; secrets are never committed. Run `npm run dev -- --port 3010`.

Migration `121_interface_feedback.sql` has been applied to the test project. It adds only interface feedback metadata and RLS, not financial tables. Apply separately during a reviewed production rollout. Do not reset or seed over existing households. Local acceptance used a dedicated synthetic household and separate owner/viewer accounts, not existing users' budgets.

Before release: typecheck/build; focused money and workflow tests; browser checks for both switching directions, light/dark/mobile, permissions, persistence, and shared data. Verify partial-failure recovery. A beta rollout is not a replacement for classic.

### Verification commands

```sh
npx tsc --noEmit
npx vitest run src/lib/__tests__/new-look.test.ts src/lib/__tests__/duplicate-matching.test.ts src/lib/__tests__/transaction-status-filter.test.ts
npx tsx --test src/lib/__tests__/category-transaction-edits.test.ts src/lib/__tests__/transaction-list-filters.test.ts src/lib/allocations/__tests__/batch-revert.test.ts
npm run build
```

Stop the dev server before building; both Next commands use `.next`. Restart port 3010 after the build. Vitest is now an explicit dev dependency: existing import tests already referenced it, but it was missing from the package manifest.

### Browser acceptance coverage

- Real test-database writes for cash/card balances, envelope transfers, direct adjustments, paycheck allocations, and monthly target edits; compare authoritative totals and funding records.
- Both switch directions, remembered preference, checklist persistence, light/dark mode, mobile layout and navigation, and all guided routes.
- CSV upload → queued batch → categorization → approval → persisted transaction descriptions, without leaving the new shell.
- Feedback persistence; viewer controls disabled; financial API and admin feedback access rejected for viewers; unauthenticated `/new` redirected to login.
- Simulated partial account-save failures and uncertain allocation responses; verify clear recovery without automatic retries.

### Production rollout stages

1. Internal/test-project review of this branch, including real-world CSV formats and large budgets. Keep production unchanged while refining the core routine.
2. Apply the additive feedback migration and offer a small opt-in beta. Keep all classic routes and the return switch. Gather task-specific feedback before adding more surface area.
3. Address API atomicity/idempotency below and expand beta based on verified success with shared households, viewers, and premium/free accounts. Add cross-device workflow metadata only after its semantics are settled.
4. Consider changing the default interface only after critical classic tasks have equivalent coverage and users no longer need to switch back for their regular routine. Retiring classic is a separate decision.

## Follow-up risks

Existing transfer and allocation APIs perform multiple database updates rather than one transaction. This interface reuses their semantics, does not automatically retry uncertain writes, and refreshes before another action. Atomic RPCs, idempotency keys, and concurrent-edit protection across both interfaces should precede a broad rollout. Monthly funding failure after an allocation must be shown explicitly so the user does not reallocate accidentally.

Check-in progress and interface preference are browser-local initially. Cross-device progress, cohort rollout controls, and feedback triage improvements are separate metadata work; none should alter the shared financial model.
