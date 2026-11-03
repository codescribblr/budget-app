# Categorization that earns the user's trust

N01 in the [new-interface backlog](NEW_LOOK_REMAINING_WORK.md). November 2, 2026.

**Release: November 2, 2026, on `codex/guided-budget-interface`. Approved for production rollout.** Migration 151 is applied to the test Supabase project. History and AI suggestions are usable; automatic promotion to Ready remains disabled pending measured outcomes. Numerical gates below are starting hypotheses, not measured accuracy claims. This replaces the earlier recommendation to port the classic Category Rules page.

## Implemented November 2

- `/new` has a dedicated responsive import review with Needs review, Ready, Duplicates, Left out, search, sequential review, bulk editing/confirmation, and partial import. The existing classic table remains available.
- Global merchant resolution and budget-wide confirmed history produce ranked suggestions, reasons, recent purchases, and a revision-checked Always ask preference. Legacy history can suggest but cannot certify a decision. Splits remain one mixed purchase.
- Existing Gemini categorization accepts unresolved, weakly prefilled, individual, and explicitly selected reviewed rows. It receives bounded personal history and eligible envelope IDs. Both predictions survive disagreement; a saved human choice wins. Subscription, feature, and daily usage checks remain in place. Disabled users get the appropriate settings link.
- Complete review choices, splits, tags, account, and duplicate decisions persist on the server. Saves, suggestions, preferences, and final import use revision checks. Drafts stay visible on conflicts. Undo restores fields and status. Background AI results cannot replace a reviewed choice.
- Migration 151 adds protected metadata, preference/configuration tables, durable AI runs/results, and one current evidence record per committed transaction. Posting and evidence are atomic. Corrections replace evidence, deletions remove it, and untracked classic edits lose confirmed status through signature checks. New manual transactions also contribute explicit evidence. Classic imports retain their editable payload contract and remain unknown provenance, even if they began with a copied new-interface choice.
- Preparation saves suggestions before completing the categorization checkpoint. Reopening reads saved progress; AI only runs on request. Provider responses and usage are persisted together once per run; partial results are retryable. A process crash between an external provider response and database persistence cannot guarantee exactly-once provider billing, so interrupted runs never silently restart.

### Release validation and rollout

Focused unit/API/checkpoint tests, TypeScript, and a production build are run alongside rollback-only database tests in `scripts/test-category-review.cjs`. The database checks cover complete splits, stale review/AI writes, foreign-budget references, forged metadata, trusted final approval, partial imports, undo, manual-entry evidence, classic edits after switching interfaces, replay, corrections, deletion, preferences, AI run serialization, and one usage record per run. Browser checks use the synthetic import batch: desktop and 390px layouts in both themes, saved sequential review, exact split amounts after reload, and no horizontal overflow. No financial records were posted through the browser.

Release checks passed: 68 import unit/API/checkpoint tests, 9 import-identity tests, TypeScript, and the rollback-only database suite. A live Gemini smoke test using two synthetic transactions and configured credentials returned valid, mapped suggestions through the new contextual prompt. This verifies provider integration, not prediction accuracy. Scope, errors, rate limits, and response persistence are also covered with fixtures and database checks. AI is not replaced by the history engine when credentials or access are unavailable.

Deploy migration `151_category_review.sql` before application code. Preserve existing classic endpoints and underlying merchant bridges. The November 2 read-only production audit found no additional category-learning trigger or scheduled job; the existing global-merchant identity trigger remains separate. Production was at migration 150 before this release. The existing Deploy to Production workflow backs up the database, applies migration 151, and then deploys the app. No backfill writes are needed: existing transactions without matching evidence are read as unknown provenance.

`category_automation_config` defaults both engines off. Enabling either requires budget-specific validation notes; AI additionally requires a matching model/prompt version and threshold. The final commit rechecks configuration, merchant identity, Always ask, and eligible category. Use `scripts/evaluate-categorization.cjs` for read-only source-separated outcome counts. Those counts are observational, not an unbiased accuracy claim; real calibration, held-out evaluation, monitoring, and opt-in enablement remain Stage C. A model confidence score alone never enables automation. No new subscription or ML infrastructure is introduced.


## Product clarification: both history and AI are in scope

