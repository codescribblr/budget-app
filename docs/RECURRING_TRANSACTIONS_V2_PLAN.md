# Recurring Transactions V2 — Comprehensive Plan

**Status**: Draft  
**Last Updated**: 2026-06-08 (stale data & missed-charge resolution added)  
**Branch**: `feature/recurring-transactions`

## Executive Summary

Recurring transaction tracking is deceptively hard because **temporal regularity ≠ financial obligation**. A user who visits McDonald's every Saturday exhibits a recurring *pattern*, but not a recurring *charge*. The feature must distinguish **involuntary/automatic obligations** (subscriptions, bills, autopay) from **voluntary discretionary spending** (dining, gas fill-ups, groceries).

This plan proposes **two complementary features** that share infrastructure but serve different user needs:

| Feature | Unit of tracking | Primary question |
|---------|------------------|------------------|
| **Recurring Charge Tracker** | Individual merchant + amount pattern | "Did my Netflix bill change? Did my electric bill miss its date?" |
| **Category Budget Monitor** | Budget category aggregate | "Is my Utilities category consistently over budget? Was there an unusual spike?" |

Both features alert users proactively. Only the first requires detecting individual recurring charges.

---

## Problem Statement

### What went wrong in past attempts

1. **Over-matching**: Weekly McDonald's visits, frequent gas station fill-ups, and Amazon purchases flagged as "recurring."
2. **Under-matching**: Legitimate subscriptions missed when amounts drifted slightly or dates shifted for holidays/weekends.
3. **Stale patterns**: Cancelled subscriptions remained active for months/years after the last charge.
4. **No lifecycle management**: Users couldn't easily dismiss false positives; the list became noisy.
5. **Incomplete alerting**: Amount-change and missed-payment notifications exist in schema but aren't fully wired.
6. **Category blindness**: A "Utilities" category with 4 separate bills (gas, water, electric, trash) has no per-bill visibility in category reports.
7. **Stale transaction data**: Most users import or enter transactions manually — data is often weeks or months behind. Missed-charge alerts falsely imply cancellation when the user simply hasn't imported recent statements.

### What users actually want

| Alert type | Example |
|------------|---------|
| **New recurring charge detected** | "We noticed a new $14.99/month charge from Spotify" |
| **Amount increased/decreased** | "Your electric bill was $187 this month, up 34% from your usual $140" |
| **Missed expected charge** | "We didn't see your Netflix charge for March. Did you cancel, or are recent transactions missing from your imports?" |
| **Possibly stopped** | "No charge from Adobe in 2 months — subscription may have ended" |
| **Category over/under budget** | "Utilities has been 20% over budget for 3 consecutive months" |
| **Unusual transaction in category** | "A $450 charge in Dining is 3× your typical transaction size" |

---

## Conceptual Model

### Recurring Charge vs. Behavioral Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                    TEMPORAL REGULARITY                          │
│         (transactions occur on a predictable schedule)          │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼─────────┐         ┌─────────▼─────────┐
    │  INVOLUNTARY      │         │  VOLUNTARY        │
    │  (automatic bill) │         │  (user decides)   │
    ├───────────────────┤         ├───────────────────┤
    │ Netflix $15.99    │         │ McDonald's ~$10   │
    │ Mortgage $2,400   │         │ 7-Eleven gas ~$45 │
    │ City Electric     │         │ Amazon purchases  │
    │ Gym membership    │         │ Grocery runs      │
    │ 7-Eleven club $10 │         │                   │
    └─────────┬─────────┘         └─────────┬─────────┘
              │                             │
              ▼                             ▼
       TRACK & ALERT                  DO NOT TRACK
       (this feature)                 (behavioral, not billing)
```

**Key insight**: 7-Eleven gas fill-ups are voluntary; the 7-Eleven *membership club* at $10/month is involuntary. Same merchant, different intent. Detection must operate at the **amount-pattern level within a merchant**, not just the merchant level.

### Confidence Tiers

Rather than binary detect/don't-detect, use a three-tier system:

| Tier | Confidence | User experience |
|------|------------|-----------------|
| **Confirmed** | User confirmed OR `final_confidence` ≥ 0.85 with sufficient occurrences | Full tracking, notifications enabled |
| **Suggested** | `final_confidence` 0.55–0.84 AND meets minimum occurrence gate (§1.9) | Shown in "Review suggested" queue; no notifications until confirmed |
| **Hidden** | Below threshold OR insufficient occurrences for charge class | Not surfaced; available if user manually adds |

**Important:** `final_confidence` combines spend-intent classification (§1.8) with occurrence/evidence scoring (§1.9). A single transaction with "Netflix Subscription" in the description can surface at low confidence; a variable utility with 2 months of data cannot — it needs 4+.

This lets us be slightly aggressive in detection without annoying users — false positives land in "Suggested" where they're one click to dismiss.

---

## Feature 1: Recurring Charge Tracker

### 1.1 Detection Pipeline

Replace the current monolithic `analyzePattern()` with a staged pipeline. Each stage is independently testable.

```
Transactions (12–18 month lookback)
    │
    ▼
[1] Candidate Grouping
    │  Group by: merchant_group_id + transaction_type + payment_source (account/card)
    │  Filter: ≥ 1 transaction, non-system category splits
    │  (Most paths require more — occurrence gate at stage 7, §1.9)
    ▼
[2] Gap Segmentation
    │  Split on gaps > max(2× median_interval, frequency_floor)
    │  Only most recent segment is eligible
    ▼
[3] Amount Sub-Grouping
    │  Cluster by similar amount (±$5 or ±5%, whichever larger)
    │  Multi-subscription merchants (e.g., Apple) → separate patterns per amount
    ▼
[4] Cadence Inference
    │  Requires ≥ 2 occurrences (1 interval); prefers ≥ 3
    │  Median interval + MAD → classify frequency
    │  Reject if MAD/median > 0.25 (waived for explicit-text path at n=1)
    ▼
[5] Date Anchor Validation
    │  Monthly: day-of-month OR nth-weekday OR last-day-of-month
    │  Weekly/biweekly: consistent weekday (±1 day for posting shifts)
    │  Apply business-day shift rules (Fri→Mon, Sat→Mon)
    ▼
[6] Spend Intent Classification
    │  5-layer classifier → involuntary score (see §1.8)
    │  Hard reject on blocklist; allowlist bypass
    ▼
[7] Occurrence Gate & Final Confidence
    │  Enforce per-class minimum occurrences (§1.9)
    │  Compute evidence_score from count + cadence/date/amount consistency
    │  final_confidence = blend(involuntary_score, evidence_score)
    │  Recency gate; output tier: hidden | suggested | high-confidence
    ▼
[8] Save / Update
    │  Merge with existing patterns; link new transaction matches
```

### 1.2 Involuntary Charge Signals (summary)

> **Full specification:** See **§1.8 Merchant & Category Classification System** for gap analysis, layered detection, scoring math, edge cases, and schema.

The classifier produces an **involuntary score** (0.0–1.0) — the probability this is an automatic charge, not voluntary spending. Quick reference:

| Signal source | Max impact | Notes |
|---------------|------------|-------|
| Budget category name (Layer 1) | ±0.15 | User's envelope name, not `category_type` |
| Merchant/description keywords (Layer 2) | ±0.25 | AUTOPAY, utility co. names, dining chains |
| Behavioral patterns (Layer 3) | ±0.30 | Frequency, weekends, amount stability |
| Curated merchant registry (Layer 4) | Override | Hard reject or bypass |
| User feedback memory (Layer 5) | Override | Per-user dismissals remembered |

**Decision thresholds** use `final_confidence` (§1.9), not involuntary score alone:
- `< 0.45` OR below minimum occurrences → Hidden
- `0.45–0.69` → Hidden unless variable-bill path with ≥ 4 occurrences
- `0.70–0.84` → Suggested (review queue + digest notification)
- `≥ 0.85` → Suggested with high-confidence badge (still requires user confirm)

### 1.3 Schedule Handling

Real-world billing doesn't land on exact dates. The system must model **anchors** and **grace windows**.

#### Date anchor types

| Anchor | Example | Detection method |
|--------|---------|------------------|
| `fixed_day` | Bill on the 15th | Median day-of-month, allow ±2 days |
| `month_start` | Bill on 1st–3rd | Cluster around days 1–3 |
| `month_end` | Bill on 28th–31st | Cluster around last 3 days; normalize across month lengths |
| `nth_weekday` | "First Monday" | week_of_month + day_of_week |
| `last_weekday` | "Last Friday" | Last occurrence of weekday in month |
| `interval` | Every 14 days | Median interval, no day anchor |
| `last_business_day` | End-of-month business day | Last weekday of month |

#### Grace windows (for matching & missed detection)

| Frequency | Match window | Missed-after |
|-----------|-------------|--------------|
| Weekly | ±1 day | +3 days past expected |
| Biweekly | ±2 days | +4 days past expected |
| Monthly | ±3 days | +7 days past expected |
| Quarterly | ±5 days | +10 days past expected |
| Yearly | ±7 days | +14 days past expected |

#### Business day adjustment

Before flagging a date mismatch, check if the expected date fell on a weekend/holiday and the actual transaction landed on the nearest business day. Maintain a US federal holiday list (or use a lightweight library).

#### Computing next expected date

```
monthly + fixed_day(15):
  next = addMonths(last_occurrence, 1)
  next.day = min(15, lastDayOfMonth(next))

monthly + month_end:
  next = lastDayOfMonth(addMonths(last_occurrence, 1))

biweekly + interval:
  next = last_occurrence + 14 days
  if next.weekday != anchor_weekday:
    adjust to nearest anchor_weekday within ±1 day
