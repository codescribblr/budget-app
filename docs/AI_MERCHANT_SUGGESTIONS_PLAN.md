# AI-Powered Merchant Pattern Suggestions — Implementation Plan

## Overview

This feature reduces admin burden when grouping ungrouped transaction patterns to global merchants. Instead of manually scanning the ungrouped patterns list, admins receive a **weekly queue of AI-pre-screened suggestions**: each suggestion proposes grouping a set of patterns under an existing merchant or a new merchant name. The admin reviews each suggestion and can approve, reject, or remove individual patterns from a suggestion (with rejections stored so the AI does not re-suggest that pattern for that merchant).

---

## Goals

1. **Weekly AI run**: Use the most capable available AI model to analyze ungrouped `global_merchant_patterns` and produce suggested groupings (merge to existing merchant or create new merchant).
2. **Admin review queue**: A dedicated admin view lists pending suggestions; each shows suggested merchant (existing or “Create new: Name”) and the list of patterns.
3. **Approve / Reject**: Admin can approve (apply grouping) or reject (dismiss suggestion; patterns remain ungrouped).
4. **Remove pattern from suggestion**: Admin can remove a single pattern from a suggestion (e.g. trash/X icon); that pattern returns to ungrouped and a **rejection** is recorded so the AI won’t suggest that pattern for that merchant again.
5. **Rejection storage**: Persist “pattern X was rejected for merchant/suggestion Y” so future AI runs exclude that pairing.

---

## Current System (Brief)

- **Tables**: `global_merchants`, `global_merchant_patterns` (pattern, normalized_pattern, usage_count, first_seen_at, last_seen_at, `global_merchant_id` nullable).
- **Admin flows**:
  - **Merchant Patterns** (`/admin/merchant-patterns`): Lists ungrouped patterns; admin selects patterns and associates them with a merchant (or creates one) via “Associate Selected”.
  - **Global Merchants** (`/admin/merchants`): Manage merchants; view/ungroup patterns per merchant.
- **APIs**: `GET/POST /api/admin/global-merchants`, `GET /api/admin/global-merchants/patterns?filter=ungrouped`, `POST /api/admin/global-merchants/patterns/group`, `POST /api/admin/global-merchants/patterns/ungroup`.
- **Scheduled jobs**: `scheduled_jobs` table; single cron hits `/api/cron/run-jobs` daily; job handlers in `src/lib/scheduled-jobs/job-handlers.ts`; `scheduleNextRun` supports daily and monthly.
- **AI**: **Google Gemini** via `@google/generative-ai` and `src/lib/ai/gemini-service.ts`. API key: `GOOGLE_GEMINI_API_KEY`. The app uses `GEMINI_MODELS.pro` (e.g. `gemini-2.5-pro`) for reasoning and `GEMINI_MODELS.flash` for faster tasks; merchant suggestions should use the **Pro** model for best accuracy.

### AI provider and model (March 2026)

- **Provider**: Google Gemini API (same as AI categorization, insights, and chat elsewhere in the app). No OpenAI or other providers are used.
- **Model for merchant suggestions**: Use the **Pro** model for best accuracy — `GEMINI_MODELS.pro` from `src/lib/ai/constants.ts`, which reads `GEMINI_PRO_MODEL` (e.g. `gemini-2.5-pro`). As of March 2026, **Gemini 2.5 Pro** is Google’s most capable reasoning model for this kind of task (grouping noisy transaction patterns into canonical merchants). Other stable options in the same timeframe include Gemini 2.5 Flash for lower latency if needed; for this feature, prefer Pro for quality.
- **Config**: Reuse `GOOGLE_GEMINI_API_KEY` and `GEMINI_PRO_MODEL`; optional `GEMINI_MERCHANT_SUGGESTIONS_MODEL` to override for this feature only.

---

## Data Model

### 1. `global_merchant_suggestions`

Stores one AI-suggested grouping (a suggested merchant + set of pattern IDs).

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | PK |
| suggested_global_merchant_id | BIGINT NULL | FK → global_merchants.id; NULL = “create new” |
| suggested_display_name | VARCHAR(255) NULL | For “create new”; normalized display name |
| status | VARCHAR(20) | `pending` \| `approved` \| `rejected` |
| batch_id | VARCHAR(64) NULL | e.g. `suggest_2026-03-02` for weekly run |
| created_at | TIMESTAMPTZ | When suggestion was created |
| reviewed_at | TIMESTAMPTZ NULL | When admin reviewed |
| reviewed_by | UUID NULL | FK → auth.users |
| metadata | JSONB | Optional (e.g. model name, token usage) |

