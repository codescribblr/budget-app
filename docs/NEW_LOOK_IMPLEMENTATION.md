# Guided interface rollout

The new interface lives at `/new`. Classic remains at its existing URLs. Both use the same authenticated APIs, active household, financial records, subscription, and feature flags. No financial data is copied when switching.

## Delivery order

1. **Implemented — reversible foundation:** classic/new switch, remembered browser preference, protected routes, shared account selection, responsive navigation, light/dark/system themes, and feedback collection. Feedback review is at `/admin/interface-feedback`.
2. **Implemented — daily routine:** guided home; one balance pass for cash accounts and cards; envelope scan, transfers, and direct balance adjustments. Checking balances, importing transactions, and allocating income remain distinct actions.
3. **Implemented — payday and monthly planning:** editable allocations against remaining monthly funding targets; preview available-to-save impact; monthly and annual target editing. Goal-linked settings, balance-target definitions, and income configuration remain in classic. Premium/feature gates control advanced suggestions and category-type edits.
4. **Implemented with existing task screens — weekly routine:** CSV upload, mapping, queue review and approval, transactions, and reports stay within the new shell. These share components with classic to preserve validation, duplicate detection, merchant descriptions, and categorization. Weekly/monthly check-in links preselect a report period. Refine the interior of these screens after feedback on the core routine.
5. **Next — broader coverage:** dedicated goals/buffer management (the overview is implemented), deeper reports, recurring transactions, loans/assets, household settings, and keyboard workflows. Classic tools remain accessible throughout. Prioritize tools that feedback shows are causing users to switch back most often.

## Interaction contract

- Sidebar links and direct task URLs open standalone pages. Check-in guidance requires an explicit, valid `checkin` query parameter for that task. Leaving a check-in through the sidebar ends the guided visit without changing its saved progress. Standalone balance and monthly-plan edits use ordinary Save actions that stay on the page and never mark a check-in step reviewed.
- Daily, weekly, and monthly check-ins guide attention. A numbered progress header and persistent completion action lead through each routine: balances → envelopes; imports → spending → envelopes; reflection → monthly plan → enabled goals/buffer. Completing a review never requires moving money or achieving a perfect budget.
- The primary action saves pending balance/plan edits and continues only after every save and the authoritative refresh succeed. Save & stay is available separately. Invalid input, partial failures, and refresh errors keep the current step open. Jumping into a later step circles back to unfinished earlier steps instead of claiming completion.
- Every routine ends at `/new/check-in/complete` with a review summary, recorded available to save, remaining negative envelopes, and a clear Done action. Revisit individual tasks or choose Review again to restart just the review progress. Opening the completion URL with unfinished steps offers Continue instead of claiming success. Monthly completion waits for planning feature availability.
- Check-in progress is private to this browser, user, and household; it is not financial or import history. It resets by calendar day, Monday-start week, or month. It does not claim that every bank was imported.
- Weekly import links preserve their explicit check-in context through upload, mapping, queue review, and transaction detours. Standalone and classic imports remain standalone.
- Reports, category details, tag reports, and transactions share a compact date-range control. Existing report presets sit beside a readable range summary; the summary opens start/end calendars and clearing controls. Open-ended ranges remain supported. Reports keep the date, category, and system-category controls on one desktop row and two compact mobile rows. Changing categories preserves the chosen dates.
- Failed report requests show a retry action instead of empty/stale charts and block guided completion until all report data loads. Changing filters cancels outdated requests. Planning-setting failures also offer retry rather than implying optional tools are disabled.
- Account balances are entered manually. Cards use **available credit**, copied directly from the provider and sent unchanged to the existing API. Owed is calculated as saved credit limit minus available credit. The limit is read-only here and managed in classic. Bank balances and cards have separate labeled sections. Credits above the limit are shown as a positive card credit; dashboard totals retain the existing zero floor on amounts owed. Pending charges/holds are reflected only to the extent the provider includes them in available credit.
- A transfer preserves total envelope funds. Direct balance adjustments change available to save but do not count as monthly funding. Payday allocations increase monthly funding.
- Potential surplus applies only to ordinary monthly expense envelopes. Accumulation, target, goal, and buffer balances must not be presented as spare money just because they are high.
- Suggestions are editable. Payday uses money already reflected in recorded balances, never assumed future income. Ordinary envelopes use the current monthly plan minus recorded funding; target-balance envelopes use the remaining balance gap without subtracting prior funding twice. Suggestions leave goals manual until their completion state is part of this screen.
- Financial mutations refresh authoritative server totals. Failed or partial saves are visible; no simulated Undo or success state.
- Viewers retain read-only access. Existing API authorization remains authoritative.
- New feedback is saved before site admins are alerted through the existing system-notification service. Alerts include a short excerpt, type, source page, submitting user, and budget account, with a direct admin-only link to the full submission. Email follows each admin's System Notifications preference; bell notifications remain available if email is disabled or fails. Notification bells are available in the new interface and admin header. Retrying the same feedback ID does not send another alert. Delivery errors use the existing server/delivery logs and never undo saved feedback.