```

### 1.4 Fixed vs Variable Amount Patterns

#### Fixed amount (subscriptions, memberships, mortgage)

- Expected amount = median of last N occurrences (N = min(6, occurrence_count))
- Variance tolerance = max($1, 2% of expected) for confirmed patterns
- Alert on change if new amount deviates > max($2, 5%) from rolling median
- Track amount history for trend display

#### Variable amount (utilities, usage-based)

Utilities like electric/gas/water are the canonical case: **monthly schedule, wildly varying amounts**. A sequence like $98 → $275 → $110 → $95 is normal and must be tracked.

**Detection uses a separate path from fixed-amount patterns.** Amount variance is never a rejection criterion — only date cadence and merchant/category signals matter.

| Criterion | Fixed-amount patterns | Variable-amount patterns |
|-----------|----------------------|--------------------------|
| Primary signal | Stable amount + regular dates | Regular dates + utility-like merchant/category |
| Amount CV used for | Confidence boost/penalty | **Not used for reject** — only stored for alerting |
| CV ceiling | N/A (low CV expected) | **No upper bound** (CV of 0.8+ is fine) |
| Min occurrences | 3 default; 2 with allowlist + stable amount; 1 with explicit subscription text (§1.9) | **4 minimum** (6+ preferred for high confidence) |
| Amount sub-grouping | Required (separate Netflix tiers) | **Skipped** — one pattern per merchant per account |

> Full occurrence matrix: **§1.9 Occurrence Count & Evidence Scoring**

**Detection rules for variable patterns:**
1. Monthly cadence (median interval 25–35 days, interval MAD/median < 0.25)
2. Date anchor consistency (day-of-month MAD ≤ 5 days, or month-start/month-end cluster)
3. Passes spend intent classification as `variable_bill` (§1.8) — utility category, bill-pay keywords, variable-bill registry hint, or ≤ 1.2 txns/month
4. Amount CV > 0.15 OR max/min ratio > 1.5 (confirms this isn't a fixed subscription misclassified)

**What we store (not a single "expected amount"):**
- `is_amount_variable = true`
- `expected_amount` = rolling median (for display only, labeled "typical")
- `amount_variance` = IQR or std dev (for internal range calculation)
- `amount_history` = last 12 `{date, amount}` entries
- UI shows: **"Variable — typically $98–$275"** (min/max of last 6 months or IQR range)

**Alerts for variable patterns** (different from fixed):
| Alert | When |
|-------|------|
| **Unusually high** | New amount > Q3 + 1.5×IQR (or > 2× rolling median if < 6 data points) |
| **Unusually low** | New amount < Q1 − 1.5×IQR (possible billing error or credit) |
| **Sustained increase** | 3 consecutive months each higher than the prior |
| **Missed bill** | No transaction in expected date window (same as fixed) |

**Do NOT alert** when a $275 month follows a $98 month if both fall within the established historical range — that's normal utility variance, not a "change."

**Example:** City Electric — $98, $275, $112, $89, $260, $105 over 6 months
- CV ≈ 0.55, max/min ratio ≈ 2.8 → qualifies as variable
- Date anchor: ~12th of month ±3 days → passes
- Category: Utilities → involuntary signal passes
- Result: **Suggested** recurring charge, displayed as "Variable — $89–$275/mo"

#### Multi-amount merchants

A single merchant (e.g., Apple, Amazon, insurance provider) may have multiple recurring charges at different amounts. The amount sub-grouping step (pipeline stage 3) handles this by creating separate patterns per amount cluster.

### 1.5 Lifecycle Management

```
                    ┌──────────────┐
    Detection ─────►│  Suggested   │──── Confirm ────► Confirmed (tracking)
                    └──────┬───────┘
                           │
                    Dismiss / Not recurring
                           │
                           ▼
                    ┌──────────────┐
                    │  Dismissed   │ (never re-suggest same pattern)
                    └──────────────┘

    Confirmed ────► Active ────► Missed (see §1.10) ────► User resolves or auto-inactive
                      │                    │
                      │                    ├──► "I canceled" → Paused (await reactivation)
                      │                    ├──► "Missing from imports" → Snooze + link to import
                      │                    └──► Transaction found → Active
                      │
                      └──► User pauses tracking ──► Paused (no alerts)
                      │
                      └──► User deletes ──► Deleted
```

#### State machine fields (extend existing schema)

```sql
-- New columns on recurring_transactions
tracking_status TEXT DEFAULT 'suggested'
  CHECK (tracking_status IN ('suggested', 'confirmed', 'paused', 'dismissed', 'inactive'));
dismissed_at TIMESTAMPTZ;
dismissed_reason TEXT;  -- 'not_recurring', 'duplicate', 'user_removed'
amount_history JSONB DEFAULT '[]';  -- [{date, amount}] last 12 occurrences
date_anchor_type TEXT;  -- 'fixed_day', 'month_end', 'nth_weekday', 'interval', etc.
involuntary_score DECIMAL(3,2);  -- spend intent score (§1.8)
evidence_score DECIMAL(3,2);     -- temporal consistency score (§1.9)
charge_class TEXT;  -- fixed_bill, variable_bill, income_payroll, membership, discretionary
classification_signals JSONB DEFAULT '[]';  -- explainability: [{layer, name, value, detail}]
missed_streak INTEGER DEFAULT 0;
last_missed_date DATE;
status_reason TEXT;
```

#### User actions

| Action | Effect |
|--------|--------|
| **Confirm** | `tracking_status = 'confirmed'`, enable notifications |
| **Not recurring** | `tracking_status = 'dismissed'`, never re-suggest this merchant+amount+frequency combo |
| **Pause tracking** | `tracking_status = 'paused'`, no alerts, still visible |
| **Mark as canceled** | `tracking_status = 'paused'`, `status_reason = 'user_canceled'` — no missed alerts; re-surface if matching charge detected (§1.10) |
| **Missing from imports** | Snooze missed alert for this period; link to import; no repeat notification for same expected date |
| **Resume tracking** | Back to `confirmed` |
| **Edit** | User can override amount, frequency, next date, reminder settings |

#### Re-detection rules

- Never re-suggest a `dismissed` pattern
  - Fixed patterns: key = `merchant_group_id` + `amount_bucket` + `frequency`
  - Variable patterns: key = `merchant_group_id` + `frequency` (no amount_bucket — amounts vary too much)
- `inactive` patterns can be re-detected if new transactions match (subscription restarted)
- On re-detection of `inactive`, create a new `suggested` entry (don't auto-reactivate)

### 1.6 Notifications

Wire up all four existing notification types plus one new one:

| Notification | Trigger | Default |
|-------------|---------|---------|
| `recurring_transaction_upcoming` | N days before `next_expected_date` | On |
| `recurring_transaction_insufficient_funds` | Upcoming + account balance < expected amount | On |
| `recurring_transaction_amount_changed` | New match amount deviates beyond tolerance | On (change from current default off) |
| `recurring_transaction_missed` | Grace window passed, no matching transaction | On (re-enable) |
| `recurring_transaction_new` (new) | New pattern: `final_confidence` ≥ 0.70 AND n ≥ 2 | On |

**Amount change detection** (currently missing): Run on each new transaction import. When a transaction matches an active recurring pattern (by merchant + date window), compare amount to expected range. For fixed patterns, alert on deviation beyond tolerance. For variable patterns, alert only when outside IQR-based range (see §1.4). Update `amount_history` in both cases.

**Missed detection** (partially implemented): See **§1.10** for full stale-data handling, user-facing copy, and resolution actions. Summary: daily cron checks `next_expected_date + grace_window`, but factors in data freshness before incrementing `missed_streak` or sending alerts.

#### New-detection notifications (proactive review, not just a queue)

When detection finds new suggested patterns, notify the user through their enabled channels (email, in-app, push) so they can act without visiting the app first. The in-app Suggested tab remains the canonical list; notifications drive attention to it.

**Anti-spam / batching rules:**

| Rule | Value |
|------|-------|
| Max digest emails per user per day | **1** |
| Batch window | Collect all new suggestions for 24h (or until daily send time, e.g. 9am user-local) |
| In-app / push | One notification per batch: "We found 3 potential recurring charges" (not one per pattern) |
| Minimum confidence to notify | `final_confidence` ≥ 0.70 AND `occurrence_count` ≥ 2 |
| Re-notify for same pattern | Never (unless pattern was dismissed and re-detected months later) |

**Digest email layout** (single email, multiple items):

```
Subject: We found 3 potential recurring charges

We detected transactions that look like recurring bills or subscriptions.
Review them below — you can start tracking or dismiss each one.

┌─────────────────────────────────────────────────┐
│ City Electric          Variable · ~$89–$275/mo  │
│ Monthly · Last: $112 on Mar 12                  │
│ [Start Tracking]  [Not Recurring]  [View Details]│
├─────────────────────────────────────────────────┤
│ Netflix                $15.99/mo                │
│ Monthly · Last: $15.99 on Mar 8                 │
│ [Start Tracking]  [Not Recurring]  [View Details]│
└─────────────────────────────────────────────────┘

Manage notification preferences · Turn off these emails
```

**Email action links (signed, one-time tokens):**

Each action button uses a signed URL so the user can respond without logging in (if already authenticated via cookie, skip login):

| Action | URL pattern | Effect |
|--------|-------------|--------|
| Start Tracking | `/api/recurring-transactions/actions/confirm?token=...` | Sets `tracking_status = 'confirmed'`, redirects to detail page |
| Not Recurring | `/api/recurring-transactions/actions/dismiss?token=...` | Sets `tracking_status = 'dismissed'`, shows confirmation page |
| View Details | `/recurring-transactions/{id}?from=email` | Standard detail page |

Token properties:
- HMAC-signed with `user_id`, `recurring_transaction_id`, `action`, `expires_at` (7 days)
- One-time use (store used token hash to prevent replay)
- Invalid/expired token → friendly error page with link to in-app Suggested tab

**Required footer links on ALL recurring notification emails:**

Every recurring-transaction email template must include (existing `UnsubscribeURL` pattern in `notification-service.ts` should be extended):

1. **Manage notification preferences** → `/settings/notifications` (or deep-link to `#recurring_transaction_new`)
2. **Turn off these emails** → `/api/notifications/unsubscribe?token=...&type=recurring_transaction_new` (one-click disable email for this notification type only, no login required)

The one-click unsubscribe uses the same signed-token approach as action links. After unsubscribe, show a confirmation page: "You won't receive emails for new recurring charge detections. [Re-enable in settings]."

**In-app notification:** Links to `/recurring-transactions?tab=suggested`. If only one new pattern, link directly to its detail page.

**Push notification:** Short text + tap opens Suggested tab or detail page. No action buttons in push (defer to in-app/email for confirm/dismiss).

**Initial detection vs ongoing:** When user first runs "Scan for recurring" and 15 patterns are found, all 15 go to Suggested immediately but only **one digest email** is sent that day. Subsequent detections from imports batch into the next daily digest.

### 1.7 UI Design

#### Main page (`/recurring-transactions`)

Restructure into tabs:

1. **Active** — Confirmed, tracking, with upcoming dates
2. **Suggested** — "We found these — are they recurring?" with Confirm / Not recurring buttons
3. **Inactive** — Stopped or missed patterns, with option to resume or dismiss

Each row shows:
- Merchant name, expected amount (or range for variable), frequency
- Next expected date, last occurrence, status badge
- Confidence indicator (for suggested)
- Quick actions: confirm, dismiss, pause, edit

#### Detail page (`/recurring-transactions/[id]`)

- Amount history chart (line chart for variable, flat for fixed)
- List of matched transactions with dates and amounts
- Edit pattern settings (frequency, expected amount, reminders)
- "Why we think this is recurring" — explainability panel showing signals

#### Category report integration