The product owner reports that the existing AI categorizer often produces better results than the legacy automatic categorizer. Preserve and improve that tool as a core part of the first release, alongside the new history-based approach. AI is optional for the person using the app and remains subject to existing access settings; implementing it is not optional or deferred to a later phase. Neither source wins just because of its implementation: assess the evidence and measured results.

## 1. Purpose and product boundary

The job is to make a weekly import quick without hiding spending in the wrong envelope. A good system handles predictable transactions, puts uncertain ones in front of the user, and makes each decision easy. Categorizing the largest percentage of transactions is not success if users must distrust and recheck every assignment.

Two distinct questions drive the design:

- **Who was paid?** Global merchant identity, descriptions, names, and logos are maintained centrally by admins. Keep the existing infrastructure and transaction-specific correction/recommendation paths.
- **What was this purchase for in this budget?** Use this budget's history and the transaction's evidence. QT can legitimately be Food, Fuel, or a split. Walmart can be Groceries, Household, or several envelopes. A global business type cannot answer this question.

Scope learning to the active budget/household, not globally and not to a particular bank account. Collaborators share the same envelope system; record who made a decision, but do not hide the household's useful history behind the importing user's ID. Bank/card can eventually be contextual evidence, never a partition that forces users to train the same merchant again. Separate budgets never share personal category choices.

Automatic categorization means a proposed assignment is ready for the user's final import action. It does not mean automatically posting transactions, moving envelope money, changing recorded bank balances, or silently recategorizing past spending.

## 2. Baseline audit before this implementation

These are source findings at `9e7ec0b`, not measurements of production accuracy or production database configuration.

1. **Global merchant identity already has its own resolution path.** `processTransactions` links raw descriptions through `/api/import/link-merchants`; `resolveMerchantGroupIdsForImport` bridges to the global directory using existing budget/user group records. Those internal bridge records do not imply users should manage merchant groups.
2. **Categorization still uses the older learned-rule mechanism.** `/api/categorize` takes merchant strings, not transaction context. `findBestCategoryForMerchant` chooses the most-used group rule or a similar pattern. Learning raises a category's score by five points per use, capped at 100. Competing categories do not reduce that score. A frequently used category can therefore reach 100 without accounting for how often the merchant is categorized differently.
3. **Confidence is discarded before review.** Keyword suggestions have a score of 0.3, yet `processTransactions` turns any returned category into a full-amount split and a pending/importable row. `ParsedTransaction` has no durable category-confidence/reason/decision fields. Mobile's Ready bucket checks valid data/splits rather than the reliability of the category.
4. **Identity inputs differ between steps.** Linking uses the original description, categorization uses the extracted merchant string, and direct-import learning uses the description. The new service should resolve one canonical identity once and carry it through, retaining the original description as context.
5. **Learning paths are inconsistent in the checked-in code.** `/api/import/transactions` explicitly learns from submitted splits, including uncorrected suggestions, and does not restrict its learning list to successfully inserted rows. The newer guarded queue approval path does not call that learner; no equivalent category-learning trigger was found in repository migrations. Validate any production-only jobs/triggers before migration. Do not assume current scores or counts describe verified choices.
6. **Splits and provenance are not adequately represented for this purpose.** Legacy learning treats each split as a separate category observation; queue preparation/reload retains a single `suggested_category_id`. The new design needs to preserve complete review decisions and splits, and distinguish a mixed purchase from several independent purchases.
7. **Optional AI is a separate fallback.** The current import AI receives merchant, description, amount, date, type, and category names, but not the budget's confirmed merchant history. Its returned confidence is a model statement, not validated accuracy. The review currently applies a returned category without a confidence gate. Queued AI writes also need to join the revision-aware persistence path.

Relevant implementation references:

