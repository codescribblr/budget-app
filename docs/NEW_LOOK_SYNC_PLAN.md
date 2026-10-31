# Cross-device freshness and safe editing in the new interface

Status: stages 1–4 implemented for local testing · 2026-10-31. Skeleton-only commit `1b3bb9d` is deployed. The expanded synchronization work and migrations **131–149 remain local/test-only**; production has not been updated.

## Implementation checkpoint

### Protected new-interface workflows

- Account/card balances and setup edits keep their original UUID revision and only submit changed fields. Stored card debt and authoritative balance audit entries commit together.
- Envelope transfers, direct balance changes, buffer movements and paycheck allocations share a budget lock. Balances, funding history, audit entries and operation receipts commit together. Available-to-save is rechecked under that lock; two commands cannot allocate the same available money. Relevant legacy direct financial writers acquire the same budget lock, while their unversioned absolute edits retain the accepted classic limitation below.
- Transaction create/edit/delete and bulk edits use scoped revisions and transactional split, tag, envelope and audit updates. Automatic tag rules remain active. New transaction and money commands have immutable operation IDs. An uncertain outcome can be checked after navigation/reload; checking an unapplied operation fences out a delayed original request.
- Import review preserves dirty rows and selections during background reads. Changed or removed rows need explicit review. Queue approval commits transaction, import provenance and queue receipt together in resumable chunks; duplicate approvals do not create another transaction. Preparation results and checkpoints commit together. Defaults, deletion and remapping check the reviewed revisions; remapping cannot delete a batch unless its replacement succeeds. Old in-memory reviews without a durable batch ask the user to re-upload through the saved-batch workflow.
- Monthly targets, income, goal edits/setup, loans and assets use guarded writes. Goal setup verifies source revisions shown at the final review and updates linked records atomically. Open record editors retain their entries if the record changes or disappears.
- Consequential existing settings edits are versioned: profile, notification preferences, dashboard settings, feature flags, household name/deletion, collaborator role/removal, import setup/template edits/deletion, existing Teller mappings and RentCast settings. New CSV templates cannot silently overwrite an existing mapping. Additive/create-only actions and explicit commands (scan, backup, restore, connect, revoke, password change, subscription checkout) retain their action semantics; these are not stale autofilled record replacements. Classic-only tools remain outside the new editor rollout.

### Freshness and loading

- One shared snapshot and resource coordinator covers balances, envelopes, transactions, imports, planning and settings. Mounted reports, activity/detail views, lists and settings subscribe only to relevant families. Personal check-ins retain their separate user/household/period scope.
- One Supabase browser client uses two private topics per visible tab. Signals contain resource names, not records. Database transactions coalesce each resource family once, with a one-second source publication bound across transactions and explicit import-completion signals. Durable tokens preserve catch-up when a trailing signal is suppressed or missed.
- Initial join/rejoin, focus, visibility, online, navigation, mutation and manual retry refresh the view. Visible, online reconciliation runs every 60–70 seconds, backing off on repeated failure to about 15 minutes. Hidden/offline tabs do no polling or live subscription work. No money mutation is queued offline or retried automatically.
- Read ordering/generation checks protect scope changes and filters. Background reads retain content, editor drafts and focus. The shared status shows checked time, pending reads, failed refreshes and offline state; it does not equate a connected socket with current data.
- Page/list/report/settings/detail skeletons replace generic initial loading in new views, including shared loading components when used under `/new`. Inline action progress (saving, scanning, processing a file) remains explicit action progress. A background refresh does not replace usable content with a skeleton.
- Financial reads are read-only. Legacy income initialization moved into a one-time migration; household GET requests no longer provision or clean up budgets.

### Verification completed