- **RLS**: Admin-only SELECT/UPDATE; only service/cron inserts (or admin “retry” if we add it).
- **Indexes**: `status`, `batch_id`, `created_at`.

### 2. `global_merchant_suggestion_patterns`

Junction: which patterns belong to which suggestion. We use `global_merchant_patterns.id` (pattern_id).

| Column | Type | Description |
|--------|------|-------------|
| suggestion_id | BIGINT | FK → global_merchant_suggestions(id) ON DELETE CASCADE |
| pattern_id | BIGINT | FK → global_merchant_patterns(id) ON DELETE CASCADE |
| PRIMARY KEY | (suggestion_id, pattern_id) | |

- **RLS**: Same as suggestions (admin read; service/cron insert).

### 3. `global_merchant_pattern_rejections`

Records “pattern P was rejected for merchant M (or for new-merchant name N)” so the AI (or post-filter) does not re-suggest that pair.

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | PK |
| pattern_id | BIGINT NOT NULL | FK → global_merchant_patterns(id) ON DELETE CASCADE |
| rejected_global_merchant_id | BIGINT NULL | Rejected for this existing merchant |
| rejected_suggested_display_name | VARCHAR(255) NULL | Rejected for “create new” with this name (normalized) |
| created_at | TIMESTAMPTZ | When rejection was recorded |

- **Constraint**: At least one of `rejected_global_merchant_id` or `rejected_suggested_display_name` must be non-NULL.
- **Uniqueness**: One row per (pattern_id, rejected_global_merchant_id, rejected_suggested_display_name) with a unique partial index or constraint handling NULLs (e.g. unique on (pattern_id, COALESCE(rejected_global_merchant_id::text, ''), COALESCE(rejected_suggested_display_name, ''))).
- **RLS**: Admin SELECT; admin and suggestion-approval flow INSERT.

---

## Weekly AI Job

### Job type

- **Job type**: `suggest_merchant_groupings`
- **Schedule**: Weekly (e.g. Monday 08:00 UTC). Implemented by:
  - Adding a weekly branch in `scheduleNextRun` (e.g. `schedule === '0 8 * * 1'` → next Monday 08:00).
  - Migration or seed that inserts the first pending job for `suggest_merchant_groupings` with `scheduled_for` set to next Monday.

### Handler steps

1. **Load ungrouped patterns**
   - Query `global_merchant_patterns` where `global_merchant_id IS NULL`, ordered by `usage_count DESC`, with a reasonable limit (e.g. 500–1000) to stay within token limits.
   - Optionally exclude patterns that have no recent activity (e.g. `last_seen_at` &gt; 6 months ago) to keep suggestions relevant.

2. **Load rejection set**
   - Query `global_merchant_pattern_rejections` and build a set of (pattern_id, merchant_key) where merchant_key is either `merchant_id` or normalized `suggested_display_name`. Use this to filter AI output or to post-filter suggestions.

3. **Load existing global merchants**
   - Fetch active (and optionally draft) global merchants: id, display_name (and maybe normalized). Used to suggest “merge to existing” and to avoid suggesting a new merchant that already exists.

4. **Call AI**
   - **Provider**: Google Gemini (same as the rest of the app).
   - **Model**: Use the **Pro** model for best accuracy: `GEMINI_MODELS.pro` from `src/lib/ai/constants.ts`, which resolves to `GEMINI_PRO_MODEL` env (e.g. `gemini-2.5-pro`) or fallback `gemini-2.0-flash-exp`. As of March 2026, **Gemini 2.5 Pro** is the recommended model for complex reasoning tasks like grouping merchant patterns; it supports long context and structured output. Optional: add `GEMINI_MERCHANT_SUGGESTIONS_MODEL` env to override for this feature only.
   - **Input**: 
     - List of ungrouped patterns: `{ id, pattern, normalized_pattern, usage_count }` (no need to send first_seen/last_seen unless we want).
     - List of existing merchant names (and optionally ids) for “merge to existing”.
   - **Instructions**: Ask the model to:
     - Group patterns that clearly refer to the same real-world merchant.
     - For each group, either assign an existing merchant (by id or exact name) or propose a new display name.
     - Ignore generic/unclear patterns or leave them ungrouped.
     - Consider that patterns often contain unique IDs, dates, or location codes that should be normalized to a single merchant (e.g. “AMZN Mktp US*AB1C2D3E4” → Amazon).
   - **Output format**: Structured JSON, e.g.:
     - `suggestions: [ { "suggested_merchant_id": number | null, "suggested_display_name": string | null, "pattern_ids": number[] } ]`
     - If only one of suggested_merchant_id or suggested_display_name is set, the other is null. For “create new”, only suggested_display_name is set.