- [Global merchant resolver](../src/lib/db/merchant-groups.ts), [merchant rework summary](MERCHANT_GROUPING_REWORK_IMPLEMENTATION_SUMMARY.md)
- [Legacy category learner](../src/lib/merchant-category-rules.ts), [suggestion wrapper](../src/lib/smart-categorizer-supabase.ts), [categorization endpoint](../src/app/api/categorize/route.ts)
- [Import processing](../src/lib/csv-parser-helpers.ts), [checkpoint orchestration](../src/lib/import/queued-import-processing.ts), [review types](../src/lib/import-types.ts)
- [Mobile review buckets](../src/lib/import/mobile-review.ts), [review page](../src/components/import/ImportBatchPage.tsx), [shared preview](../src/components/import/TransactionPreview.tsx)
- [Direct-import learning](../src/app/api/import/transactions/route.ts), [guarded queue approval](../src/lib/guarded-import-route.ts), [queued AI](../src/app/api/import/ai-categorize-queued/route.ts)

## 3. Recommended user experience

Keep categorization inside Import & review. Do not introduce a separate rules administration page.

### Batch overview

Use the current compact review filters, with meaningful distinctions:

- **Needs review:** ambiguous suggestion, insufficient history, missing envelope, likely split, or invalid transaction details. Show a short status on the row and make the detailed reason available in the review editor.
- **Ready:** reliable automatic assignments and explicitly confirmed user decisions. Label rows `Auto-assigned` or `Reviewed`; never label an unexamined guess as reviewed.
- **Duplicates:** excluded by default; inspect matches and explicitly include a legitimate separate transaction using the existing safeguards.
- **Left out:** explicitly skipped rows. Distinguish them from unresolved rows still waiting for a decision.

For a new batch, open Needs review if there are unresolved items; otherwise open Ready. Keep a visible route to all records and a compact breakdown of counts. Counts must be mutually exclusive and reconcile to the batch total.

For example, a synthetic 42-row batch might show `Needs review 8 · Ready 31 · Duplicates 3`. These are illustration numbers, not current user data.

### Amounts mean money in or money out

Display transaction amounts as positive currency values using the normalized `transaction_type`, never the raw CSV sign, debit/credit terminology, or the direction of a card's liability balance. Use the shared `TransactionFlowAmount` in new import views: theme green + incoming arrow + `Money in` for income/refunds; theme muted red/clay + outgoing arrow + `Money out` for spending. Text makes the meaning accessible without relying on color. Apply this to mapping previews, review rows, pickers, details, and merchant history. Keep review readiness visually separate: an expense can have a green Ready checkmark and still be money out. Balance and audit-ledger displays retain their own signed semantics.

### One transaction, one clear decision

Keep date, amount, account/card, recognizable merchant, and original bank description visible. The default path on both desktop and mobile is a picker directly on each row: open it, choose an envelope, and save as reviewed immediately. Put AI/history suggestions at the top of the searchable picker. Keep `Details & split` as a secondary action; opening the full editor is optional. In that editor, suggested envelopes can also be accepted directly when no other fields have been changed.

For QT, a review card could read:

> QT · $38.42 · Oct 30 · Everyday card  
> You use Food and Fuel here.  
> Food · Fuel · Split · Other envelope  
> Why these choices? · Recent QT transactions

The reason panel might say `14 Food, 6 Fuel in your last 20 confirmed purchases`, with dates and amounts available on demand. These counts explain evidence; they are not a claimed probability of this purchase being Food. Display only records from the active budget.

Selecting an envelope from the row picker saves the decision in place. Keep the current review list’s membership and order stable, including through background refresh and category-search changes caused by a save. Mark completed rows with a subtle theme-aware fill, checkmark, and `Ready` label; keep them editable. Put Undo on the changed row in a fixed-height slot. Keep picker/row height stable, preserve focus on that row, and put general result messages below the list so they cannot push it down. Only explicitly changing the view/search reapplies its filter; newly arriving matching records append. Deleted or imported records are removed normally. Keep transaction context visible in the mobile picker and avoid opening the software keyboard until the user taps search. For a split, stay in the editor until exact amounts are confirmed; never flatten an existing split through quick assignment. A pending/failed save retains the picker and draft, and the revision captured when the picker opened protects against stale writes.

On desktop, keep the compact table but add review reasons and quick category actions or a side panel. Users can review sequentially or select an explicit subset for a bulk decision. `Apply to these 3 transactions` is a bounded action, not a rule for every future transaction from that merchant. Show the selected rows/amounts before applying.

### AI categorization is a primary review tool