- 347 Vitest tests across 47 compatible suites pass; TypeScript checking and an isolated production build pass. The repository also contains standalone node/assert scripts, which are not Vitest suites. An earlier indiscriminate Vitest run included those and an unrelated recurring-detection fixture failure; it is not the test command for this change.
- `node scripts/test-budget-concurrency.cjs`: real account/card races, legacy revision invalidation, unauthorized RPC denial, consistent card calculation and audit rollback.
- `node scripts/test-envelope-concurrency.cjs`: concurrent allocations against shared available money; transfer revisions and rollback; operation replay and lost-response fencing; transaction split races/deletes; income/loan/asset guards; buffer constraints; preparation/checkpoint/approval replay; import provenance; defaults and remap rollback; feature/integration/Teller guards; cross-household settings isolation; goal setup/linked-plan guards; automatic tagging. Financial fixtures use disposable test households and are cleaned up.
- `node scripts/test-budget-realtime.cjs`: two authenticated subscribers, unrelated-budget and other-user personal-topic denial, personal check-in delivery, transaction coalescing, source volume, durable token catch-up, and guarded writes with live publication disabled. A synthetic 1,000-row batch produced **one signal per subscriber**, observed within roughly **2.2 seconds** in the recorded run. This measures the test project, not a guaranteed production SLA.
- Browser verification: the daily-balance pilot was checked on mobile and in both themes. The expanded income editor received a real second-session change while retaining a typed draft and focus, blocked an unresolved save, and saved only after explicit review. The expanded conflict editor was also checked at a 390px phone breakpoint; its footer stacking was corrected so scrolling inputs cannot cover the actions. The dashboard and income view loaded successfully with the new refresh/skeleton behavior.

### Rollout and operational notes

- Apply the migrations and deploy code only after separate production authorization. Migrations 131–149 have been exercised on the test project, not production. Keep the existing production backup process.
- **Migration 148 changes the settings conflict key** to `(account_id,user_id,key)`. The classic, scenario and external API server writers are updated together without changing their HTTP contracts. Coordinate this migration with the server release; do not apply it alone while leaving old server writers running against the removed unique key. It preserves existing rows and prevents one user's settings from moving between households.
- Disable browser subscriptions with `NEXT_PUBLIC_BUDGET_LIVE_SYNC=false`; disable publication with `budget_sync_config.enabled=false`. Guarded writes, durable resource tokens and HTTP refresh remain active. No paid Supabase service or billing change is required.
- Inspect actual production connections/messages/egress during the opt-in rollout. Tests demonstrate source batching, not unlimited Free-plan capacity. Operation receipts are retained for replay safety; include their storage in usage monitoring.
- A revoked member may briefly retain a cached, already-open Broadcast authorization until reconnect; events contain no financial records and every authoritative read/write rechecks access. No data is trusted from a signal. Test real mobile suspension/reconnection and network-loss behavior during the internal live trial, in addition to the database and local UI checks above.
- Accepted boundary: classic/external unversioned edits can still overwrite newer values. New-interface preconditions protect against changes made by any writer, but do not make unguarded classic callers concurrency-safe. Password, payment-provider and explicit restore flows retain their existing authorization/confirmation mechanisms.

## Outcome and scope

A user should be able to leave the budget open on a phone and desktop, return to either device, and continue confidently. Unedited data updates automatically. Work in progress stays intact. Saving a protected edit cannot silently replace a newer version of the same record.

- Build the new experience in `/new`; preserve the existing financial model and shared data.
- Remain on **Supabase Free**. No paid plan, new hosted service, presence system, or custom WebSocket server.
- Keep shared API/database contracts backward compatible. Only backport classic changes if a shared change would otherwise break it.
- Pilot accounts and credit cards first. Expand protection by workflow; do not label the whole app concurrency-safe after the pilot.
- Keep the dashboard skeleton pilot. Resume the broader skeleton rollout after the shared loading/refresh contract is implemented.
- No offline mutation queue, automatic financial-write retry, collaborative typing, or classic UI redesign.

## Original baseline (before this implementation)

The daily balance page saves only edited rows; untouched autofilled accounts are already omitted. However, it does not retain an edit's original server revision or check that revision when saving. Returning to the page on the same day does not reliably refresh the shared budget data. A second device can therefore submit a stale edit.

The shared account/card PATCH handlers perform unconditional updates. Card updates read the limit and available credit before calculating the amount owed, leaving a concurrent read/write race. Balance audit entries and net-worth snapshots currently run after the financial update in separate calls.

Check-in completion already persists in Supabase. Migration `130_persistent_checkins_and_recent_envelopes.sql` merges reviewed steps transactionally. The client already refreshes progress on focus and uses a local-storage signal for other tabs. Reuse this store and its daily, Sunday-start weekly, and calendar-month periods.