Replace the "Coming Soon" card in `CategoryRecurringTransactions.tsx` with:
- List of recurring charges in this category (filtered by `category_id`)
- Category total from recurring vs total category budget
- Link to individual recurring detail pages

#### Dashboard widget (new)

- "Upcoming this week" — next 7 days of recurring charges with total
- "Recent changes" — amount changes or new detections

### 1.8 Merchant & Category Classification System

This section resolves the gaps identified during planning: no native merchant industry taxonomy, reliance on user categorization quality, confusion with `category_type`, and multi-intent merchants (Amazon, 7-Eleven, utilities categories with multiple bills).

#### 1.8.1 Terminology (critical distinctions)

| Term | What it is | Used for recurring detection? |
|------|------------|-------------------------------|
| **Budget category** | User-defined envelope (e.g. "Utilities", "Dining Out") | **Yes** — Layer 1, via split assignment |
| **`category_type`** | Budget behavior (`monthly_expense`, `accumulation`, `target_balance`) | **No** — unrelated to merchant intent |
| **Merchant group** | Normalized payee identity (`merchant_group_id`, `display_name`) | **Yes** — candidate grouping key |
| **Spend intent** | Our inferred classification: bill, subscription, payroll, discretionary | **Yes** — output of classifier |
| **MCC / industry code** | Standard merchant category code from card networks | **Not available** — not in our data model today |

**Design constraint:** We do not have MCC codes or a global merchant industry database. Classification must be built from **user data + text signals + behavioral stats + curated lists + user feedback** — not from a single authoritative merchant category field.

#### 1.8.2 Identified gaps and resolutions

| Gap | Risk | Resolution |
|-----|------|------------|
| No merchant industry taxonomy | Can't ask "what type of merchant is this?" directly | Introduce **spend intent taxonomy** (§1.8.3) inferred via 5-layer classifier |
| `category_type` is not merchant type | Misapplying `monthly_expense` as a detection signal | **Explicitly exclude** `category_type` from classifier; document in code |
| Budget category depends on user/AI accuracy | Netflix in "Shopping" loses bill signal | **Cross-layer voting** — merchant allowlist and text keywords override weak category signal |
| Multi-intent merchants (7-Eleven, Amazon, Apple) | Gas fill-ups vs club membership at same merchant | **Amount sub-grouping** (pipeline stage 3) + per-cluster classification |
| Multi-bill categories (Utilities) | Four bills, one envelope | **Separate recurring records per merchant**; category is a grouping dimension only |
| Miscategorized transactions | Single wrong split skews category signal | **Weighted plurality** across all splits in candidate; discount category layer when consensus is low |
| No learning from dismissals | Same false positive reappears | **Per-user feedback memory** (Layer 5) |
| Description not used today | Misses AUTOPAY, utility co. name signals | **Include `description` in detection query**; Layer 2 text matching |

#### 1.8.3 Spend intent taxonomy

Every candidate pattern is classified into one **charge class** before scoring:

| Charge class | Description | Examples | Detection path |
|--------------|-------------|----------|----------------|
| `fixed_bill` | Stable amount, regular schedule | Netflix, gym, mortgage | Fixed-amount pipeline |
| `variable_bill` | Variable amount, regular schedule | Electric, gas, water | Variable-amount pipeline (§1.4) |
| `income_payroll` | Regular income deposits | Paycheck, rental income | Fixed pipeline + income signals |
| `membership` | Retail membership fee | 7-Eleven club, Costco annual | Fixed pipeline + membership keywords/amounts |
| `discretionary` | Voluntary repeat spending | McDonald's, gas fill-ups | **Reject** — not tracked |
| `ambiguous` | Insufficient signal | Unknown merchant, mixed signals | Suggested only if score ≥ 0.70 |

Charge class is stored on the pattern (`charge_class TEXT`) for explainability and alert tuning.

#### 1.8.4 Five-layer classification pipeline

Layers run in order. Earlier layers can short-circuit (blocklist reject, allowlist bypass).

```
Candidate pattern (merchant + amount cluster + date cadence)
    │
    ▼
[Layer 5 check] User feedback memory
    │  Previously dismissed this pattern? → REJECT (hard)
    │  Previously confirmed similar? → BOOST +0.10
    ▼
[Layer 4] Curated merchant registry
    │  Global blocklist match? → REJECT (unless exception)
    │  Subscription allowlist match? → BYPASS blocklist, +0.20
    │  Membership exception match? → classify as `membership`
    ▼
[Layer 1] Budget category resolution
    │  Resolve category names from splits → bill-like vs discretionary score
    ▼
[Layer 2] Text signals (merchant name + descriptions)
    │  Keyword matching → bill-like vs discretionary score
    ▼
[Layer 3] Behavioral signals
    │  Frequency, weekends, amount CV, payment source, pricing patterns
    ▼
[Composite] Sum signals → involuntary_score (clamped 0–1)
    │  Apply charge class rules
    ▼
Decision: reject | suggested | high-confidence suggested
```

#### 1.8.5 Layer 1 — Budget category resolution

**Input:** All `transaction_splits` for transactions in the candidate, joined to `categories.name`.

**Step 1 — Resolve category per transaction:**
- Use non-system, non-buffer splits only (same filter as detection today)
- If multiple splits, use the split with the largest amount

**Step 2 — Build weighted category profile:**

```typescript
interface CategoryProfile {
  categories: Map<string, number>; // category_name → total weight
  consensus: number;               // 0–1, how much splits agree
}

function buildCategoryProfile(transactions: Transaction[]): CategoryProfile {
  const weights = new Map<string, number>();
  for (const txn of transactions) {
    const primarySplit = getPrimaryNonSystemSplit(txn);
    if (!primarySplit) continue;
    const name = primarySplit.categories.name;
    weights.set(name, (weights.get(name) || 0) + 1);
  }
  const maxWeight = Math.max(...weights.values(), 0);
  const consensus = maxWeight / transactions.length;
  return { categories: weights, consensus };
}
```

**Step 3 — Match category names against intent keyword lists:**

Category names are normalized: lowercase, trim, collapse whitespace.

| Intent bucket | Category name patterns (regex) | Base score |
|---------------|-------------------------------|------------|
| **Bill-like** | `/utilit|electric|power|energy|water|sewer|trash|garbage|gas bill|internet|broadband|cable|phone|mobile|wireless|insurance|mortgage|rent|hoa|dues|subscription|streaming|medical|dental|health/` | +0.15 |
| **Income-like** | `/income|paycheck|salary|wages|payroll|dividend|rental income|pension|social security/` | +0.15 (income path) |
| **Discretionary** | `/dining|restaurant|food|fast food|coffee|cafe|grocery|groceries|shopping|entertainment|fun money|hobby|clothing|gas|fuel|transport(?!ation bill)/` | −0.15 |
| **Neutral** | No match | 0 |

**Step 4 — Apply consensus discount:**

Category signal is unreliable when users miscategorize or split inconsistently:

```
category_score = base_score × consensus_multiplier

consensus_multiplier:
  consensus ≥ 0.80  → 1.0  (strong agreement)
  consensus 0.60–0.79 → 0.7
  consensus 0.40–0.59 → 0.4
  consensus < 0.40  → 0.0  (ignore category layer entirely)
```

**Fallback when category layer is zero:**
- Proceed with Layers 2–4 only
- Variable-bill path can still qualify via text + behavioral signals (e.g. "CITY ELECTRIC" merchant name, monthly cadence, ≤1 txn/month)

**What we explicitly do NOT use:**
- `categories.category_type` (`monthly_expense` / `accumulation` / `target_balance`) — this describes envelope behavior, not whether a merchant is a utility
- `categories.is_goal` — unrelated
- Single-transaction category when consensus < 0.40

#### 1.8.6 Layer 2 — Text signals (merchant + description)

**Input:** `merchant_groups.display_name` + all `transactions.description` values in the candidate.

Concatenate and normalize: uppercase, collapse whitespace, strip transaction IDs (reuse `normalizeMerchantName()` from `merchant-grouping.ts`).

**Bill-like description keywords** (+0.25, first match wins, no stacking):

```
AUTOPAY, AUTO PAY, AUTO-PAY, RECURRING, SUBSCRIPTION, MEMBERSHIP,
MONTHLY PAYMENT, EFT PAYMENT, BILL PAY, BILLPAY, ACH DEBIT,
DIRECT DEBIT, PREAUTHORIZED, PRE-AUTHORIZED, UTILITY, ELECTRIC,
POWER, WATER, SEWER, INSURANCE, MORTGAGE, LOAN PAYMENT
```

**Discretionary merchant keywords** (−0.20):

```
MCDONALD, BURGER KING, WENDY, TACO BELL, CHICK-FIL-A, CHIPOTLE,
STARBUCKS, DUNKIN, SUBWAY, PANERA, DOMINO, PIZZA HUT,
WALMART, TARGET, COSTCO WHSE, KROGER, PUBLIX, ALDI,
SHELL OIL, EXXON, CHEVRON, BP#, MARATHON, SPEEDWAY, WAWA, SHEETZ,
AMAZON MKTPL, AMZN MKTP, AMAZON.COM*
```

**Subscription merchant keywords** (+0.20, also triggers allowlist check in Layer 4):

```
NETFLIX, SPOTIFY, HULU, DISNEY+, HBO, MAX, APPLE.COM/BILL,
ADOBE, MICROSOFT*SUBSCRIPTION, GOOGLE *YOUTUBE, GOOGLE *STORAGE,
DROPBOX, CHATGPT, OPENAI, GITHUB, PATREON
```

**Membership exception keywords** (classify as `membership`, not discretionary):

```
7-ELEVEN *MEMBERSHIP, COSTCO *MEMBERSHIP, MEMBERSHIP FEE, ANNUAL MEMBER
```

**Income keywords** (+0.25 for income transaction_type):

```
PAYROLL, DIRECT DEP, DIRECT DEPOSIT, SALARY, WAGES, ADP, PAYCHEX,
GUSTO, EMPLOYER
```

**Amazon / Apple special handling:**
- `AMAZON` alone is not enough to classify — almost always discretionary
- `AMAZON PRIME`, `AMZN PRIME`, `AMAZON DIGITAL` → subscription keyword path
- `APPLE.COM/BILL` with stable round amount → subscription path
- General `AMAZON MKTPL` with variable amounts → discretionary unless amount cluster is fixed monthly < $20

#### 1.8.7 Layer 3 — Behavioral signals

These require no category data and are the strongest discriminators for retail false positives. **Most behavioral signals require minimum occurrences** (§1.9) — they are not computed (or contribute 0) when n is too low.