Keep a prominent `AI categorize 8 transactions` action near the Needs review count for eligible users. It covers unresolved transactions with weak or conflicting suggestions as well as completely uncategorized transactions. A category already being filled in must not prevent AI from helping. Retain a per-row `Ask AI` action and a selection action for `Ask AI about selected transactions`, including unreviewed history-based assignments when the user wants a second opinion.

The default run is user-initiated, using the existing AI service, feature access, and limits. Show its exact scope before running. Exclude duplicates, explicitly left-out rows, and reviewed decisions by default. For an explicitly requested second opinion on a reviewed row, show an alternative that the user can accept; never replace the saved choice. Do not automatically run a paid/provider request merely because a batch, tab, or device was reopened.

Return AI choices to the same review workspace. Show `AI suggestion`, `Based on your history`, or `AI + history` with a short reason available on demand. A validated reliable assignment can move to Ready; an uncertain choice remains in Needs review with an `Accept` action. When both sources disagree, display both choices with their reasons. The user should not have to choose between separate AI and non-AI import workflows.

Keep progress and results per row. A partial AI failure leaves successful suggestions available and offers retry only for the failed rows. While AI runs, users can continue reviewing; a late response cannot overwrite a choice made on this or another device. Show a compact result such as `6 suggestions added · 2 still need your choice`, accurately reflecting persisted outcomes rather than treating every model response as completed review.

### Ready transactions still deserve visibility

Show the assigned envelope and a short reason such as `Based on your previous confirmed payments`. The user can expand evidence, change the envelope, or split it. Do not bury automatic assignments behind an opaque success total. Avoid automatic toast messages for every row.

No prominent percentage badges in v1: use `Auto-assigned`, `Check suggestion`, `Choose an envelope`, or `You sometimes split purchases here`. Numeric confidence can be logged internally once its meaning is established.

### Correcting the system without becoming its administrator

- Choosing a different envelope changes this transaction. It does not change other queued rows or create an always-use-this-category rule.
- Offer `Always ask me for this merchant` in contextual options. This is a budget-local, reversible preference; quick choices still appear. Offer `Use suggestions again` in the same place.
- A repeated mixed pattern should naturally keep the merchant in Needs review. The preference is an escape hatch, not required setup.
- Keep `Wrong merchant?` separate from changing the envelope. Allow the existing global-merchant override/recommendation path without making merchant correction a prerequisite for finishing category review.

### Finish, pause, and resume

Keep the primary action explicit: `Import 39 transactions`. Before posting, show counts, total expenses/income, selected accounts, and any unresolved/left-out/duplicate rows.

If unresolved rows remain, offer to finish reviewing them or explicitly `Import ready transactions and leave 4 for later`. Do not silently discard or reject them. A successful partial import leaves a clear resumable queue. Imported rows cannot be imported twice.

Review choices, split amounts, exclusions, and progress persist across reloads/devices. Closing a tab does not lose a reviewed split. The final action posts to the budget only after existing validation, permission, duplicate, and concurrency checks succeed.

## 4. How suggestions should be chosen

### History-based suggestions

Resolve the canonical global merchant and effective transaction override first. Build a distribution of independently confirmed category choices for that merchant in this budget. Compare categories by transaction count; do not let a large purchase outweigh many small purchases merely because it has more dollars.

Track recency, alternative categories, split frequency, recent corrections, and the amount/date/type/descriptor context available from the bank. Use raw descriptions for cues the global identity intentionally removes. An explicit `AT PUMP` descriptor may help distinguish fuel from convenience-store purchases; a brand name or a small amount alone cannot establish what was bought.

Use income/refund and expense evidence separately. Do not confidently classify a refund from an expense-only history. Exclude archived/deleted destinations, another budget's envelopes, and buffer/system/goal destinations from routine automatic selection unless a separately validated workflow explicitly supports them. Keep legitimate manual destinations and historical workflows available through existing validation.

When identity is unresolved, retain the description and allow the user to choose a category immediately. Exact descriptor history or keywords can rank suggestions conservatively. Uncertain/fuzzy merchant identity, an admin mapping change, or an inactive merchant prevents automatic assignment until the evidence is trustworthy again.

### Three decision outcomes