The buffer endpoint already rejects some stale balance updates. That is a useful precedent, but it is not a complete concurrency guarantee for transfers, allocations, or the rest of the app.

## The user experience

### Returning to an open page

Refresh when the page becomes visible, regains focus, reconnects, or rejoins its live channel. Collapse simultaneous wake-up events into one request. Update untouched fields and summaries without replacing the page with a skeleton. Preserve scroll, focus, selection, expanded panels, and typed drafts.

If the user started editing before another device saved, preserve both the original version and their draft. Never attach the newer server revision to an old draft automatically.

### Two devices edit the same account

Show an inline message beside the affected row: **“This balance changed elsewhere. Review it before saving.”** Show **Latest saved** and **Your entry**, plus the prior value when useful.

- **Use latest** discards only that row's draft.
- **Review my entry** retains the typed amount and asks the user to confirm it against the latest saved value. The subsequent save uses the newly reviewed revision. Another intervening change produces another conflict.
- Successfully saved rows remain saved; unresolved rows remain editable. Do not mark the check-in step complete until all intended edits are saved or explicitly discarded and the final refresh succeeds.
- If a record was deleted or access was removed, explain that it can no longer be saved. Do not silently recreate it or expose another household's data.

Example: the phone originally loaded checking at $1,000. Desktop saves $1,250. With no phone draft, the phone updates to $1,250 on return. With a phone draft of $900, it keeps $900 for review and the server refuses a stale save. If the phone edits only a different card, checking is never sent.

### Refresh failures and uncertain saves

Retain the last successfully loaded view with a compact “Couldn't refresh” message and Retry. Do not present stale data as freshly confirmed. A socket outage alone must not block an otherwise working guarded HTTP save.

When offline, preserve drafts and explain that saving requires reconnecting. Do not queue money changes. If the server may have committed a save but the response was lost, reconcile with the server before another submission; never claim it failed and automatically repeat it.

## Architecture decisions

### 1. The server protects writes

Add a database-managed `revision` to cash accounts and cards first. A trigger replaces the opaque UUID token for every update regardless of source: new UI, classic, integrations, imports, jobs, or direct authorized database writes. Start with whole-record revisions; a conservative conflict on an unrelated metadata edit is acceptable for the pilot. Serialize revisions as opaque strings at the API boundary; UUID tokens avoid JavaScript bigint precision issues and cannot be reused by backup restores.

GET and successful PATCH responses add `revision`. New UI PATCH requests include `expectedRevision` and only changed fields. Preserve legacy requests that omit the precondition. Validate and separate request metadata from database fields.

Perform revision comparison, authorization, update, derived card calculation, and financial audit insertion in one database transaction. A preliminary SELECT followed by an unguarded UPDATE is insufficient. Use a scoped SQL function with explicit active-household membership and owner/editor checks; do not rely on an unscoped record ID or a client-supplied role. The new client must bind the request to its expected household and reject a changed active-account context.

Return a typed `409` conflict and the latest authorized record when the revision differs. Distinguish deletion, lost access, and validation failures. A conflict makes no financial or audit change. Success returns the authoritative record and new revision. Treat an already-matching value as reconciliation only when the server confirms the full intended patch, not just one number.

Keep derived financial data and authoritative audit history consistent. Inventory snapshot/notification effects before moving the existing helpers: transactional financial/audit work must roll back together; post-commit notification failures must not be reported as a failed financial save. Ensure only one path logs each audit change. Use operation IDs where needed to reconcile a committed-but-unacknowledged write; transfers and allocations require idempotency in their later phase.

### 2. One new-UI refresh coordinator

Introduce a small shared coordinator around the existing providers, not a wholesale data-library rewrite. It owns lifecycle listeners, request deduplication, resource invalidation, retry/backoff, and optional Realtime subscriptions. Components subscribe to data/resources, never independently open sockets.

Scope caches, drafts, subscriptions, and pending requests by authenticated user and budget. Include date range/filter/period in relevant resource keys. A generation token and cancellation prevent late results from an old budget, old filter, or old request replacing current data. Successful saves seed the authoritative response; an older in-flight read must not overwrite it. Clear subscriptions and sensitive cache state on logout or budget change; honor existing unsaved-change handling before switching.