| Signal | Condition | Score | Min n | Waived when |
|--------|-----------|-------|-------------|
| **Amount stability** | CV < 0.05 | +0.25 | 3 | — |
| | CV 0.05–0.15 | +0.10 | 3 | — |
| | CV > 0.30 | −0.20 | 3 | `variable_bill` class |
| **Txn frequency** | > 2 txns/month at merchant (same amount cluster) | −0.15 | 2 | — |
| | > 4 txns/month | −0.25 | 2 | — |
| | > 8 txns/month | −0.35 | 2 | — |
| **Weekend concentration** | > 60% of txns on Sat/Sun (weekly/biweekly patterns) | −0.20 | 4 | monthly+ |
| **Payment source consistency** | Same `account_id` or `credit_card_id` in 90%+ txns | +0.10 | 2 | — |
| **Subscription pricing** | Amount ends in `.99` or is round dollar (±$0.01) | +0.10 | 1 | amounts > $500 |
| **Monthly utility pattern** | ≤ 1.2 txns/month avg + monthly cadence + CV > 0.15 | +0.20 | 4 | — |
| **Income regularity** | `transaction_type = income` + biweekly/monthly cadence | +0.25 | 2 | — |

**Frequency is computed per amount cluster**, not per merchant group — this is what separates 7-Eleven gas (many fill-ups) from 7-Eleven club ($9.99/month).

#### 1.8.8 Layer 4 — Curated merchant registry

Static JSON file: `src/lib/recurring-transactions/merchant-registry.json`

Maintained by us, versioned with the app, no DB migration required for updates.

```typescript
interface MerchantRegistry {
  subscription_allowlist: RegistryEntry[];   // bypass blocklist
  discretionary_blocklist: RegistryEntry[];  // hard reject
  membership_exceptions: RegistryEntry[];    // retail but membership
  variable_bill_hints: RegistryEntry[];      // boost variable-bill path
}

interface RegistryEntry {
  pattern: string;       // regex string, matched against normalized merchant+description
  label: string;         // human-readable, for explainability
  charge_class?: string; // optional override
}
```

**Blocklist (hard reject)** unless subscription allowlist or membership exception matches:

| Merchant pattern | Reason |
|-----------------|--------|
| Fast food chains (McDonald's, Wendy's, etc.) | Voluntary dining |
| Coffee shops (Starbucks, Dunkin) | Voluntary |
| Gas station brands (Shell, Exxon, etc.) | Voluntary fill-ups |
| Grocery chains (Kroger, Publix, etc.) | Voluntary shopping |
| `AMAZON MKTPL`, `AMZN MKTP` | Voluntary shopping (Prime is separate) |
| Big-box retail (Target, Walmart) | Voluntary shopping |

**Blocklist escape hatch** (still detected despite blocklist):
- Fixed amount (CV < 0.05) AND monthly+ cadence AND amount < $50
- Matches subscription allowlist
- Matches membership exception
- User previously confirmed a pattern for this merchant+amount

**Subscription allowlist** (200+ entries at launch, grow over time):
- Streaming: Netflix, Spotify, Hulu, Disney+, HBO Max, Apple TV+, Peacock, Paramount+
- Software: Adobe, Microsoft 365, Google One, Dropbox, ChatGPT, GitHub, JetBrains
- Fitness: Peloton, ClassPass, Planet Fitness (if monthly descriptor)
- News/media: NYT, WSJ, Substack
- Telecom: T-Mobile, Verizon, AT&T (when monthly fixed descriptors)

**Variable bill hints** (boost variable-bill classification, not auto-confirm):
- Patterns: `ELECTRIC`, `POWER`, `ENERGY`, `WATER`, `SEWER`, `GAS COMPANY`, `UTILITY`, `COMCAST`, `SPECTRUM`

**Registry maintenance:**
- Add entries when users report false positives/negatives
- Admin tool: `/admin/recurring-merchant-registry` (phase 6)
- Track registry version in detection logs for debugging

#### 1.8.9 Layer 5 — User feedback memory

Per-user, per-budget-account learning from confirm/dismiss actions.

**Table: `recurring_user_feedback`**

```sql
CREATE TABLE recurring_user_feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  budget_account_id BIGINT NOT NULL,
  merchant_group_id BIGINT NOT NULL,
  amount_bucket INTEGER,          -- NULL for variable-bill dismissals
  frequency TEXT,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('confirmed', 'dismissed')),
  charge_class TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, budget_account_id, merchant_group_id, amount_bucket, frequency, feedback_type)
);
```

**Rules:**
| Prior feedback | Effect on future detection |
|----------------|---------------------------|
| `dismissed` for merchant+amount+frequency | **Hard reject** — never re-suggest |
| `dismissed` for merchant (variable, no amount_bucket) | Reject all variable patterns at that merchant |
| `confirmed` for merchant+amount+frequency | **+0.10 boost** to involuntary score |
| 3+ dismissals at same merchant (any amount) | Block entire merchant group for this user |

Dismissals are more authoritative than detection signals — user intent trumps algorithm.

**Re-surfacing dismissed patterns:**
- Only if user explicitly runs "Scan again including dismissed" (advanced option)
- Or if > 12 months have passed AND pattern has 3+ new occurrences (subscription may have restarted)

#### 1.8.10 Multi-intent merchant edge cases

| Merchant | Voluntary pattern | Involuntary pattern | How we separate |
|----------|-------------------|---------------------|-----------------|
| **7-Eleven** | Gas fill-ups $30–$60, 4+/month | Club membership $9.99 or $99/yr | Amount sub-grouping; membership amount stable + monthly/annual |
| **Amazon** | Marketplace purchases, variable | Prime $14.99/mo, Kindle Unlimited, etc. | Amount cluster at ~$15; description `PRIME` keyword; blocklist escape |
| **Apple** | App Store purchases, variable | iCloud $2.99, Music $10.99, TV+ $9.99 | Amount sub-grouping creates separate clusters per subscription tier |
| **Costco** | Shopping trips $100–$500 | Costco membership $60/yr or $120/yr | Annual cadence + membership keyword + stable amount |
| **Utilities category** | (none — all bills) | Electric, gas, water, trash each separate | One recurring record per `merchant_group_id`; all linked to same budget category |
| **PayPal** | P2P transfers, variable | Netflix via PayPal, stable descriptor | Amount sub-grouping; description contains underlying merchant |

**PayPal / Venmo / Cash App rule:** Group by full description substring, not just `merchant_group_id`, when the merchant group is a payment processor. Detect `"PAYPAL *NETFLIX"` as Netflix, not PayPal.

Implementation: if `merchant_group.display_name` matches `/PAYPAL|VENMO|CASH APP|SQUARE|ZELLE/i`, sub-group by normalized description before amount clustering.

#### 1.8.11 Composite involuntary score — formal definition

```typescript
interface ClassificationResult {
  involuntaryScore: number;     // 0.0 – 1.0 — spend intent (§1.8)
  evidenceScore: number;        // 0.0 – 1.0 — temporal consistency (§1.9)
  finalConfidence: number;    // 0.0 – 1.0 — blended score for tiering
  chargeClass: ChargeClass;
  detectionPath: DetectionPath;
  signals: SignalContribution[]; // for explainability UI
  rejected: boolean;
  rejectReason?: string;
}

function classifyCandidate(candidate: CandidatePattern, userFeedback: Feedback[]): ClassificationResult {
  const signals: SignalContribution[] = [];

  // Layer 5 — hard stops
  if (hasDismissedFeedback(userFeedback, candidate)) {
    return { involuntaryScore: 0, chargeClass: 'discretionary', signals, rejected: true, rejectReason: 'Previously dismissed by user' };
  }

  // Layer 4 — blocklist / allowlist
  const registry = matchMerchantRegistry(candidate);
  if (registry.blocked && !registry.allowlisted && !registry.membershipException) {
    if (!isBlocklistEscape(candidate)) {
      return { involuntaryScore: 0, chargeClass: 'discretionary', signals, rejected: true, rejectReason: `Blocklisted: ${registry.label}` };
    }
  }

  let score = 0.50; // neutral prior — assume neither voluntary nor involuntary until evidence

  // Layer 4 boosts
  if (registry.allowlisted) { score += 0.20; signals.push({ layer: 4, name: 'subscription_allowlist', value: +0.20 }); }
  if (registry.variableBillHint) { score += 0.10; signals.push({ layer: 4, name: 'variable_bill_hint', value: +0.10 }); }

  // Layer 1 — category
  const cat = resolveCategoryProfile(candidate);
  const catScore = scoreCategoryIntent(cat) * cat.consensusMultiplier;
  if (catScore !== 0) { score += catScore; signals.push({ layer: 1, name: 'budget_category', value: catScore, detail: cat.dominantCategory }); }

  // Layer 2 — text
  const textScore = scoreTextSignals(candidate);
  score += textScore.total;
  signals.push(...textScore.contributions);

  // Layer 3 — behavioral
  const behavScore = scoreBehavioralSignals(candidate);
  score += behavScore.total;
  signals.push(...behavScore.contributions);

  // Layer 5 — confirm boost
  if (hasConfirmedFeedback(userFeedback, candidate)) {
    score += 0.10;
    signals.push({ layer: 5, name: 'previously_confirmed', value: +0.10 });
  }

  // Clamp
  score = Math.max(0, Math.min(1, score));

  // Determine charge class
  const chargeClass = inferChargeClass(candidate, registry, cat, score);

  // Occurrence gate (§1.9.2)
  const minN = getMinimumOccurrences({ ...candidate, chargeClass, involuntaryScore: score });
  if (candidate.occurrenceCount < minN) {
    return { involuntaryScore: score, evidenceScore: 0, finalConfidence: 0, chargeClass, detectionPath: 'standard', signals, rejected: true, rejectReason: `Requires ${minN} occurrences, has ${candidate.occurrenceCount}` };
  }

  const evidenceScore = computeEvidenceScore(candidate);
  const finalConfidence = computeFinalConfidence(score, evidenceScore, candidate);
  const detectionPath = inferDetectionPath(candidate, chargeClass);

  return { involuntaryScore: score, evidenceScore, finalConfidence, chargeClass, detectionPath, signals, rejected: false };
}
```

**Score caps by layer** (prevent any single layer from dominating):

| Layer | Max positive contribution | Max negative contribution |
|-------|--------------------------|--------------------------|
| Layer 1 (category) | +0.15 | −0.15 |
| Layer 2 (text) | +0.25 | −0.20 |
| Layer 3 (behavioral) | +0.35 | −0.35 |
| Layer 4 (registry) | +0.20 (boost only; blocklist is a hard reject) | n/a |
| Layer 5 (feedback) | +0.10 | hard reject |

#### 1.8.12 Decision matrix

> **Superseded by §1.9.5** which adds occurrence gates and `final_confidence`. Summary:

| Gate | Rule |
|------|------|
| Occurrence | `n ≥ getMinimumOccurrences()` per charge class |
| Confidence | `final_confidence = blend(involuntary_score, evidence_score)` |
| Variable bills | min n=4, suggest at `final_confidence ≥ 0.45` |
| Fixed bills | min n=3 (or n=2/1 per §1.9.2), suggest at `final_confidence ≥ 0.70` |
| Digest email | `final_confidence ≥ 0.70` AND `n ≥ 2` |
| Single explicit-text | In-app Suggested only; no digest; no upcoming alerts |

#### 1.8.13 Explainability (required for trust)

Detail page and digest email include "Why we think this is recurring":

```
City Electric — Suggested (confidence: 0.81)
  ✓ 6 occurrences over 6 months (evidence: 0.94)
  ✓ Monthly cadence detected (median 30 days)
  ✓ Consistent billing date (~12th of month)
  ✓ Budget category "Utilities" (+0.15)
  ✓ Merchant name contains "ELECTRIC" (+0.10)
  ✓ Variable bill pattern (amounts range $89–$275)
  ✓ ≤ 1 transaction per month
  ○ Amount varies significantly (not penalized for utilities)
```

Store `classification_signals JSONB` on `recurring_transactions` at detection time.

#### 1.8.14 Detection query changes

Current detection does not fetch enough data. Updated query must include:

```sql
SELECT
  t.id, t.date, t.description, t.total_amount, t.transaction_type,
  t.merchant_group_id, t.account_id, t.credit_card_id,
  mg.display_name AS merchant_name,
  ts.category_id, ts.amount AS split_amount,
  c.name AS category_name, c.is_system, c.is_buffer
FROM transactions t
JOIN merchant_groups mg ON ...
JOIN transaction_splits ts ON ...
JOIN categories c ON ...
WHERE ...
```

**Do not select `c.category_type`** — it is intentionally excluded.

#### 1.8.15 Implementation files

| File | Purpose |
|------|---------|
| `src/lib/recurring-transactions/classification/types.ts` | `ChargeClass`, `SignalContribution`, `ClassificationResult` |
| `src/lib/recurring-transactions/classification/category-profile.ts` | Layer 1 |
| `src/lib/recurring-transactions/classification/text-signals.ts` | Layer 2 |
| `src/lib/recurring-transactions/classification/behavioral-signals.ts` | Layer 3 |
| `src/lib/recurring-transactions/classification/merchant-registry.ts` | Layer 4 loader + matcher |
| `src/lib/recurring-transactions/classification/user-feedback.ts` | Layer 5 |
| `src/lib/recurring-transactions/classification/classify-candidate.ts` | Orchestrator |
| `src/lib/recurring-transactions/merchant-registry.json` | Curated lists |
| `src/lib/recurring-transactions/classification/__tests__/` | Per-layer + integration tests |

#### 1.8.16 Test fixtures for classification

| Fixture | Expected class | Expected result |
|---------|---------------|-----------------|
| City Electric $98/$275/$112 | `variable_bill` | Suggested |
| Netflix $15.99 monthly | `fixed_bill` | Suggested |
| McDonald's $10 weekly | `discretionary` | Reject (blocklist + frequency) |
| 7-Eleven gas $45 6×/month | `discretionary` | Reject (frequency) |
| 7-Eleven membership $9.99 monthly | `membership` | Suggested |
| Amazon Prime $14.99 monthly | `fixed_bill` | Suggested (allowlist/keyword) |
| Amazon purchases variable | `discretionary` | Reject |
| Apple iCloud $2.99 + App Store variable | two patterns | Only iCloud suggested |
| PayPal *NETFLIX $15.99 | `fixed_bill` | Suggested (description subgroup) |
| Paycheck ADP biweekly | `income_payroll` | Suggested |
| Netflix miscategorized as "Shopping" | `fixed_bill` | Suggested (allowlist overrides weak category) |
| Utility miscategorized as "Other" | `variable_bill` | Suggested (text + behavioral only) |
| Netflix Subscription (1 txn only) | `fixed_bill` | Suggested low-confidence (explicit-text path) |
| City Electric (2 txns only) | `variable_bill` | **Reject** — below 4-occurrence minimum |
| McDonald's (3 txns weekly) | `discretionary` | **Reject** — weekly discretionary needs 6+ |

### 1.9 Occurrence Count & Evidence Scoring

Occurrence count is not just a filter — it is a core input to classification confidence. Many signals are **impossible or unreliable** with too few data points:

| Signal | Min occurrences needed | Why |
|--------|------------------------|-----|
| Cadence / frequency | 2 (weak), 3+ (reliable) | Intervals = n−1; one transaction has zero intervals |
| Date anchor (day-of-month) | 3 (weak), 4+ (reliable) | Need multiple months to confirm billing date |
| Amount CV / stability | 3 | Two amounts can look "stable" by chance |
| Variable-bill IQR range | 4 | Need quartiles; 2–3 points produce meaningless ranges |
| Weekend concentration | 4+ | Meaningless for monthly patterns |
| Sustained trend detection | 3 consecutive months | Requires 3+ monthly occurrences |
| Behavioral frequency (txns/month) | 2+ months of data | Single month is ambiguous |

**Principle:** Require the **minimum evidence necessary** for the charge class. Strong explicit text can substitute for temporal evidence; weak or ambiguous patterns require more occurrences.