1. **Auto-assign:** strong, sufficiently supported, current evidence for one eligible envelope; no conflicting review flags.
2. **Suggest for confirmation:** plausible choice with limited evidence or ambiguity. Show ranked quick choices, but do not count the transaction as Ready until confirmed.
3. **Ask without a preferred category:** no useful evidence, conflicting evidence, a likely mixed purchase, or no eligible candidate. Offer recent/frequent envelopes without presenting one as the answer.

Do not use a winner-takes-all rule that ignores the runner-up. Do not convert `merchant recognized` into `category known`.

### Initial conservative gates to test

The user's intent is to automate the genuinely 90%+ reliable cases. Aim for **at least 95% observed precision on independently reviewed automatic assignments**, with 90% as a minimum acceptable boundary rather than a score copied from the old system. Prefer lower automatic coverage to unreliable assignments.

Before calibration, a candidate history gate for shadow evaluation is:

- At least 20 distinct, explicitly confirmed transactions for the relevant merchant/context within the past 12 months, spanning at least 3 separate dates and 2 imports or manual-entry sessions.
- At least 95% agree on the same eligible envelope, with the last 5 confirmed choices agreeing.
- No recent correction of an automatic assignment for that merchant/context in the past 30 days, no recent confirmed split, and no always-ask preference.
- No uncertain identity, new transaction type, or materially unfamiliar context. Amount can demote an otherwise confident assignment; amount alone does not promote one.

These gates are deliberately conservative, configurable, and may leave low-frequency merchants as suggestions. Passing them is not mathematical proof of 95% accuracy. Start new/contextual refinements in suggestion-only mode and calibrate from audited outcomes before they qualify for automatic assignment. When samples are sparse, keep suggesting instead of claiming a reliable rate.

Examples to validate with fixtures:

- **Utility, 24 matching confirmed payments:** candidate for automatic assignment after validation; still visible in Ready.
- **Walmart, 2 of 2 Groceries:** suggest Groceries; two examples do not establish high confidence.
- **Walmart, 18 Groceries and 2 Household:** mixed use; show both choices. A 90% historical share is not a 90% guarantee for this receipt.
- **QT, 14 Food and 6 Fuel:** ask, with Food/Fuel/Split shortcuts. Do not force Fuel from the merchant's business type or Food from its most-used envelope.
- **QT pump descriptor with reliable confirmed history:** a possible later contextual model; promotion requires enough evidence within that context, not across all QT spending.
- **Amazon often split across envelopes:** prompt for review/split; never manufacture a split from a merchant name.
- **A merchant the admin just merged:** recompute affected evidence; preserve already confirmed decisions and existing posted categories.

### AI suggestions with personal context

Reuse and improve the current AI categorizer in the first release. Give it the resolved merchant, original bank description, amount/date/type, eligible envelope IDs/names/purposes, and a bounded summary of relevant history from this budget. Include the distribution across envelopes, recent confirmed examples/corrections, and split frequency. Keep the history facts separate from the history engine's recommendation so the model can reason about the purchase instead of being instructed to agree with a guessed category.

Use only task-relevant context from the authorized budget; no complete budget export, unrelated account balances, or other households' histories. Treat bank descriptions as data, not instructions. Require structured results with transaction ID, an eligible category ID or abstention, relevant evidence, and an optional split-needed signal. Validate all identifiers and the input revision server-side. The model can identify uncertainty without inventing receipt items, amounts, or evidence.

For QT, AI can consider a genuine pump-specific descriptor alongside a personal history that is mostly Food. It should be able to suggest Fuel even when the history-only engine prefers Food. If the descriptor only says QT and the history is mixed, neither approach can know the contents of the receipt: show useful alternatives rather than a confident assertion.

### Combining both sources

- **Only one source has a useful answer:** use it as the suggestion. Reliable AI-only results may qualify for automatic assignment after validation even when there is too little history for the history engine; the 20-observation history gate is not an AI prerequisite.
- **They agree:** show one candidate with both sources recorded. Agreement can be supporting evidence, but cannot be treated as two independent votes when AI was given the same history. It does not automatically make a weak guess reliable.
- **They disagree:** retain both candidates and show why. Initially require review rather than silently favoring either AI or history. In particular, a weak legacy/keyword guess must not veto a useful AI suggestion or hide the AI action.
- **Neither has sufficient evidence:** ask the user and offer quick envelope choices or Split.
- **The user has decided:** the user's confirmed choice takes precedence. Both sources learn from that outcome only after successful posting, with the provenance rules below.
- **Always ask is enabled:** both sources may help with suggestions, but neither moves the row to Ready without the user's confirmation.