Use resource families so an event refreshes only affected mounted data. Account/card changes invalidate balances, available-to-save, net worth, and related goal views; envelope/transaction changes invalidate their lists, summaries, activity, monthly funding/spending, and relevant reports. Invalidate caches for unmounted pages and load them when opened. Do not fetch every report on every change.

Separate `initialLoading`, `refreshing`, `error`, `lastSuccessfulRefresh`, and edit/conflict state. Permission-based `canEdit` must not become false on every background refresh. Disable only actions whose required data is unavailable, invalid, offline, or saving. Refetches never initiate processing or mutate financial records.

### 3. Supabase Realtime supplies change signals

Use **private database-originated Broadcast** for the pilot. Supabase recommends Broadcast for scalability/security; messages should say which resource changed, with scope and revision/invalidation token, rather than contain balances or entire rows. The authenticated API remains authoritative. See [database change subscriptions](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes).

One browser client/socket per visible app tab, shared across new-UI components. Use a household channel for shared financial changes and a user-plus-household channel for personal check-in progress, multiplexed over that connection. Another household member's completion must not mark the current user's routine complete. Use receive-only client policies with topic membership checks, not a policy allowing every authenticated user to subscribe to every budget. Verify token refresh, revoked membership, and logout behavior. See [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization).

Subscribe and then perform a catch-up read on initial join/rejoin. A successful subscription does not mean the cache is current. Buffer invalidations arriving during a fetch and perform a trailing refresh when necessary. Duplicate or out-of-order signals are harmless; they trigger reads, never apply money changes. Changes from classic and background writers must produce the same invalidation as new-UI writes.

Release subscriptions promptly while hidden; reconnect and catch up on visibility. Reuse local tab signaling where helpful, without putting financial records in local storage. Do not build cross-tab leader election in the pilot. Multiple simultaneously visible tabs still count as multiple connections.

Realtime is an optional accelerator. Keep wake-up refresh and server preconditions working with it disabled. When a visible tab cannot subscribe, use bounded, jittered HTTP refresh (initial target: once per 60 seconds while online/visible, with backoff). Also perform occasional reconciliation during a healthy connection to recover from missed events. Measure and adjust this cadence against database/egress usage. Stop background work while hidden.

### 4. Control messages at the source

Start live subscriptions with accounts, cards, and the user's check-in progress. Do not attach a broadcast to every imported transaction/split/audit row.

Before expanding to bulk activity, add compact resource invalidation markers and transaction-aware source batching. Target one invalidation per affected budget/resource family per database transaction. For imports spanning transactions, emit at bounded committed chunk boundaries and on completion; interrupted imports must still make committed chunks visible. Map the affected resource families so final totals, funding, activity, and reports refresh together.

Implement and load-test the batching mechanism on the existing database/import infrastructure. Do not assume client debounce reduces billed messages, and do not introduce a paid worker. If a high-volume writer cannot be safely coalesced yet, keep that resource on resume/periodic refresh until it can. No per-row bulk broadcasts in the initial release. Keep a durable resource token so catch-up reads can detect missed invalidations.

## Delivery stages and acceptance gates

### Stage 1 — Safe daily balance edits

Highest priority; useful even without Realtime.

- Inventory all writers to accounts/cards, existing audit triggers, backup/restore paths, and external API field allowlists.
- Add revision migration, compatible read/write contracts, typed errors, and atomic guarded account/card updates.
- Capture `{originalValue, originalRevision, draftValue}` on first edit in both the daily balance pass and the new account/card setup editor. This prevents an alternate new-UI editor bypassing the pilot's protection.
- Build row-level conflict resolution and uncertain-save recovery in both themes and mobile layouts.
- Preserve existing only-changed-fields behavior, permissions, amount validation, and credit-limit semantics.

**Gate:** two sessions submit the same revision; exactly one differing update succeeds. A rejected save produces no audit entry or partial derived-value change. Untouched rows are never sent. Classic payloads and external API contracts still work. No database/API claim of global protection yet.