#### 1.9.1 Detection paths by evidence level

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     OCCURRENCE COUNT (n)                                  │
├─────────┬───────────────────────────────────────────────────────────────┤
│ n = 1   │ EXPLICIT-TEXT PATH ONLY                                         │
│         │ "Netflix Subscription", "AUTOPAY MORTGAGE", allowlist + keyword  │
│         │ → Suggested (low confidence); no cadence; no upcoming alerts     │
├─────────┼───────────────────────────────────────────────────────────────┤
│ n = 2   │ STRONG-SIGNAL PATH                                            │
│         │ Allowlist + stable amount + 1 interval matching monthly/yearly │
│         │ OR payroll keyword + ~14-day interval                           │
│         │ OR membership keyword + stable amount                           │
│         │ → Suggested (moderate confidence); frequency inferred from 1 gap │
├─────────┼───────────────────────────────────────────────────────────────┤
│ n = 3   │ STANDARD PATH (default minimum)                                 │
│         │ Fixed bills, income payroll, memberships with cadence validation │
│         │ → Suggested if final_confidence ≥ 0.70                         │
├─────────┼───────────────────────────────────────────────────────────────┤
│ n = 4–5 │ HIGH-VARIANCE / AMBIGUOUS PATH                                │
│         │ Variable utilities, miscategorized bills, weak text signals      │
│         │ → Required minimum for variable_bill class                       │
├─────────┼───────────────────────────────────────────────────────────────┤
│ n ≥ 6   │ HIGH-FREQUENCY / WEEKLY PATH                                  │
│         │ Weekly/biweekly patterns; discretionary-like merchants          │
│         │ Required to even consider weekly at non-allowlisted merchants   │
└─────────┴───────────────────────────────────────────────────────────────┘
```

#### 1.9.2 Minimum occurrence matrix (hard gates)

Before computing `final_confidence`, check `n ≥ getMinimumOccurrences(candidate)`. If not met → **Reject** (hidden), regardless of involuntary score.

| Charge class / pattern | Minimum n | Conditions for reduced minimum |
|------------------------|-----------|--------------------------------|
| **Explicit subscription text** | **1** | Description contains `SUBSCRIPTION`, `RECURRING`, `AUTOPAY`, or `MEMBERSHIP` AND (allowlist match OR bill-like keyword) |
| **Allowlisted fixed subscription** | **2** | Allowlist + amount CV < 0.05 + single interval matches expected frequency (28–35, 12–16, or 360–370 days) |
| **Income payroll** | **2** | `PAYROLL`/`DIRECT DEP` keyword + interval 12–16 or 28–35 days |
| **Membership (retail)** | **2** | Membership keyword + stable amount + interval ≥ 28 days |
| **Fixed bill (default)** | **3** | Standard subscriptions, insurance, telecom |
| **Variable bill (utilities)** | **4** | No exceptions — date anchor and IQR require 4+ months |
| **Variable bill (high confidence)** | **6** | Preferred for surfacing in digest notifications |
| **Weekly pattern** | **6** | Non-allowlisted merchants; 6+ reduces false positives (McDonald's) |
| **Biweekly pattern** | **4** | Paycheck-style; 4 occurrences = 3 intervals |
| **Quarterly** | **3** | 3 occurrences = 2 intervals (~180 days each) |
| **Yearly** | **2** | 2 occurrences may be all we see in 15-month lookback |
| **Ambiguous / no text signals** | **4** | Weak involuntary score (< 0.65) without strong text or category |
| **Discretionary (any)** | **∞** | Never tracked — blocklist or voluntary classification |

```typescript
function getMinimumOccurrences(candidate: CandidatePattern): number {
  if (candidate.chargeClass === 'discretionary') return Infinity;

  if (candidate.hasExplicitSubscriptionText && (candidate.registry.allowlisted || candidate.hasBillKeyword)) {
    return 1;
  }

  switch (candidate.chargeClass) {
    case 'variable_bill': return 4;
    case 'income_payroll': return candidate.hasPayrollKeyword ? 2 : 3;
    case 'membership': return candidate.hasMembershipKeyword ? 2 : 3;
    case 'fixed_bill':
      if (candidate.registry.allowlisted && candidate.amountCV < 0.05) return 2;
      if (candidate.involuntaryScore < 0.65 && !candidate.hasStrongTextSignal) return 4;
      if (candidate.frequency === 'weekly') return 6;
      if (candidate.frequency === 'biweekly') return 4;
      if (candidate.frequency === 'yearly') return 2;
      if (candidate.frequency === 'quarterly') return 3;
      return 3;
    default: return 3;
  }
}
```

**Explicit-text path (n = 1) limitations:**
- `frequency` = `unknown` or inferred from description keyword (`MONTHLY` → monthly guess)
- `next_expected_date` = **null** until second occurrence confirms cadence
- `confidence_tier` = `low` — shown in Suggested tab but **excluded from digest email** until n ≥ 2
- Upcoming/missed notifications **disabled** until user confirms AND n ≥ 2
- UI label: *"Probable subscription — we'll refine the schedule after your next charge"*

#### 1.9.3 Evidence score (consistency multiplier)

`evidence_score` (0.0–1.0) measures how much **temporal and statistical evidence** supports the pattern, independent of spend intent.

**Components:**

| Component | Weight | Formula |
|-----------|--------|---------|
| **Occurrence factor** | 40% | Step function on n (see below) |
| **Cadence quality** | 30% | `1 − min(intervalMAD / medianInterval, 1)` — requires n ≥ 2 |
| **Date anchor quality** | 20% | `1 − min(dayOfMonthMAD / 7, 1)` for monthly; weekday consistency for weekly |
| **Amount consistency** | 10% | `1 − min(amountCV / 0.30, 1)` for fixed; fixed at 0.5 for variable_bill (neutral) |

**Occurrence factor (step function):**

| n | Occurrence factor | Notes |
|---|-------------------|-------|
| 1 | 0.50 | Only valid on explicit-text path |
| 2 | 0.65 | One interval — fragile |
| 3 | 0.80 | Minimum for most fixed bills |
| 4 | 0.90 | Minimum for variable bills |
| 5 | 0.95 | |
| ≥ 6 | 1.00 | Full temporal evidence |

```typescript
function computeEvidenceScore(candidate: CandidatePattern): number {
  const n = candidate.occurrenceCount;

  const occurrenceFactor = n >= 6 ? 1.0 : n === 5 ? 0.95 : n === 4 ? 0.90
    : n === 3 ? 0.80 : n === 2 ? 0.65 : n === 1 ? 0.50 : 0;

  let cadenceQuality = 0.5; // neutral when n < 2
  if (n >= 2 && candidate.medianInterval > 0) {
    cadenceQuality = 1 - Math.min(candidate.intervalMAD / candidate.medianInterval, 1);
  }

  let dateAnchorQuality = 0.5;
  if (n >= 3 && candidate.frequency === 'monthly') {
    dateAnchorQuality = 1 - Math.min(candidate.dayOfMonthMAD / 7, 1);
  } else if (n >= 4 && (candidate.frequency === 'weekly' || candidate.frequency === 'biweekly')) {
    dateAnchorQuality = candidate.weekdayConsistency; // 0–1
  }

  let amountConsistency = 0.5;
  if (candidate.chargeClass === 'variable_bill') {
    amountConsistency = 0.5; // neutral — variance expected
  } else if (n >= 3) {
    amountConsistency = 1 - Math.min(candidate.amountCV / 0.30, 1);
  }

  return (
    occurrenceFactor * 0.40 +
    cadenceQuality * 0.30 +
    dateAnchorQuality * 0.20 +
    amountConsistency * 0.10
  );
}
```

**More occurrences improve scoring in two ways:**
1. **Gate:** Higher n unlocks detection paths with weaker text/category signals
2. **Multiplier:** Higher n → higher `occurrence_factor` → higher `evidence_score` → higher `final_confidence`

#### 1.9.4 Final confidence formula

```typescript
function computeFinalConfidence(
  involuntaryScore: number,
  evidenceScore: number,
  candidate: CandidatePattern
): number {
  // Explicit-text single occurrence: cap confidence — intent is clear, schedule is not
  if (candidate.occurrenceCount === 1 && candidate.hasExplicitSubscriptionText) {
    return Math.min(involuntaryScore * 0.85, 0.72);
  }

  // Blend: spend intent + temporal evidence
  const blended = involuntaryScore * 0.55 + evidenceScore * 0.45;

  // Bonus for strong combined evidence (both high)
  if (involuntaryScore >= 0.75 && evidenceScore >= 0.85) {
    return Math.min(blended + 0.05, 1.0);
  }

  return blended;
}
```

| Field | Stored on pattern | Used for |
|-------|-------------------|----------|
| `involuntary_score` | Yes | Spend intent (§1.8) |
| `evidence_score` | Yes | Temporal/consistency strength |
| `confidence_score` | Yes | `final_confidence` — drives tier and notifications |
| `occurrence_count` | Yes (existing) | Minimum gate + evidence score |
| `detection_path` | Yes (new) | `explicit_text`, `strong_signal`, `standard`, `high_variance` |

#### 1.9.5 Updated decision matrix (uses final_confidence + occurrence gate)

| final_confidence | n | charge_class | Result |
|------------------|---|--------------|--------|
| any | < minimum for class | any | **Reject** (insufficient evidence) |
| any | any | dismissed / blocklisted | **Reject** |
| < 0.45 | any | any | **Hidden** |
| 0.45–0.69 | ≥ min | `variable_bill` | **Suggested** (utilities path) |
| 0.45–0.69 | ≥ min | other | **Hidden** |
| 0.70–0.84 | ≥ min | non-discretionary | **Suggested** + digest notification (if n ≥ 2) |
| ≥ 0.85 | ≥ min | non-discretionary | **Suggested** (high-confidence badge) + digest notification (if n ≥ 2) |
| 0.55–0.72 | 1 | explicit-text | **Suggested** (low-confidence, in-app only — no digest email) |

**Digest notification rule:** Include in daily digest only when `final_confidence ≥ 0.70` **AND** `occurrence_count ≥ 2`. Single-occurrence patterns appear in the Suggested tab only.

#### 1.9.6 Ongoing: occurrences increase confidence over time

When a new transaction matches a suggested or confirmed pattern:

1. Increment `occurrence_count`
2. Recompute `evidence_score` and `confidence_score`
3. If pattern was `explicit_text` path with n=1 and second txn confirms cadence:
   - Set `frequency` and `next_expected_date`
   - Upgrade `detection_path` to `strong_signal` or `standard`
   - Enable upcoming notifications (if user confirmed)
4. If `confidence_score` crosses 0.70 and pattern is still `suggested`, include in next digest

This means **classification is not frozen at detection time** — patterns get more accurate as the user accumulates matching transactions.

#### 1.9.7 Explainability additions

```
Netflix — Suggested (confidence: 0.68, low)
  ✓ Explicit subscription text in description (+0.25)
  ✓ Subscription allowlist match (+0.20)
  ○ Only 1 occurrence — schedule not yet confirmed
  ○ Evidence score: 0.50 (waiting for next charge)
  → "Probable subscription — we'll refine after your next charge"

City Electric — Suggested (confidence: 0.81)
  ✓ 6 occurrences over 6 months
  ✓ Monthly cadence (median 30 days, MAD 1.2 days)
  ✓ Date anchor: ~12th of month (MAD 2.1 days)
  ✓ Evidence score: 0.94
  ✓ Variable bill pattern ($89–$275)
```

#### 1.9.8 Implementation

| File | Purpose |
|------|---------|
| `src/lib/recurring-transactions/classification/evidence-scoring.ts` | `getMinimumOccurrences`, `computeEvidenceScore`, `computeFinalConfidence` |
| `src/lib/recurring-transactions/classification/__tests__/evidence-scoring.test.ts` | Per-path occurrence gate tests |

Add to schema:
```sql
evidence_score DECIMAL(3,2),
detection_path TEXT CHECK (detection_path IN (
  'explicit_text', 'strong_signal', 'standard', 'high_variance'
)),
```

### 1.10 Stale Data Awareness & Missed-Charge Resolution

Most users do not have live bank feeds. Transaction data is typically entered manually or imported from CSV/statements on an irregular schedule. **A "missed" recurring charge often means missing data, not a canceled subscription.** The system must account for this before alarming users or marking patterns inactive.

#### 1.10.1 The stale data problem

| Reality | Impact on recurring detection |
|---------|------------------------------|
| User imports every 2–4 weeks | Recent expected charges may not exist in DB yet |
| User imports every few months | Multiple "missed" periods are likely import gaps |
| User enters transactions manually | Sporadic coverage; long gaps are normal |
| No automatic sync for most users | `last_occurrence_date` reflects import habits, not real-world billing |

**Design principle:** Treat missed charges as **ambiguous until resolved** — either the data catches up (import), the user confirms cancellation, or the account data is demonstrably fresh.

#### 1.10.2 Data freshness signals

Compute at notification time and store on the pattern:

```typescript
interface DataFreshnessContext {
  accountLastTransactionDate: string;   // max transaction date in budget_account
  paymentSourceLastDate: string | null; // max date for pattern's account/card
  daysSinceLastAccountActivity: number;
  isDataStale: boolean;                 // true if activity is older than threshold
  staleReason: 'account_inactive' | 'payment_source_inactive' | 'fresh';
}
```

**Stale thresholds:**

| Check | Stale if |
|-------|----------|
| Account-wide | `accountLastTransactionDate` is > 14 days before `expected_date` |
| Payment source | Pattern's `account_id`/`credit_card_id` has no transactions in the 30 days before `expected_date` |
| Import gap | No import activity (`imported_transactions.imported_at`) in the 21 days before alert |

When `isDataStale = true`:
- Use **tentative** missed messaging (import-first tone)
- **Do not increment** `missed_streak` toward auto-inactive
- **Do not** set `tracking_status = 'inactive'` automatically
- Set `missed_confidence = 'low'` on the missed occurrence record

When `isDataStale = false` (data is reasonably current):
- Use **direct** missed messaging (cancel vs import choice)
- Increment `missed_streak` normally
- Auto-inactive at `missed_streak >= 2` only if user doesn't respond within 14 days

#### 1.10.3 Missed occurrence tracking

Each expected charge period gets its own record — prevents re-notifying for the same miss and tracks user resolution.

```sql
CREATE TABLE recurring_missed_occurrences (
  id BIGSERIAL PRIMARY KEY,
  recurring_transaction_id BIGINT NOT NULL REFERENCES recurring_transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  budget_account_id BIGINT NOT NULL,
  expected_date DATE NOT NULL,
  grace_end_date DATE NOT NULL,
  missed_confidence TEXT NOT NULL DEFAULT 'high'
    CHECK (missed_confidence IN ('low', 'high')),  -- low = stale data suspected
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'snoozed_import', 'user_canceled', 'found', 'auto_resolved', 'dismissed')),
  user_response TEXT,           -- 'canceled', 'pending_import', 'snooze', 'found_on_rescan'
  snoozed_until DATE,
  notified_at TIMESTAMPTZ,
  notified_count INTEGER DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recurring_transaction_id, expected_date)
);
```

**Notification deduplication:** Never send `recurring_transaction_missed` for an `(recurring_transaction_id, expected_date)` that already has a record with `status IN ('snoozed_import', 'user_canceled', 'found', 'dismissed')` unless `snoozed_until` has passed.

**Max notifications per missed occurrence:** 2 total — initial alert + one reminder after 7 days if still unresolved and not snoozed.

#### 1.10.4 Notification copy (stale vs fresh)

**Stale data variant** (`missed_confidence = 'low'`):

> **Did your Netflix charge happen? We can't tell yet.**
>
> We expected a $15.99 charge from Netflix around March 8, but we don't see it. Your most recent transaction in Budget App is from **February 12** — if you haven't imported since then, this charge may already be in your bank statement waiting to be added.
>
> Import your latest transactions for more accurate tracking, or let us know if you've canceled this subscription.

**Fresh data variant** (`missed_confidence = 'high'`):

> **Missing expected charge: Netflix ($15.99)**
>
> We expected a $15.99 charge from Netflix around March 8 but didn't find a matching transaction. Your transaction history looks up to date through **March 10**.
>
> Did you cancel this subscription, or could this charge be missing from your records?

**In-app notification:** Same copy, shorter. Badge on recurring detail page when an open missed occurrence exists.

#### 1.10.5 Resolution actions (email, in-app, push → detail page)

Every missed-charge notification includes **three primary actions** plus settings links (§1.6 footer).

| Action | Label | Effect |
|--------|-------|--------|
| **Import transactions** | "Import latest transactions" | Navigate to `/import?from=recurring_miss&recurringId={id}&expectedDate={date}` — import page shows contextual banner: *"Looking for your Netflix charge from ~March 8? Import your latest statement, then we'll check again automatically."* |
| **I canceled this** | "I canceled this subscription" | `tracking_status = 'paused'`, `status_reason = 'user_canceled'`; missed occurrence → `user_canceled`; stop missed/upcoming alerts; pattern moves to Inactive tab with label "Canceled by you" |
| **Check again** | "I've imported it — check again" | Trigger immediate re-match for this pattern; if transaction found → `found`, reset `missed_streak`, advance `next_expected_date`; if not found → show result: *"Still no match — it may not have posted yet, or the subscription may have ended."* |

**Email signed-token URLs** (same pattern as §1.6):

| Action | URL |
|--------|-----|
| Import | `/import?from=recurring_miss&recurringId=...&expectedDate=...` |
| I canceled | `/api/recurring-transactions/actions/canceled?token=...` |
| Check again | `/api/recurring-transactions/actions/rescan?token=...` |
| View details | `/recurring-transactions/{id}?missed={occurrenceId}` |

**"Missing from imports" flow** (alternative to navigating away immediately):

| Action | Label | Effect |
|--------|-------|--------|
| **Snooze pending import** | "I haven't imported yet" | Missed occurrence → `snoozed_import`; `snoozed_until = today + 14 days`; no further notifications for this expected date until snooze expires or user imports |

This is the explicit "don't notify me again for this same missing transaction" action the user requested.

#### 1.10.6 Canceled vs paused — reactivation on new match

When user clicks **"I canceled this"**:

```
tracking_status = 'paused'
status_reason = 'user_canceled'
```

- **Do not** dismiss permanently — user may have been wrong, or subscription may restart
- **Do not** auto-increment to `inactive` via `missed_streak`
- **Do** stop upcoming and missed notifications while paused
- **Watch for reactivation:** On each import or new transaction, if a match fits this pattern:
  1. Do not auto-confirm
  2. Create in-app notification: *"We saw a new $15.99 Netflix charge. Start tracking again?"*
  3. Move to Suggested tab with `detection_path = 'reactivation'`
  4. User confirms → `tracking_status = 'confirmed'`, clear `status_reason`

This is preferable to permanent dismiss — respects "I think I canceled" without losing the pattern if they were mistaken.

#### 1.10.7 Missed detection algorithm (revised)

```
for each active, confirmed recurring_transaction:
  if today > next_expected_date + grace_window:
    if matching transaction already linked for this period → skip
    if recurring_missed_occurrences has resolved/snoozed record for this expected_date → skip

    freshness = computeDataFreshness(budget_account, pattern)
    confidence = freshness.isDataStale ? 'low' : 'high'

    create or update recurring_missed_occurrences (status: open)

    if confidence == 'low':
      # Tentative — don't penalize streak
      send missed notification (stale variant) if notified_count < 2
    else:
      increment missed_streak
      send missed notification (fresh variant) if notified_count < 2
      if missed_streak >= 2 AND no user response after 14 days:
        tracking_status = 'inactive'
        status_reason = 'missed_twice'
        notify once: "We've stopped tracking Netflix — no charges seen for 2 periods"