Evaluate history-only, AI-only, and combined outcomes separately against the same reliability objective. The AI model's own `0.95` is not the gate; calibrate its results against independently confirmed outcomes. Start unvalidated AI results as actionable suggestions, retaining the tool from day one, and allow validated AI cases to reach Ready without an extra per-row click. Changing the AI model or prompt requires reevaluation of its automatic-assignment gate. AI failures, feature restrictions, or rate limits leave history suggestions and manual review functional.

## 5. Learning without reinforcing mistakes

Record the origin and outcome of a decision, not just a category count.

- **Strong evidence:** a person selected, corrected, or explicitly confirmed the transaction's envelope(s), including deliberate bulk selections with visible scope.
- **Passive acceptance:** a prefilled automatic category passed through final batch import without transaction-level confirmation. Record the outcome, but do not treat it as independent evidence that the prediction was correct.
- **Unknown provenance:** older history and classic imports without explicit review metadata. It can seed ranked suggestions, but cannot alone unlock automatic assignment.
- **Never training evidence:** duplicates, skipped/rejected rows, failed imports, temporary drafts, pending guesses, or an AI suggestion by itself.

Learn only when a transaction is actually committed. An accepted review draft can be saved for resume but must not train the model before posting. Later manual category edits replace that transaction's prior contribution. Delete/revert removes it. Multiple edits and retries count as one current observation per transaction, not multiple votes. Record provenance for manual entry and bulk edits as well as imports.

Treat a split transaction as one mixed observation with its full allocation, not several independent single-category successes. A later correction of an automatic assignment is negative evidence for that prediction and positive evidence for the final user choice. It should promptly lower trust or return the merchant to review; it must not silently flip every transaction to the new category.

Admin renames/merges must not erase learning or leak it across budgets. Use stable identity references and a recomputable history projection. An admin change to merchant identity can invalidate machine proposals but must never override a user's confirmed envelope or alter posted category balances.

## 6. Persistence and API design

Use additive metadata and the existing guarded financial write paths. The implementation is in migration 151; the bullets below describe the design contract.

- **Suggestion record:** queue row ID, budget ID, effective merchant identity and identity revision, eligible candidates, explanatory evidence counts/window, decision outcome, separate history and AI candidates/reasons, AI model and prompt version, history model version, evidence version, combination policy, and fingerprint of relevant transaction inputs. A category is separate from whether it is merely suggested, auto-assigned, or human-confirmed.
- **Review decision:** complete split array in cents, reviewed/left-out state, actor and timestamp, decision source, accepted suggestion version, and row revision. Store this outside the raw bank payload; the original source data stays intact.
- **Evidence record/projection:** one current contribution per committed transaction, linked to its revision and provenance; optional aggregate counts per budget + canonical merchant + context. Retain enough source references to rebuild after corrections, merges, deletion, or model changes.
- **Merchant review preference:** budget + canonical merchant, `always_ask`, revision, actor/timestamp. This does not create a user-managed merchant directory.

The server resolves ownership, merchant identity, eligible destinations, and confidence; it must not trust a client-provided `highConfidence` or `reviewed` flag. A user decision is recorded through an authorized, revision-checked decision endpoint, and the final import validates that persisted decision and its input fingerprint. Recheck category availability and permissions at posting time.

Changing merchant/description/amount/type or relevant account context invalidates a machine suggestion. Preserve manual drafts and ask for confirmation when their inputs changed. Unrelated tag edits need not invalidate a category decision. Live updates refresh visible read-only evidence without replacing edits or advancing the review card.

Connect decision and evidence persistence to the existing import receipt/transaction commit, preferably atomically or through a durable idempotent outbox. A failed learning step cannot cause financial import to be repeated. All successful import entry points and later transaction edits/deletes must produce consistent evidence or explicitly unknown provenance.