Primary touchpoints: `src/app/api/accounts/[id]/route.ts`, `src/app/api/credit-cards/[id]/route.ts`, `src/lib/supabase-queries.ts`, `src/lib/types.ts`, `src/lib/audit/account-balance-audit.ts`, `src/components/new-look/accounts.tsx`, `src/components/new-look/account-setup.tsx`, and a new migration.

### Stage 2 — Safe refresh and shared loading states

- Add the new-UI coordinator and draft-aware merge rules.
- Wire focus, visibility, online, successful mutation, and manual retry to deduplicated refreshes.
- Refactor `budgetRequest` to preserve structured HTTP errors and `BudgetProvider` to separate permission from refresh state.
- Integrate check-in progress's existing listeners/store so one wake-up does not produce several competing reloads.
- Protect budget switches, response ordering, date/filter changes, and deleted records.

**Gate:** returning to the phone updates clean fields while retaining dirty drafts and their original revision. A refresh does not steal focus, flash a skeleton, disable the form unnecessarily, or restore old data after a save. No cross-household cache leakage.

Primary touchpoints: `src/components/new-look/budget-context.tsx`, `src/components/new-look/checkin-progress.ts`, `src/lib/checkin-store.ts`, new coordinator/draft utilities, and new-look layout/provider wiring.

**Skeleton rollout can resume after this stage.** Use placeholders only for sections with no usable data for the current scope. Background refresh retains content; errors and conflicts have their own states. Broader financial protection does not need to block skeleton work.

### Stage 3 — Live daily-workflow pilot on Free

- Add private channel policies and database-originated invalidations for accounts/cards and personal check-ins.
- Add subscription lifecycle, join/rejoin catch-up, disconnect fallback, batching/deduplication, and separate live-sync feature control.
- Refresh dependent dashboard/net-worth sections and check-in receipts; preserve user/period boundaries.
- Measure connection count, message volume, event-to-view delay, request amplification, and disconnect behavior using synthetic test households.

**Gate:** foreground desktop and phone reflect a committed balance/check-in update without manual reload (target within a few seconds under normal connectivity). Sleeping phone catches up on resume. Disabling Realtime changes freshness latency, not save safety. A classic edit also triggers new-UI refresh. Nonmembers cannot subscribe, viewers cannot write, and personal progress is private.

**First user-testing milestone = Stages 1–3.** It solves the concrete daily-balance problem before a broad migration.

### Stage 4 — Expand by financial risk and usefulness

Use the proven coordinator, conflict component, and revision contract. Finish one workflow with end-to-end coverage before moving to the next.

1. **Envelope money actions:** transfers, direct balance adjustments, buffer, and paycheck allocations. Use atomic server commands, integer-cent validation, idempotency, and transactional source/target/audit/funding updates. Revalidate available-to-save and other shared constraints inside the same transaction; independent row revisions alone cannot prevent two devices overspending shared available money. Define a consistent budget-level lock/serialization strategy for competing commands and coordinate relevant legacy writer paths before claiming that invariant globally.
2. **Transaction/import review:** revisions on editable records/splits; preserve review drafts and selections during refresh. Guard batch approval, deletion, and processing checkpoints against repeated execution. Use committed chunk/completion invalidations, not broadcasts per imported row. Include recovery from interrupted jobs.
3. **Monthly plan, income, goals, loans, investments/assets:** reuse guarded editors and invalidate dependent plans, goal progress, available money, and net worth. Protect archive/delete actions from stale records too.
4. **Remaining read surfaces and settings:** reports, activity/detail views, household/settings data. Refresh mounted resource families; avoid rerunning all historical reports eagerly. Apply preconditions to consequential settings edits as each screen is adopted.

**Gate per workflow:** stale conflicts, atomicity/rollback, duplicate submission, partial failure/uncertain outcome, permissions, classic compatibility, live invalidation, and offline/resume behavior are tested. Maintain an explicit list of protected editors rather than an app-wide “safe” label.

## Classic compatibility boundary

Shared revisions and event triggers apply to all writers. Existing unversioned requests retain their payload/response shape and behavior; the added response revision is optional for legacy consumers. Prefer additive metadata over requiring new fields on existing endpoints. Do not expose client-settable revision columns through generic external API updates, imports, or backup restores.