5. **Post-process**
   - Filter out any suggestion whose (pattern_id, merchant_key) appears in the rejection set. If a suggestion has no patterns left, drop it.
   - Validate suggested_merchant_id against existing merchants and suggested_display_name non-empty for “create new”.
   - Deduplicate pattern_ids across suggestions (e.g. first suggestion wins; or drop duplicates and log).

6. **Persist**
   - Generate a `batch_id` (e.g. `suggest_YYYY-MM-DD`).
   - For each suggestion, insert into `global_merchant_suggestions` (status = `pending`, batch_id, suggested_global_merchant_id, suggested_display_name).
   - Insert rows into `global_merchant_suggestion_patterns` for each (suggestion_id, pattern_id).

7. **Schedule next run**
   - On success, call `scheduleNextRun('suggest_merchant_groupings', { schedule: '0 8 * * 1' })` so the next run is next Monday.

---

## API Design

### GET `/api/admin/global-merchants/suggestions`

- **Query**: `?status=pending` (default), `status=all`, `batch_id=...`, `limit`, `offset`.
- **Response**: List of suggestions with pattern count and optionally full pattern details (id, pattern, usage_count, first_seen_at, last_seen_at). Include suggested merchant: either `global_merchant` (id, display_name, status) or `suggested_display_name` for “create new”.
- **Auth**: Admin only.

### POST `/api/admin/global-merchants/suggestions/:id/approve`

- **Body**: Optional `{ "pattern_ids": number[] }` to approve only a subset; if omitted, approve all patterns in the suggestion.
- **Logic**:
  - If `suggested_global_merchant_id` is set: use that merchant. Else create a new `global_merchant` with `suggested_display_name`, status `active`.
  - For each pattern_id in the (possibly filtered) list, update `global_merchant_patterns.global_merchant_id` to the chosen merchant id.
  - Call existing sync: `syncTransactionsForPatterns(pattern_ids, merchant_id)`.
  - Update suggestion status to `approved`, set reviewed_at, reviewed_by.
  - Optionally delete the suggestion row after approval (or keep for audit); if kept, no need to delete `global_merchant_suggestion_patterns` (they’re still valid historically).
- **Auth**: Admin only.

### POST `/api/admin/global-merchants/suggestions/:id/reject`

- **Body**: Optional `{ "reason": string }`.
- **Logic**: Set suggestion status to `rejected`, reviewed_at, reviewed_by. Do **not** add rows to `global_merchant_pattern_rejections` for a full reject (patterns stay ungrouped; we only record rejections when admin explicitly removes a pattern from a suggestion).
- **Auth**: Admin only.

### POST `/api/admin/global-merchants/suggestions/:id/remove-pattern`

- **Body**: `{ "pattern_id": number }`.
- **Logic**:
  - Ensure suggestion is still `pending` and that (suggestion_id, pattern_id) exists in `global_merchant_suggestion_patterns`.
  - Delete the row from `global_merchant_suggestion_patterns`.
  - Insert into `global_merchant_pattern_rejections`: pattern_id, and either rejected_global_merchant_id (if suggestion had suggested_global_merchant_id) or rejected_suggested_display_name (normalized, if “create new”).
  - If the suggestion has no patterns left after removal, set suggestion status to `rejected` (or delete the suggestion).
- **Auth**: Admin only.

### POST `/api/admin/global-merchants/suggestions/run` (required)

- **Purpose**: Manually trigger the AI suggestion job on demand. Admins use this via a “Run suggestions now” button on the AI Merchant Suggestions page so they can generate a new batch without waiting for the weekly cron.
- **Logic**: Enqueue a one-off `suggest_merchant_groupings` job with `scheduled_for = now`, or call the handler directly and return a summary (e.g. “Created N suggestions”, “Job started”). Prefer enqueue so the same handler runs and scheduling stays consistent. Return a clear success message and optionally the new batch_id so the UI can refresh the list.
- **Auth**: Admin only.