Preparation keeps existing task checkpoints: persist results before marking the categorization step complete. Revisiting a batch never automatically reruns completed processing. `Refresh suggestions` operates explicitly on unresolved, unedited rows, explains its scope, and uses revision checks. Updated background evidence may display a notice; it cannot rewrite saved decisions or silently reprocess the batch.

AI requests have a durable run identity and per-row input fingerprints. Save their predictions independently of confirmed decisions and apply results with revision checks. Reopening reads saved results; a matching completed run can be reused instead of calling the provider again. A materially changed input or explicit rerun creates a new evaluation. A stale or partially failed response cannot replace a human decision, and duplicate clicks/retries must not apply results twice or casually consume the provider allowance again. Integrate queued AI writes with the guarded persistence path instead of the current direct `suggested_category_id` update.

## 7. Compatibility and cost

First expose the new experience only in `/new`. Keep classic routes/API contracts working; additive metadata must not make an old client crash or falsely certify an old suggestion. Classic decisions without provenance remain unknown unless a minimal shared change can record a genuine manual action. Do not port a rules page to support this feature.

Do not delete legacy merchant tables/rules during the initial rollout. Internal group records still bridge global identities. Audit dependencies, production-only jobs, and all import paths before retirement. Never reinterpret old counter-based confidence as a probability.

Existing queued rows retain their chosen category but are identified as legacy/unverified unless reliable review evidence exists. Offer explicit review rather than automatically rerunning preparation on open. Roll out v2 generation to new batches first. A feature flag can disable new automatic assignment while leaving manual review and existing posted transactions intact.

Use ordinary Supabase tables/indexes and batch queries for history and provenance; reuse the existing AI provider, subscription gates, and rate limits. No new ML service, vector database, or extra persistent realtime connection is required. AI calls still have their existing provider usage/cost; do not describe them as free or remove them to avoid that cost. Bound context and batch sizes, reuse valid saved results, and monitor tokens, latency, failures, and calls per import. Do not run a background AI call for every reliable history match by default; the explicit selection tool remains available to get a second opinion. This is a cost-conscious architecture, not a guarantee against free-tier usage limits. Avoid an unbounded scan or one history query per transaction: fetch/aggregate the batch's distinct merchants together, page complete input sets, and maintain recomputable summaries as usage grows. Refresh through the existing budget resource invalidation system. Measure query count, latency, and storage before release.

## 8. Implementation sequence and exit criteria

### Stage A — Durable decisions and evidence

- [x] Audit active direct/queued/email/Teller/API import and transaction-edit paths; verify production-only triggers/jobs read-only before rollout (November 2).
- [x] Add additive suggestion/review/provenance storage for both history and AI, with a canonical identity adapter; preserve complete splits across reloads and record each source/model version separately.
- [x] Integrate successful writes, corrections, and deletions with idempotent evidence updates and existing revision/permission checks.
- [x] Treat old history as unknown provenance through the history query. No financial backfill or inferred human confirmation.

Exit: decisions survive device changes; retries cannot duplicate votes or money; evidence can be rebuilt for a budget without changing its transactions.

### Stage B — A better review experience

- [x] Build Needs review / Ready / Duplicates / Left out with the new metadata, initially without expanding automatic assignment.
- [x] Add ranked choices, short reasons, recent merchant history, always-ask, exact split editing, and desktop/mobile review progression.
- [x] Keep the common action to two clicks: open a row’s envelope picker, choose an envelope, and immediately save it as reviewed. Put history/AI suggestions in the picker; keep full details and splits secondary. Preserve the picker-open revision for stale-write checks, require explicit duplicate review, and never flatten an existing split through quick assignment.
- [x] Include AI categorization in this first review release: batch unresolved rows, individual rows, and explicit selected-row second opinions; support weak prefilled suggestions as well as empty categories.
- [x] Enrich AI with bounded personal history and eligible-envelope context, then combine its result with history using explicit agreement/disagreement rules. Guard persistence, partial results, late responses, retries, and rate limits.
- [x] Add saved resume state and explicit partial import of Ready rows; preserve unresolved rows and show a clear receipt.
- [x] Replace misleading copy such as `Apply category rules` with task-oriented wording such as `Suggest envelopes from your history`.