The new UI always supplies a revision once its editor is migrated. Missing revisions in that editor are an error requiring a refresh, never a silent fallback to unguarded saving. Old cached clients may still use legacy requests during deployment; do not mistake those requests for guarded ones.

**Limitation:** an unchanged classic client can still submit its own stale edit and overwrite newer data. New UI preconditions protect new-UI saves against changes from either interface; they cannot protect an unguarded classic save. This is the accepted scope tradeoff while classic is being retired. A guarantee across every writer would require migrating those writers too.

If an atomic shared command changes required fields, error semantics, or side effects, preserve the old contract through an adapter where possible. Backport only the necessary classic request/response handling and show a real error instead of false success. Shared transactional fixes may benefit classic without redesigning its screens. Do not change versioned external API contracts casually.

## Free-plan budget and fallback

Limits checked 2026-10-30: Free includes **2 million Realtime messages/month** and **200 peak connections** ([pricing](https://supabase.com/docs/guides/realtime/pricing)); current Free throughput is **100 messages/second** ([limits](https://supabase.com/docs/guides/realtime/limits)). These are capacity constraints, not a promise that any size user base will fit.

Broadcast accounting includes the sent message plus deliveries to subscribers. For illustration only, 10,000 invalidations/day with two subscribed clients each is about 900,000 messages over 30 days, before other Realtime use. Test and production usage may share organization allowances; account for existing project use. See [message usage accounting](https://supabase.com/docs/guides/platform/manage-your-usage/realtime-messages).

- One shared socket per visible tab; no presence or idle heartbeat messages authored by the app.
- Compact payloads, source batching for bulk work, and deduplicated API refetches. Client debounce saves reads, not already-sent Realtime messages.
- Pilot with internal users first and inspect Supabase's existing usage reports. Track peak connections and projected month-end messages, plus database/HTTP load from refreshes.
- Use an operational warning threshold around 70% of the included allowance as an initial policy, not a Supabase-enforced limit. Reduce subscription scope/cadence or disable live delivery if needed; never automatically upgrade billing.
- Keep separate controls for live subscriptions/publishing and editor rollout. Disabling live delivery must leave conflict protection and resume refresh active. No upgrade is required for the planned pilot; ongoing capacity depends on measured usage.

## Verification and rollout

1. **Unit/route tests:** original revision retained through refresh; only changed fields; typed conflict errors; partial saves; deleted records; offline/uncertain outcomes; resource invalidation dependencies; event bursts; old responses; user/budget switching; check-in period boundaries including Sunday and month rollover.
2. **Real test-database concurrency tests:** race two guarded saves; mutate a card limit concurrently with available credit; verify stored derived balance and one correct audit trail. Include legacy writes, missing/malformed revisions, permission changes, transaction rollback, and idempotent recovery where introduced. Mock tests alone cannot prove database atomicity.
3. **Two browser sessions:** desktop/phone, background/resume, clean and dirty forms, concurrent edits, socket blocked, delayed/dropped/duplicate signals, network failure after commit, sign-out/token expiry, and account switching. Confirm light/dark/mobile accessibility, focus preservation, and no skeleton flash during refresh.
4. **Free-capacity tests:** representative batch import and multiple subscribers; measure messages before and after server batching, not just browser render counts. Check fallback request volume. Private channel membership tests include two unrelated households and two users in the same household.
5. **Rollout:** test project first; additive database migration before dependent code; new-client/editor and live-delivery flags independently controlled; opt-in/internal trial; then deploy through the existing migration/deployment workflow when separately authorized.
6. **Rollback:** turn off subscriptions/publishing if they misbehave while retaining guarded writes. Leave additive revisions in place. Avoid rolling back to an unguarded editor as the normal mitigation; if unavoidable, explicitly acknowledge loss of that protection. Use the existing migration backup process and do not destructively remove revisions or financial history.

## Completion definition

For a migrated new-UI workflow: stale drafts cannot silently overwrite newer records; unaffected data stays fresh without interrupting typing; interrupted connections recover; financial commands remain correct without Realtime; cross-household data cannot leak; and classic continues working with only necessary compatibility changes. The loading skeletons remain an initial-load presentation layer, independent of all of these guarantees.