---

## Admin UI

### Placement

- **Option A**: New admin page “AI Merchant Suggestions” (e.g. `/admin/merchant-suggestions`) with a link in the admin sidebar next to “Merchant Patterns” and “Global Merchants”.
- **Option B**: A tab or section on the existing Merchant Patterns page (e.g. “Ungrouped” vs “AI suggestions”).
- **Recommendation**: Option A — dedicated page keeps the flow clear and leaves room for filters (by batch, status) and future stats.

### Page: AI Merchant Suggestions

1. **Header**
   - Title: “AI Merchant Suggestions”
   - Short description: e.g. “Review AI-suggested groupings. Approve to apply, or remove patterns you don’t agree with.”
   - **“Run suggestions now” button** (required): Calls `POST /api/admin/global-merchants/suggestions/run` to trigger the suggestion job immediately. Show loading state while the request runs; on success, refresh the suggestions list (and optionally show a toast like “Suggestions generated” or “Job started—refresh in a moment”). This allows admins to generate a new batch on demand instead of waiting for the weekly schedule.

2. **Filters**
   - Status: Pending (default) / All / Approved / Rejected.
   - Batch: dropdown or text (batch_id).
   - Optional: date range.

3. **List**
   - Table or cards: one row per suggestion.
   - Columns/cards: Suggested merchant (name + “Existing” vs “Create new”), pattern count, batch_id, created_at.
   - Click row (or “Review”) to open detail.

4. **Detail view / drawer**
   - Suggested merchant: display name + badge “Existing” or “Create new”.
   - List of patterns: pattern text, usage_count, first_seen_at, last_seen_at; each row has a **remove** control (trash/X icon) that calls `remove-pattern` and refreshes.
   - Actions: **Approve** (primary), **Reject** (secondary).
   - Optional: Approve with subset (e.g. checkboxes per pattern); if we support that, API already supports `pattern_ids` in approve body.

5. **Empty / loading**
   - If no pending suggestions: “No pending suggestions. Next run: …” (if we expose next run time from scheduled_jobs).
   - Loading states for list and for approve/reject/remove.

### Remove-pattern behavior

- Clicking X/trash on a pattern in the suggestion detail:
  - Call `POST .../suggestions/:id/remove-pattern` with `{ pattern_id }`.
  - On success: remove that pattern from the UI and record rejection; if no patterns left, show “Suggestion has no patterns” and mark as rejected or hide.
  - Pattern returns to ungrouped list on Merchant Patterns page; it will not be re-suggested for this merchant in future runs (because of `global_merchant_pattern_rejections`).

---

## Rejection Logic in AI Job (Detail)

When building input for the AI (or when post-filtering):

- For each ungrouped pattern P and each suggested merchant M (id or suggested_display_name), if (P.id, M) exists in `global_merchant_pattern_rejections`, do not include P in a suggestion for M.
- Implementation: load all rejections into a Set of `pattern_id + merchant_key` (e.g. `pattern_id:merchant_id` or `pattern_id:normalized_name`). When writing suggestions to the DB, skip any (suggestion, pattern_id) where (pattern_id, this suggestion’s merchant_key) is in that set. When calling the AI, we can either:
  - **Option 1**: Pass ungrouped patterns and existing merchants only; then post-filter AI output by rejections (remove pattern_ids from suggestions if they’re rejected for that suggestion’s merchant). Then persist only the filtered suggestions.
  - **Option 2**: Pre-filter: don’t send to the AI patterns that have any rejection for a merchant we’re about to suggest. That’s trickier because we don’t know suggestions yet; so Option 1 is simpler.

Recommendation: **Option 1** — post-filter AI output using `global_merchant_pattern_rejections` before persisting.

---

## AI Prompt (Draft)

High-level structure (to be refined in implementation):