```

**On import completion** (hook into existing import pipeline):

```
for each active/paused recurring_transaction:
  attempt match against newly imported transactions
  if match found for open missed_occurrence:
    → resolve occurrence as 'found'
    → reset missed_streak = 0
    → update last_occurrence_date, next_expected_date
    → if status was paused/user_canceled: offer reactivation (§1.10.6)
```

#### 1.10.8 Import page contextual UX

When arriving from `?from=recurring_miss&recurringId=X&expectedDate=Y`:

1. **Banner** at top of `/import`:
   - Merchant name, expected amount, expected date
   - *"Import your latest bank or card statement. We'll automatically check for this charge when you're done."*
2. **After import completes:**
   - Redirect to `/recurring-transactions/{id}?rescan=1`
   - Show match result inline: found / not found
3. **Optional:** Pre-select the account/card associated with the recurring pattern if import supports account selection

#### 1.10.9 Detail page — open missed occurrence panel

When a pattern has an open `recurring_missed_occurrences` record, show a prominent card:

```
┌─────────────────────────────────────────────────────────────┐
│ ⚠ Expected charge not found                                  │
│ We expected ~$15.99 around March 8.                           │
│ Your latest transaction is from Feb 12 — data may be stale.  │
│                                                              │
│ [Import transactions]  [I canceled]  [I haven't imported yet] │
└─────────────────────────────────────────────────────────────┘
```

#### 1.10.10 Upcoming notifications — stale data caveat

For `recurring_transaction_upcoming`, if `isDataStale`, append a softer footer:

> *Your transaction history hasn't been updated recently. Import latest statements to ensure we can verify this charge when it posts.*

Do not send `recurring_transaction_insufficient_funds` when data is stale — balance data is equally unreliable.

#### 1.10.11 Schema additions

```sql
-- On recurring_transactions
ALTER TABLE recurring_transactions
  ADD COLUMN account_last_seen_date DATE,  -- cached from detection/cron
  ADD COLUMN data_stale_at_last_check BOOLEAN DEFAULT FALSE;

-- missed occurrences table: see §1.10.3
```

#### 1.10.12 Test scenarios

| Scenario | Expected behavior |
|----------|-------------------|
| Netflix due Mar 8, last txn Feb 12 | Stale miss; low confidence; no streak increment; import-first copy |
| Netflix due Mar 8, last txn Mar 10 | Fresh miss; high confidence; streak increments |
| User clicks "I haven't imported yet" | Snoozed 14 days; no repeat notification for Mar 8 expected date |
| User imports; Netflix found | Occurrence resolved; streak reset; next expected date advanced |
| User clicks "I canceled" | Paused; reactivation offered if charge reappears |
| User cancels, charge appears 2 months later | Suggested reactivation notification |
| Snooze expired, still no txn, fresh data | Second notification; streak increments |

---

## Feature 2: Category Budget Monitor

This is a **separate feature** that operates at the category level. It does not require identifying individual recurring charges.

### 2.1 What it tracks

| Metric | Logic |
|--------|-------|
| **Monthly actual vs budget** | Sum of category splits per month vs `category.monthly_amount` |
| **Sustained over/under** | N consecutive months over/under by > X% |
| **Unusual transaction** | Single transaction > 2× category median transaction size |
| **Spending velocity** | Category spending rate this month vs same point last month |
| **New merchant in category** | First transaction from a merchant never seen in this category |

### 2.2 How it differs from Feature 1

| | Recurring Charge Tracker | Category Budget Monitor |
|--|--------------------------|------------------------|
| Granularity | Individual merchant + amount | Whole category |
| Detection | Pattern matching on dates + amounts | Statistical comparison to budget |
| "Utilities" with 4 bills | 4 separate tracked charges | 1 aggregate: "Utilities is $380 vs $300 budget" |
| Alerts | "Electric bill up 34%" | "Utilities 27% over budget for 3 months" |
| User action | Confirm/dismiss individual charges | Adjust budget or investigate category |

### 2.3 Implementation

Leverage existing `BudgetVsActualTrend` component and extend:

```sql
CREATE TABLE category_budget_alerts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  budget_account_id BIGINT NOT NULL,
  category_id BIGINT NOT NULL,
  alert_type TEXT NOT NULL,  -- 'over_budget_streak', 'unusual_transaction', 'velocity_spike'
  alert_data JSONB NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Run as part of the daily cron job or on month rollover:
1. For each non-system category, compute trailing 3-month actual vs budget
2. Flag categories over budget by > 15% for 2+ consecutive months
3. Flag transactions > 2× category median in current month
4. Store alerts, respect notification preferences

### 2.4 UI

- Category report page: "Budget Health" card with trend sparkline and alert badges
- Dashboard: "Categories needing attention" widget
- Notifications: `category_over_budget`, `category_unusual_transaction`

---

## Shared Infrastructure

### Detection triggers

| Trigger | When | Scope |
|---------|------|-------|
| **On import** | After CSV import or automatic import sync | Match new transactions to existing patterns; detect new candidates |
| **On demand** | User clicks "Scan for recurring" | Full re-scan of last 12–18 months |
| **Daily cron** | Scheduled job | Check upcoming, missed, amount changes |
| **On confirm** | User confirms a suggested pattern | Lock pattern, enable notifications |

### Matching engine (for ongoing tracking)

When a new transaction arrives, attempt to match against active patterns:

```
for each active recurring_transaction:
  if transaction.merchant_group_id == pattern.merchant_group_id
     AND transaction.date within match_window(pattern.next_expected_date)
     AND transaction.transaction_type == pattern.transaction_type
     AND (
       pattern.charge_class == 'variable_bill'  -- date match only; any amount
       OR transaction.amount within tolerance(pattern.expected_amount, pattern.amount_variance)
     ):
    → Link via recurring_transaction_matches
    → Update last_occurrence_date, next_expected_date, occurrence_count
    → Update amount_history
    → For fixed_bill: alert if amount deviates beyond tolerance
    → For variable_bill: alert only if outside IQR range (§1.4)
    → Reset missed_streak to 0
```

**Payment processor patterns:** Match on description substring when `merchant_group` is a processor (§1.8.10).

### Data model additions

Migration `078_recurring_transactions_v2.sql`:

```sql
ALTER TABLE recurring_transactions
  ADD COLUMN tracking_status TEXT DEFAULT 'suggested',
  ADD COLUMN dismissed_at TIMESTAMPTZ,
  ADD COLUMN dismissed_reason TEXT,
  ADD COLUMN amount_history JSONB DEFAULT '[]',
  ADD COLUMN date_anchor_type TEXT,
  ADD COLUMN involuntary_score DECIMAL(3,2),
  ADD COLUMN evidence_score DECIMAL(3,2),
  ADD COLUMN charge_class TEXT,
  ADD COLUMN detection_path TEXT,
  ADD COLUMN classification_signals JSONB DEFAULT '[]',
  ADD COLUMN missed_streak INTEGER DEFAULT 0,
  ADD COLUMN last_missed_date DATE,
  ADD COLUMN status_reason TEXT;

-- Per-user feedback memory (Layer 5) — replaces simple dismissed_patterns table
CREATE TABLE recurring_user_feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  budget_account_id BIGINT NOT NULL,
  merchant_group_id BIGINT NOT NULL,
  amount_bucket INTEGER,          -- NULL for variable-bill patterns
  frequency TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('confirmed', 'dismissed')),
  charge_class TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, budget_account_id, merchant_group_id, amount_bucket, frequency, feedback_type)
);

CREATE INDEX idx_recurring_user_feedback_lookup
  ON recurring_user_feedback(user_id, budget_account_id, merchant_group_id);

-- Missed occurrence tracking (§1.10.3)
CREATE TABLE recurring_missed_occurrences (
  id BIGSERIAL PRIMARY KEY,
  recurring_transaction_id BIGINT NOT NULL REFERENCES recurring_transactions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  budget_account_id BIGINT NOT NULL,
  expected_date DATE NOT NULL,
  grace_end_date DATE NOT NULL,
  missed_confidence TEXT NOT NULL DEFAULT 'high'
    CHECK (missed_confidence IN ('low', 'high')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'snoozed_import', 'user_canceled', 'found', 'auto_resolved', 'dismissed')),
  user_response TEXT,
  snoozed_until DATE,
  notified_at TIMESTAMPTZ,
  notified_count INTEGER DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recurring_transaction_id, expected_date)
);
```

---

## Implementation Phases

### Phase 1: Detection & Classification Overhaul (3–4 weeks)

**Goal**: Fix false positives and false negatives with the 5-layer classifier.

- [ ] Refactor `detection.ts` into pipeline stages (groupCandidates, segmentByGap, inferCadence, validatePattern)
- [ ] Create `classification/` module (§1.8.15): types, category-profile, text-signals, behavioral-signals, merchant-registry, user-feedback, evidence-scoring, classify-candidate
- [ ] Create `merchant-registry.json` with launch allowlist/blocklist (§1.8.8)
- [ ] Implement payment-processor sub-grouping (PayPal/Venmo description split, §1.8.10)
- [ ] Update detection query to include `description`, `category_name` (§1.8.14)
- [ ] Add gap segmentation and recency gating
- [ ] Tighten date anchor validation with business-day rules
- [ ] Add `recurring_user_feedback` table + wire confirm/dismiss to write feedback
- [ ] Update `save-patterns.ts` to store `involuntary_score`, `evidence_score`, `confidence_score` (final), `charge_class`, `detection_path`, `classification_signals`
- [ ] Recompute evidence/confidence on each new matching transaction (§1.9.6)
- [ ] Expand test fixtures per §1.8.16 + §Testing Strategy
- [ ] Run detection against fixtures; target < 5% false positive rate, > 80% utility true positive rate

### Phase 2: Lifecycle & UI (2 weeks)

**Goal**: Give users control over what's tracked.

- [ ] Add tracking_status state machine
- [ ] Restructure RecurringTransactionsPage into Active / Suggested / Inactive tabs
- [ ] Add "Not recurring" dismiss action
- [ ] Add explainability panel on detail page
- [ ] Amount history chart on detail page
- [ ] Migrate existing `is_confirmed` records to `tracking_status = 'confirmed'`

### Phase 3: Notifications & Monitoring (2–3 weeks)

**Goal**: Wire up all alerts with stale-data awareness.

- [ ] Implement amount-change detection on transaction import
- [ ] Implement missed-payment detection in daily cron (§1.10.7)
- [ ] Add `recurring_missed_occurrences` table and resolution API endpoints
- [ ] Data freshness computation (`computeDataFreshness`)
- [ ] Missed notification email template with stale/fresh variants and action buttons (§1.10.4–1.10.5)
- [ ] Signed-token actions: `canceled`, `rescan`, `snooze_import`
- [ ] Import page contextual banner (`?from=recurring_miss`)
- [ ] Post-import hook: re-match patterns, resolve open missed occurrences
- [ ] Re-enable `recurring_transaction_missed` in notification settings
- [ ] Add `recurring_transaction_new` notification type
- [ ] Implement transaction-to-pattern matching engine
- [ ] Missed occurrence panel on detail page (§1.10.9)
- [ ] Dashboard "Upcoming this week" widget
- [ ] Suppress insufficient-funds alerts when data is stale (§1.10.10)

### Phase 4: Category Integration (1 week)

**Goal**: Surface recurring charges in category context.

- [ ] Replace CategoryRecurringTransactions "Coming Soon" with live data
- [ ] Show per-category recurring total vs budget
- [ ] Link to individual recurring detail pages

### Phase 5: Category Budget Monitor (2 weeks)

**Goal**: Separate feature for aggregate budget variance.

- [ ] Create category_budget_alerts table
- [ ] Implement over-budget streak detection
- [ ] Implement unusual transaction detection
- [ ] Add notification types
- [ ] Category report "Budget Health" card
- [ ] Dashboard "Categories needing attention" widget

### Phase 6: Polish & Automation (1–2 weeks)

**Goal**: Reduce manual effort and improve classifier over time.

- [ ] Auto-detect on import (not just on-demand)
- [ ] Daily cron for full pattern health check
- [ ] Admin UI for merchant registry management (`/admin/recurring-merchant-registry`)
- [ ] Registry update workflow from user false-positive/negative reports
- [ ] Seasonal adjustment for variable utilities (optional)
- [ ] Evaluate whether AI assist is needed for `ambiguous` class (score 0.55–0.69)

---

## Testing Strategy

### Fixture categories

| Fixture | Purpose |
|---------|---------|
| `subscriptions.json` | Netflix, Spotify, Adobe — fixed monthly amounts |
| `utilities.json` | Electric, gas, water — variable monthly, consistent dates |
| `retail_false_positives.json` | McDonald's weekly, 7-Eleven gas, Amazon — should NOT detect |
| `memberships.json` | 7-Eleven club, Costco — retail merchant but subscription amount |
| `income.json` | Paycheck biweekly, rental income monthly |
| `stopped.json` | Cancelled gym, ended trial — should detect then deactivate |
| `multi_subscription.json` | Apple with iCloud + Music + TV at different amounts |
| `date_shift.json` | Bills that shift ±1–3 days for weekends/holidays |
| `mortgage.json` | Large fixed monthly, 1st of month with weekend shifts |
| `miscategorized.json` | Bills in wrong budget category — classifier must still detect |
| `payment_processor.json` | PayPal/Venmo with underlying merchant in description |
| `high_variance_utility.json` | Electric $98/$275/$110 — variable_bill path |
| `occurrence_gates.json` | 1-txn explicit text, 2-txn utility reject, 6-txn weekly McDonald's reject |
| `stale_data_miss.json` | Missed alert with old last-txn date — low confidence, no streak |
| `missed_resolution.json` | Snooze, cancel, import-then-found flows |

### Success metrics

| Metric | Target |
|--------|--------|
| False positive rate (retail fixtures) | < 5% |
| True positive rate (subscription fixtures) | > 90% |
| True positive rate (utility fixtures) | > 80% |
| Stale pattern deactivation | Within 2 missed occurrences |
| User dismiss rate on suggested | < 30% (indicates good precision) |

### Evaluation process

1. Run detection against all fixtures, assert expected patterns
2. Run on anonymized real account data (admin tool exists at `/test/recurring-analysis`)
3. Compare before/after pattern counts and user dismiss rates
4. A/B test: show suggested queue vs auto-confirm high-confidence

---

## Open Questions

### Resolved

| Question | Decision |
|----------|----------|
| How to detect merchant category? | 5-layer classifier (§1.8) — no single merchant category field exists |
| What is category weighting? | Layer 1: ±0.15 max, scaled by split consensus; see §1.8.11 |
| Is `category_type` used? | **No** — explicitly excluded |
| Multi-intent merchants? | Amount sub-grouping + per-cluster classification (§1.8.10) |
| Miscategorized utilities? | Variable-bill path with 0.45 threshold; category layer optional |
| High-variance utilities? | `variable_bill` class; amount CV not used for rejection (§1.4) |
| Minimum occurrences? | Per-class matrix (§1.9.2): 1 (explicit text) to 6 (weekly discretionary) |
| Single-transaction detection? | Explicit-text path only; low confidence, in-app only, no schedule |
| Stale / incomplete imports? | Data freshness gates missed streak; import-first copy; snooze per occurrence (§1.10) |
| User says canceled? | Pause (not dismiss); offer reactivation if charge reappears |
| User forgot to import? | Snooze 14 days for that expected date; deep link to `/import` with context |
| Income tracking? | Yes — `income_payroll` charge class, same pipeline |
| Multi-user notifications? | Per `user_id` via existing notification preference model |

### Still open

1. **Lookback window**: 12 vs 18 months? Recommend **15 months** with gap segmentation.

2. **Auto-confirm threshold**: Always require user review for v2 launch. Revisit in v2.1 after measuring dismiss rates.

3. **Registry scope at launch**: ~200 subscription allowlist entries sufficient, or seed from a public dataset? Recommend manual curated list v1; explore community/contributed lists later.

4. **Payment processor list**: PayPal, Venmo, Cash App, Zelle, Square — sufficient for v1?

5. **AI assistance**: Defer to phase 6 evaluation. Target: deterministic classifier handles 90%+ before adding AI for `ambiguous` class.

6. **International**: US federal holidays + US-centric keyword lists for v1. Abstract `HolidayProvider` and `CategoryKeywordProvider` interfaces for future locales.

7. **Merchant registry updates**: Ship with app releases, or allow hot-reload from remote config? Recommend ship-with-app v1; remote config in v2 if needed.

---

## Appendix: Current Codebase Inventory

### Exists and reusable
- `recurring_transactions` + `recurring_transaction_matches` tables
- Detection in `src/lib/recurring-transactions/detection.ts`
- Save logic in `src/lib/recurring-transactions/save-patterns.ts`
- Full UI: list, detail, detect, confirm, deactivate, delete, bulk delete
- APIs: internal + external v1
- Notification types registered; helpers in `src/lib/notifications/helpers.ts`
- Test fixtures and admin analysis tools
- Premium feature gate

### Needs rework
- Detection algorithm (false positives, no classification system, no gap segmentation)
- Detection query (missing `description`, `category_name`)
- Notification wiring (amount_changed, missed not fully active)
- Category report integration (placeholder only)
- No tracking_status lifecycle
- No user feedback memory (`recurring_user_feedback`)
- No on-import matching

### Not started
- `classification/` module (§1.8.15)
- `merchant-registry.json` curated lists
- Payment-processor description sub-grouping
- Stale data freshness checks (§1.10)
- `recurring_missed_occurrences` + resolution actions
- Import page contextual miss banner
- Category Budget Monitor (Feature 2)
- Dashboard widgets
- Auto-detection on import
- Classification explainability UI