## Local development and release

Branch: `codex/guided-budget-interface`, based on `origin/main` (this repository has no `master`). Use the isolated attached checkout. `.env.local` points to the existing testing Supabase project; secrets are never committed. Run `npm run dev -- --port 3010`.

Migration `121_interface_feedback.sql` has been applied to the test project. It adds only interface feedback metadata and RLS, not financial tables. The existing **Deploy to Production** GitHub workflow backs up the production database when migrations are pending, applies them, and then deploys to Vercel when `main` is pushed. Use that workflow for the authorized opt-in release and verify its migration and deployment steps. Do not reset or seed over existing households. Local acceptance used a dedicated synthetic household and separate owner/viewer accounts, not existing users' budgets.

Feedback alerts reuse `system_notification` (migration 081); they require no additional migration. Recipients are users with `user_profiles.is_admin = true`. Email uses the existing `SMTP_EMAIL_PASSWORD` (Resend API key), `SMTP_FROM_EMAIL`, and `NEXT_PUBLIC_APP_URL` configuration. The local test environment currently has no email credentials; delivery tests replace the email transport and do not send mail to existing users. Alerts run in Next's `after()` lifecycle, with delivery bounded by the host's request-duration limits; failures are logged, not automatically retried.

Before release: typecheck/build; focused money and workflow tests; browser checks for both switching directions, light/dark/mobile, permissions, persistence, and shared data. Verify partial-failure recovery. A beta rollout is not a replacement for classic.

### Verification commands

```sh
npx tsc --noEmit
npx vitest run src/lib/__tests__/checkins.test.ts src/lib/__tests__/new-look.test.ts src/lib/__tests__/duplicate-matching.test.ts src/lib/__tests__/transaction-status-filter.test.ts
npx vitest run src/lib/__tests__/interface-feedback-route.test.ts src/lib/notifications/__tests__/interface-feedback.test.ts src/lib/notifications/__tests__/interface-feedback-delivery.test.ts
npx tsx --test src/lib/notifications/__tests__/email-message-formatter.test.ts
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
- Guided daily/weekly/monthly completion, feature-gated monthly steps, read-only review, skipped-step recovery, restart, cross-tab progress, and storage-denied session fallback. Verify that failed saves/refreshes and leaving during an in-flight save cannot advance the review. In the new interface, dismissible notifications appear at the top so they do not cover the next-step action.
- Standalone sidebar/direct navigation and in-place saves without check-in progress; explicit guided import return links; date presets, custom/open-ended ranges, clearing, category/date URL preservation, desktop/mobile layout, and dark-mode calendars.
- Feedback alert recipient scoping, email and bell delivery, channel preferences/failures, duplicate-submission suppression, safe email rendering, and admin-only direct links. Local browser checks use a mocked inbox to verify the new bell and feedback preview without notifying existing admins.
- Final release review: report HTTP/malformed-response failures and successful retry; check-in completion blocked during report failure; planning-settings retry; empty-envelope and no-card setup actions; standalone task routes; mobile overflow and dark mode; sign-in return links retain feedback IDs, filters, and check-in context while rejecting external redirect destinations. Monthly summaries link to standalone envelopes rather than unexpectedly starting a daily routine.

### Production rollout stages

1. Internal/test-project review of this branch, including CSV imports, permissions, financial edits, and failure recovery.
2. Merge to `main` and use the existing migration/deployment workflow to offer the opt-in new interface. Keep classic as the default, all classic routes, and the return switch. Gather task-specific feedback before adding more surface area. Retain `codex/guided-budget-interface` for further iteration.
3. Address API atomicity/idempotency below and expand beta based on verified success with shared households, viewers, and premium/free accounts. Add cross-device workflow metadata only after its semantics are settled.
4. Consider changing the default interface only after critical classic tasks have equivalent coverage and users no longer need to switch back for their regular routine. Retiring classic is a separate decision.

## Follow-up risks

Existing transfer and allocation APIs perform multiple database updates rather than one transaction. This interface reuses their semantics, does not automatically retry uncertain writes, and refreshes before another action. Atomic RPCs, idempotency keys, and concurrent-edit protection across both interfaces should precede a broad rollout. Monthly funding failure after an allocation must be shown explicitly so the user does not reallocate accidentally.

Check-in progress and interface preference are browser-local initially. Cross-device progress, cohort rollout controls, and feedback triage improvements are separate metadata work; none should alter the shared financial model.