Exit: both AI-assisted and history-only fixture reviews of QT, Walmart, a predictable bill, unknown merchant, refund, and split are quick and understandable at desktop and phone widths in both themes. AI is usable in this stage, including for rows that already contain a weak guess; only unvalidated automatic promotion is held back. Follow skeleton and background-refresh conventions.

### Stage C — Evaluate and enable reliable automation

- [x] Record history-only, AI-only, and combined predictions before the user decides, and collect explicit review outcomes to evaluate automatic promotion. Keep the AI tool available; do not wait for calibration to offer its suggestions. Log whether AI saw history so agreement is not mistaken for independent evidence.
- [ ] Evaluate chronologically using only information available before each prediction. Separate budgets and avoid counting duplicate/replayed transactions as new tests.
- [ ] Measure precision and coverage with numerator/denominator/sample size separately for history, AI, agreement, and disagreement; inspect errors by merchant, ambiguity, source, and transaction type. Compare the approaches on the same reviewed evaluation set where possible and account for AI selection bias toward difficult rows. Also measure review time, corrections, and provider cost. Do not count unchecked imports as verified correct.
- [ ] Enable automatic assignments only for validated cases, with a small opt-in rollout and an off switch. Keep an unbiased sample of would-be automatic rows in explicit review to monitor accuracy, rather than measuring only user-reported mistakes.

Exit: enough independently reviewed outcomes support the agreed reliability target, and errors do not concentrate in mixed-use merchants. Report uncertainty when samples are too small; coverage must not be increased just to make the dashboard look better.

### Stage D — Optional contextual improvements

- [ ] Test repeatable descriptor/account/amount context only where there is enough independent evidence. Do not overfit a few purchases.
- [ ] Refine both history and AI context/prompting based on observed errors, keeping the original AI integration in Stage B. Consider optional automatic AI runs for unresolved rows only after the explicit workflow and provider costs are understood.
- [x] Remove obsolete rule-management entry points from the new experience; retain required classic infrastructure until dependency checks permit retirement.

## 9. Acceptance scenarios

Before release, verify at least:

- Same global merchant, different budgets with different usual envelopes; two collaborators in one budget share its history.
- A high raw usage count with conflicting categories never becomes high confidence just through repetition.
- Small sample, cold start, stale history, an unusually large purchase, and an explicit always-ask preference.
- QT Food/Fuel ambiguity; Walmart multiple uses; a split purchase and a refund; a transfer/system category requiring explicit treatment.
- Duplicates, skipped rows, partial import failures, retries, and two-device approval do not create duplicate transactions or evidence.
- Refresh/reopen preserves full splits and reviewed decisions; a stale save is rejected without discarding the draft.
- An admin merge, user merchant override, archived category, permission change, or budget switch cannot apply an obsolete suggestion.
- A post-import correction/deletion changes evidence exactly once and never recategorizes other posted transactions.
- AI provides a useful answer with sparse personal history; its suggestion is available without satisfying the history-only sample gate.
- AI can reconsider a weak prefilled category, and AI/history disagreement is visible rather than resolved by an arbitrary source preference.
- Agreement based on shared history is not double-counted; a model's self-reported confidence cannot certify a row as Ready.
- A late AI response after local/remote manual review, a skipped row, a full split, or a changed input cannot overwrite the user's decision.
- AI partial failure/retry, reload, duplicate clicks, exhausted allowance, and a feature-disabled account preserve all review progress. Provider usage and successful persisted results reconcile.
- AI/merchant lookup/suggestion service unavailable: manual review and history suggestions still work and weak fallback guesses are not silently auto-assigned.
- Desktop/mobile keyboard and touch use, light/dark/reduced motion, stable skeletons, and no focus loss on background updates.
- Classic compatibility, rollback of the v2 feature flag, and bounded query/processing cost on representative large batches.

## 10. Decisions to revisit after the prototype

Recommended defaults are budget-wide learning, no confidence percentages in the main UI, automatic posting off, explicit partial import, one always-ask preference, both history-based and AI categorization in the first review release, an explicit AI action using the existing provider/access limits, and evidence-based automatic-assignment gates for either source. Validate the ease of reviewing uncertain rows and the amount of useful automation with the product owner before expanding scope. Neither a merchant rules builder nor a new recurring-bills system is part of this work.
