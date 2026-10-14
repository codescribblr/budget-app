# AI Onboarding Agent (test branch)

Feature-flagged adaptive first-run coach on branch `feat/ai-onboarding-agent`.

## What it does

When enabled for an empty budget account, the **Budget setup coach** modal replaces the legacy First Login Wizard and:

1. Asks path / experience / situation (buttons + optional free text)
2. Collects balances and income
3. Lets the user pick envelopes
4. Shows an editable `review_plan` with suggested monthly amounts
5. On confirm, creates accounts, categories, settings (and goals if Premium)
6. Returns personalized next steps (Money Movement, Categories, Income, Help)

If Gemini is unavailable or returns invalid JSON, a deterministic fallback flow runs so local testing still works.

## Enable for local / test site

Pick one:

1. **Env default (recommended for test site)** — in `.env.local`:

   ```bash
   AI_ONBOARDING_DEFAULT=true
   NEXT_PUBLIC_AI_ONBOARDING_DEFAULT=true
   GOOGLE_GEMINI_API_KEY=your_key_here
   ```

   Restart the Next.js server after changing env.

2. **Per-account feature flag** — Settings → Features → enable **AI Onboarding Coach** (`ai_onboarding`, free tier).

Legacy wizard remains when the flag/env is off.

## Apply DB migration

Run on the test Supabase project:

```bash
# migrations/121_ai_onboarding_conversation_kind.sql
```

Adds `ai_conversations.kind` (`chat` | `onboarding`). The API also falls back if the column is missing (title prefix `[onboarding]`).

## Manual test script

### Happy path (AI / fallback)

1. Create a fresh user on the test project (or clear accounts/categories + wipe `budget_wizard_*` / `ai_onboarding_*` settings).
2. Ensure env default or feature flag is on.
3. Sign in → land on `/dashboard`.
4. Confirm **Budget setup coach** opens (not the Rocket legacy wizard).
5. Choose **Help me set up** → beginner → stressed (or use free text).
6. Enter checking balance + monthly income → select categories → **Build my plan**.
7. Tweak an amount on the review screen → **Create my budget**.
8. Expect toast with created counts; next-steps cards with deep links.
9. **Go to dashboard** → categories exist with non-zero amounts when income was provided; `budget_wizard_completed` / `ai_onboarding_completed` set.

### Flag-off regression

1. Set both env vars to unset/`false` and disable `ai_onboarding` for the account.
2. Use an empty account → legacy **First Login Wizard** should open.
3. Complete or skip as before.

### Skip path

1. Open coach → **Skip for now**.
2. Settings should include `budget_wizard_skipped` / `ai_onboarding_skipped`.
3. Coach should not reopen until those are cleared.

### Free text

1. On welcome or situation screens, enter free text (e.g. “I’m behind on credit cards”) → **Use this description**.
2. Flow should continue and bias toward debt/stressed situation in the fallback path.

## API

`POST /api/ai/onboarding/turn`

```json
{
  "conversationId": "uuid-optional",
  "action": { "type": "start" },
  "state": { "stage": "welcome" }
}
```

Mutations only occur for `confirm_plan` and `skip`. Rate limit: `onboarding` = 40 turns/day/user (separate from chat).

## Out of scope (this branch)

- User-managed API keys for onboarding
- Arbitrary generated React
- Audio STT (free-text box is the hook for later transcripts)
