# Recurring Transactions Rework Plan

**Status**: Draft  
**Last Updated**: 2026-01-30  
**Branch**: `feature/recurring-transactions-rework-plan`

## Summary

Recurring detection is currently over-matching transactions that are no longer recurring, especially when there are long gaps, shifted dates, or amount changes. This plan proposes a simpler, more robust detection pipeline that prioritizes recency, stable cadence, and explainable rules. It aims to reduce false positives without resorting to high-cost AI inference.

## Problems Observed

- Patterns remain “active” even after long gaps (e.g., > 1 year).
- Monthly detection tolerates wide gaps and day-of-month drift, creating stale matches.
- Amount matching allows grouping that can collapse unrelated charges.
- Missed recurrence handling is not implemented, so inactive patterns persist.

## Goals

- Reduce false positives by requiring recent, consistent occurrences.
- Keep detection logic explainable and maintainable.
- Handle real-world variance (weekends/holidays, small amount variance).
- Deactivate patterns quickly when they stop recurring.

## Non-Goals

- Full ML/AI-based detection for all transactions.
- Over-optimizing detection for rare, complex patterns before fixing basics.

## Proposed Approach (Pipeline)

**1) Candidate grouping**  
Group by `merchant_group_id`, `transaction_type`, and account (`account_id` or `credit_card_id`).  
Keep a shorter lookback window (12–18 months) and ignore groups with < 3 occurrences.

**2) Segment by gaps**  
Split a group into segments when a gap exceeds `max(2 * median_interval, 45 days)` for monthly/quarterly, or `max(2 * median_interval, 21 days)` for weekly/biweekly.  
Only the most recent segment is eligible to become an active pattern.

**3) Cadence inference (simple + robust)**  
Use median interval + MAD (median absolute deviation) to choose a cadence:
- Weekly: 6–8 days
- Biweekly: 12–16 days
- Monthly: 25–35 days
- Quarterly: 80–100 days
- Yearly: 360–370 days
Reject if MAD/median exceeds a small threshold (e.g., 0.2).

**4) Date anchor checks**  
Monthly: require day-of-month within ±2 days of the median or a consistent week-of-month + weekday pattern.  
Weekly/biweekly: require consistent weekday, allow ±1 day for bank posting shifts.  
Apply a “business day shift” rule (Fri/Mon) before rejecting.

**5) Amount checks**  
Expected amount = median of segment amounts.  
Allow variance = `max($5, 5%)`.  
Variable amount patterns are allowed only if date consistency is very high and amount CV > 0.15.

**6) Recency & active gating**  
Require last occurrence within `1.5 * interval` (monthly: within 45 days).  
If missed two expected occurrences in a row, mark pattern inactive.

**7) Next expected date**  
Compute next date from cadence + anchor.  
Match transactions within a small window (±2 days, or ±3 for monthly).

## Missed Recurrence Handling

Add a lightweight “missed recurrence” check in the scheduled job:

- If `next_expected_date + grace_window` passes with no matching transaction, increment `missed_streak`.
- On `missed_streak >= 2`, set `is_active = false` and log a status reason.
- Send the existing `recurring_transaction_missed` notification only once per streak.

## Optional Data Model Adjustments

Current schema is workable, but the following would improve clarity:

- `missed_streak INTEGER DEFAULT 0`
- `last_missed_date DATE`
- `status_reason TEXT` (e.g., `missed_twice`, `manual_pause`)

These can be added via a migration if needed; otherwise, `notes` can be used temporarily.

## Implementation Plan

1. **Refactor detection into a pipeline**  
   Extract reusable steps from `src/lib/recurring-transactions/detection.ts` into smaller functions:
   - `groupCandidates()`
   - `segmentByGap()`
   - `inferCadence()`
   - `validatePattern()`
   - `scorePattern()`

2. **Add recency & segmentation**  
   Enforce “last occurrence” gating and segment-based detection.

3. **Tighten date + amount checks**  
   Replace broad monthly gap tolerance with anchor rules and smaller variance windows.

4. **Implement missed recurrence handling**  
   Add logic to `handleCheckRecurringTransactions()` to increment `missed_streak` and deactivate patterns.

5. **Add tests**  
   Unit tests for cadence inference, gap segmentation, date anchors, and amount variance.

## AI Considerations (Optional)

If we want AI assistance later, keep it narrow and cheap:

- Use deterministic detection for 90% of cases.
- Only send “low-confidence” candidates to a small local model or batch offline job.
- Send a feature vector (interval stats, recency, amount variance) rather than raw transactions.

This avoids high per-transaction costs and reduces the risk of missing patterns.

## Testing & Evaluation

- Build fixtures for monthly, biweekly, and variable-amount utilities.
- Add “stopped recurring” cases to verify deactivation.
- Compare false positive rate before/after on a sample dataset.

## Open Questions

- Lookback window: 12 vs 18 months?
- Grace window for “missed” checks: 3 vs 5 days?
- Acceptable amount variance for utilities?