- **System**: You are an expert at matching transaction descriptions (merchant patterns) to canonical merchant names. Patterns often contain unique IDs, dates, or location codes; your job is to recognize the underlying merchant.
- **Input**: JSON with `ungrouped_patterns: [{ id, pattern, normalized_pattern, usage_count }]` and `existing_merchants: [{ id, display_name }]`.
- **Output**: JSON only, e.g. `{ "suggestions": [ { "suggested_merchant_id": number | null, "suggested_display_name": string | null, "pattern_ids": number[] } ] }`.
- **Rules**:
  - Group only when you’re confident (same real-world merchant).
  - Use `suggested_merchant_id` when matching an existing merchant (exact or clear match to display_name).
  - Use `suggested_display_name` only for “create new”; must be a clear, human-readable name.
  - Do not suggest a new merchant name that already exists in `existing_merchants`.
  - Leave ambiguous or generic patterns out of any suggestion (they stay ungrouped).
  - Each pattern_id may appear at most once across all suggestions.

---

## Files to Add/Change (Checklist)

### Migrations

- New migration: create `global_merchant_suggestions`, `global_merchant_suggestion_patterns`, `global_merchant_pattern_rejections` with RLS and indexes.
- New migration or seed: insert first `suggest_merchant_groupings` job (weekly) if we don’t create it on first run.

### Backend

- **Job handler**: `handleSuggestMerchantGroupings()` in `job-handlers.ts` (and register in `getJobHandler`).
- **Scheduler**: In `scheduleNextRun`, add weekly schedule (e.g. `0 8 * * 1` → next Monday 08:00).
- **AI helper**: New module e.g. `src/lib/ai/merchant-suggestions.ts`: build prompt, call **Google Gemini** via existing `geminiService` (or a dedicated method using `GEMINI_MODELS.pro`), parse response, apply rejection filter, return list of suggestions to persist.
- **Routes**:
  - `GET /api/admin/global-merchants/suggestions/route.ts`
  - `POST /api/admin/global-merchants/suggestions/[id]/approve/route.ts`
  - `POST /api/admin/global-merchants/suggestions/[id]/reject/route.ts`
  - `POST /api/admin/global-merchants/suggestions/[id]/remove-pattern/route.ts`
  - `POST /api/admin/global-merchants/suggestions/run/route.ts` (required — used by the “Run suggestions now” button)

### Frontend

- New page: `src/app/admin/merchant-suggestions/page.tsx` (wrapping a client component).
- New component: `src/components/admin/AdminMerchantSuggestionsPage.tsx` (list, filters, **“Run suggestions now” button**, detail drawer, approve/reject/remove-pattern).
- Admin sidebar: add “AI Merchant Suggestions” link.

### Config / Env

- Reuse existing Gemini config: `GOOGLE_GEMINI_API_KEY`, `GEMINI_PRO_MODEL` (e.g. `gemini-2.5-pro`). Optional: `GEMINI_MERCHANT_SUGGESTIONS_MODEL` to override the model for this feature only (default: use `GEMINI_MODELS.pro`).

---

## Testing and Rollout

1. **Unit**: Rejection filter (given AI output + rejections table, expected suggestions); prompt shape and parsing.
2. **Integration**: Run job in dev with a small set of ungrouped patterns; verify suggestions created and that approve/ungroup/remove-pattern and sync behave correctly.
3. **Manual**: Run weekly job once; review queue in UI; approve one, reject one, remove one pattern from another; confirm rejections table and next run don’t re-suggest removed pattern for that merchant.
4. **Rollout**: Feature flag optional; default to “AI suggestions” page visible only to admins. Cron already runs daily; weekly job will only run when its `scheduled_for` is due.

---

## Summary

| Item | Description |
|------|-------------|
| **New tables** | `global_merchant_suggestions`, `global_merchant_suggestion_patterns`, `global_merchant_pattern_rejections` |
| **Weekly job** | `suggest_merchant_groupings`: load ungrouped patterns + rejections + merchants → AI → post-filter → persist suggestions |
| **APIs** | GET suggestions, POST approve, POST reject, POST remove-pattern, **POST run** (manual trigger) |
| **Admin UI** | New “AI Merchant Suggestions” page: list, filters, **“Run suggestions now” button**, detail with pattern list and per-pattern remove, approve/reject |
| **Rejections** | Stored when admin removes a pattern from a suggestion; used to avoid re-suggesting that pair in future runs |

This plan keeps the existing Merchant Patterns and Global Merchants flows unchanged and adds a parallel, AI-assisted path that admins can use to clear the queue faster while retaining full control (approve, reject, or remove individual patterns).
