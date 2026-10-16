# Admin API v1

Versioned admin API for automated agents (merchant mapping) and other admin automation.

Base path: `/api/admin/v1`

Existing session-based routes under `/api/admin/*` (without `v1`) remain unchanged.

## Authentication

Send an **admin API key** (preferred for agents):

```http
Authorization: Bearer adm_live_…
```

Keys are created in **Admin → API Keys** (`/admin/api-keys`). They are shared across all admins (not owned by a single admin). Only a SHA-256 hash is stored; the full secret is shown once on create/rotate.

Optionally, an **admin browser session** (cookie) is also accepted for the same endpoints (useful for manual testing).

Expired or revoked keys are rejected. Successful key auth updates `last_used_at`.

### Key management (session admin only)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/api-keys` | List keys (name, prefix, created by, dates, status) |
| `POST` | `/api/admin/api-keys` | Create key → `{ key, secret }` |
| `POST` | `/api/admin/api-keys/:id/revoke` | Revoke immediately |
| `POST` | `/api/admin/api-keys/:id/rotate` | New secret; optional `{ "grace_seconds": 86400 }` |

Create example:

```bash
curl -X POST https://your-app.example/api/admin/api-keys \
  -H 'Content-Type: application/json' \
  -H 'Cookie: …' \
  -d '{"name":"merchant-agent","expires_at":null}'
```

Response:

```json
{
  "key": {
    "id": "…",
    "name": "merchant-agent",
    "key_prefix": "adm_live_abc12345",
    "status": "active",
    "created_at": "…",
    "expires_at": null,
    "last_used_at": null,
    "revoked_at": null
  },
  "secret": "adm_live_abc12345…"
}
```

## Response envelope

Successful v1 responses:

```json
{
  "data": { },
  "meta": {
    "auth_mode": "api_key",
    "api_key_id": "…"
  }
}
```

Errors:

```json
{
  "error": {
    "code": "validation_error",
    "message": "…"
  }
}
```

## Merchant endpoints

### List ungrouped patterns

```http
GET /api/admin/v1/merchants/patterns/ungrouped?limit=50&offset=0&min_usage=1&q=BRIDGE
```

```json
{
  "data": {
    "patterns": [
      {
        "id": 123,
        "pattern": "SP BRIDGE CITY CO 01/14 PURCHASE GREENVILLE SC",
        "normalized_pattern": "bridge city co",
        "normalized_form": "bridge city co",
        "usage_count": 4,
        "first_seen_at": "…",
        "last_seen_at": "…",
        "global_merchant_id": null
      }
    ],
    "total": 1,
    "limit": 50,
    "offset": 0
  },
  "meta": { "auth_mode": "api_key", "api_key_id": "…" }
}
```

`normalized_form` is always computed with the shared normalizer (dates, `SP`/`SQ`/`TST*`/`PAYPAL *`, city/state, `PURCHASE`, etc.).

### List / search global merchants

```http
GET /api/admin/v1/merchants?q=Walmart&status=active&limit=100
```

```json
{
  "data": {
    "merchants": [
      {
        "id": 10,
        "display_name": "Walmart",
        "status": "active",
        "logo_url": null,
        "icon_name": null,
        "created_at": "…",
        "updated_at": "…"
      }
    ]
  },
  "meta": { }
}
```

### Create a global merchant

```http
POST /api/admin/v1/merchants
Content-Type: application/json

{
  "display_name": "Bridge City Coffee",
  "status": "active"
}
```

```json
{
  "data": {
    "merchant": {
      "id": 42,
      "display_name": "Bridge City Coffee",
      "status": "active"
    }
  },
  "meta": { }
}
```

### Get one global merchant

```http
GET /api/admin/v1/merchants/42
```

```json
{
  "data": {
    "merchant": {
      "id": 42,
      "display_name": "Bridge City Coffee",
      "status": "active",
      "logo_url": null,
      "icon_name": null
    },
    "patterns": [
      {
        "id": 123,
        "pattern": "SP BRIDGE CITY CO 01/14 PURCHASE GREENVILLE SC",
        "normalized_pattern": "bridge city co",
        "usage_count": 4
      }
    ]
  },
  "meta": { }
}
```

### Update a global merchant

Editable fields match the session admin UI: `display_name`, `status` (`active`|`draft`), `logo_url`, `icon_name` (logo and icon are mutually exclusive). Renames best-effort update linked `merchant_groups.display_name`. Audited in `admin_merchant_agent_actions` with old/new values and API key.

```http
PATCH /api/admin/v1/merchants/42
Content-Type: application/json

{
  "display_name": "Bridge City Coffee Roasters",
  "status": "active"
}
```

```json
{
  "data": {
    "merchant": {
      "id": 42,
      "display_name": "Bridge City Coffee Roasters",
      "status": "active"
    },
    "unchanged": false,
    "audit_id": 20
  },
  "meta": { }
}
```

Name collision (another merchant already has that `display_name`):

```json
{
  "error": {
    "code": "conflict",
    "message": "A merchant with this name already exists",
    "existing_id": 17
  }
}
```

HTTP status **409**.

### Merge merchants

Merge source `:id` into another merchant (moves patterns, re-links user groups, syncs transactions, deletes source). Same behavior as the session admin merge UI.

```http
POST /api/admin/v1/merchants/42/merge
Content-Type: application/json

{ "into_id": 17 }
```

(`target_merchant_id` is also accepted as an alias for `into_id`.)

```json
{
  "data": {
    "source_merchant": { "id": 42, "display_name": "Bridge City Coffee" },
    "target_merchant": { "id": 17, "display_name": "Bridge City" },
    "patterns_moved": 12,
    "user_groups_updated": 3,
    "transactions_updated": 40,
    "groups_created": 0,
    "audit_id": 21
  },
  "meta": { }
}
```

### Map patterns (auto-approve)

Groups patterns under a merchant, runs the same transaction sync as the admin UI, writes an audit row, and inserts an **approved** suggestion (with confidence/reasoning metadata) for history.

```http
POST /api/admin/v1/merchants/mappings
Content-Type: application/json

{
  "merchant_id": 42,
  "pattern_ids": [123, 456],
  "confidence": 0.96,
  "reasoning": "Same merchant after stripping SP / date / city-state"
}
```

Or create-by-name:

```json
{
  "display_name": "Bridge City Coffee",
  "pattern_ids": [123],
  "confidence": 0.91,
  "reasoning": "New merchant for coffee shop"
}
```

```json
{
  "data": {
    "merchant_id": 42,
    "patterns_grouped": 2,
    "transactions_updated": 18,
    "groups_created": 1,
    "suggestion_id": 99,
    "audit_id": 7
  },
  "meta": { }
}
```

### Create pending suggestions (review queue)

Inserts into `global_merchant_suggestions` so they appear on `/admin/merchant-suggestions`. Respects `global_merchant_pattern_rejections` (rejected pattern↔merchant pairs are skipped).

```http
POST /api/admin/v1/merchants/suggestions
Content-Type: application/json

{
  "batch_id": "agent_2026-10-16",
  "suggestions": [
    {
      "merchant_id": 42,
      "pattern_ids": [789],
      "confidence": 0.72,
      "reasoning": "Likely Bridge City but low confidence on location code"
    },
    {
      "display_name": "Unknown Hardware Store",
      "pattern_ids": [790],
      "confidence": 0.55,
      "reasoning": "Ambiguous; needs human review"
    }
  ]
}
```

```json
{
  "data": {
    "batch_id": "agent_2026-10-16",
    "created": 2,
    "suggestions": [
      { "id": 100, "pattern_count": 1 },
      { "id": 101, "pattern_count": 1 }
    ]
  },
  "meta": { }
}
```

### List pending suggestions

```http
GET /api/admin/v1/merchants/suggestions?limit=50&offset=0&batch_id=agent_2026-10-16
```

### Approve a suggestion

Idempotent: if the suggestion is already approved, or its patterns are already on the target merchant, the call succeeds without remapping. Patterns already mapped to a **different** merchant are **skipped** (not remapped) and listed in `skipped_conflicts`.

```http
POST /api/admin/v1/merchants/suggestions/100/approve
Content-Type: application/json

{
  "global_merchant_id": 42,
  "confidence": 0.94,
  "reasoning": "Confirmed Bridge City Coffee"
}
```

Optional body fields: `global_merchant_id`, `display_name` (find-or-create), `confidence`, `reasoning`. If omitted, uses the suggestion’s existing merchant id or display name.

```json
{
  "data": {
    "suggestion_id": 100,
    "status": "approved",
    "already_approved": false,
    "merchant_id": 42,
    "patterns_grouped": 2,
    "patterns_already_mapped": 1,
    "skipped_conflicts": [
      { "pattern_id": 790, "current_global_merchant_id": 7 }
    ],
    "transactions_updated": 12,
    "groups_created": 0,
    "audit_id": 15
  },
  "meta": { }
}
```

### Bulk-approve suggestions

```http
POST /api/admin/v1/merchants/suggestions/approve
Content-Type: application/json

{
  "ids": [100, 101, 102],
  "confidence": 0.9,
  "reasoning": "Batch approve high-confidence agent queue"
}
```

Same optional override fields as single approve (`global_merchant_id`, `display_name`, `confidence`, `reasoning`) apply to every id. Returns per-id results (one failure does not abort the rest):

```json
{
  "data": {
    "results": [
      {
        "id": 100,
        "ok": true,
        "suggestion_id": 100,
        "status": "approved",
        "already_approved": false,
        "merchant_id": 42,
        "patterns_grouped": 2,
        "patterns_already_mapped": 0,
        "skipped_conflicts": [],
        "transactions_updated": 5,
        "groups_created": 0,
        "audit_id": 16
      },
      {
        "id": 101,
        "ok": false,
        "error": { "code": "not_found", "message": "Suggestion not found" }
      }
    ]
  },
  "meta": { }
}
```

### Cleanup empty merchant groups

Set-based SQL delete of unlinked (`global_merchant_id IS NULL`) per-user groups with no transactions, mappings, category rules, or recurring refs. Never deletes groups linked to a global merchant. Also runs weekly via the `cleanup_empty_merchant_groups` scheduled job. **Not** invoked from pattern sync (that path was causing 504s).

```http
POST /api/admin/v1/merchants/cleanup-empty-groups
Content-Type: application/json

{ "user_id": "optional-uuid-to-scope" }
```

```json
{
  "data": {
    "deleted": 45,
    "user_id": null
  },
  "meta": { }
}
```

### Recompute normalized patterns (post-migration 127)

Batched replacement for the heavy DML removed from migration `127_pattern_sync_and_brand_tld_normalize.sql` (that migration only replaces `normalize_merchant_pattern`). Call phases in order until each returns `done: true`:

1. `recompute_global` — refresh `global_merchant_patterns.normalized_pattern` via the TS normalizer
2. `recompute_mappings` — refresh `merchant_mappings.normalized_pattern` (`upper(normalize…)`)
3. `inherit` — map ungrouped patterns onto a merchant sharing the same normalized form; with `sync: true` (default) also runs `syncTransactionsForPatterns` for newly inherited IDs

Then run `backfill-unlinked` for any remaining null `merchant_group_id` rows.

```http
POST /api/admin/v1/merchants/recompute-patterns
Content-Type: application/json

{ "phase": "recompute_global", "limit": 500, "cursor": 0 }
```

```json
{
  "data": {
    "phase": "recompute_global",
    "scanned": 500,
    "updated": 42,
    "inherited": 0,
    "synced_patterns": 0,
    "transactions_updated": 0,
    "groups_created": 0,
    "next_cursor": 12345,
    "done": false
  },
  "meta": { }
}
```

```http
POST /api/admin/v1/merchants/recompute-patterns
Content-Type: application/json

{ "phase": "inherit", "limit": 200, "cursor": 0, "sync": true }
```

### Backfill unlinked transactions

Pages transactions with `merchant_group_id IS NULL` and no override. Registers descriptions as global patterns, links to the user's group for a matching global merchant (exact then normalized), otherwise creates a clean fallback group. Also runs weekly via `backfill_unlinked_merchants`. Stay under Vercel’s 300s by paging (`limit` + `cursor`).

```http
POST /api/admin/v1/merchants/backfill-unlinked
Content-Type: application/json

{ "user_id": "optional-uuid", "limit": 200, "cursor": 0 }
```


```json
{
  "data": {
    "scanned": 200,
    "linked_global": 120,
    "fallback_created": 70,
    "still_unlinked": 10,
    "next_cursor": 98765,
    "user_id": null
  },
  "meta": { }
}
```

### Unlinked stats

```http
GET /api/admin/v1/merchants/unlinked-stats?user_id=optional-uuid
```

```json
{
  "data": {
    "rows": [
      { "user_id": "…", "budget_account_id": 1, "unlinked_count": 42 }
    ],
    "total_unlinked": 42
  },
  "meta": { }
}
```

## Normalization

Shared helper: `src/lib/merchant-pattern-normalize.ts`  
SQL twin: `normalize_merchant_pattern()` (migrations `122_…`–`127_…`).


Also used by `normalizeMerchantName` / `extractDisplayName` / `resolveMerchantDisplayName` so fallback names stay clean (`Aldi`, not `Aldi Batavia Il`; `Spill The Beans`, not raw `SPILL THE BEANS R1 GREENVILLE SC`).

Example:

| Raw | Normalized |
|-----|------------|
| `SP BRIDGE CITY CO 01/14 PURCHASE GREENVILLE SC` | `bridge city co` |
| `SQ *BRIDGE CITY COFFEE` | `bridge city coffee` |
| `ALDI INC BATAVIA IL` | `aldi` |
| `TARGET T-1182` | `target` |
| `BURGER KING #17020 Q07 TAYLORS SC` | `burger king` |
| `TST* TROPICAL GRILLE WADE 864-334-5163 SC` | `tropical grille` |
| `Amazon MKTPL*AB12CD34` | `amazon` |
| `STORE TRAVELERS RESSC` | `store` |
| `SPILL THE BEANS R1 GREENVILLE SC` | `spill the beans` |

New transaction descriptions that normalize to an already-mapped pattern inherit that global merchant (import lookup registers the raw pattern; sync re-links matching per-user groups).

## Disabling the weekly Gemini job

Default behavior is unchanged (job runs). To skip Gemini merchant suggestions:

```bash
DISABLE_SUGGEST_MERCHANT_GROUPINGS=true
# or
GEMINI_MERCHANT_SUGGESTIONS_ENABLED=false
```

## Migrations & env

Run migrations:

- `migrations/122_add_admin_api_keys_and_merchant_agent.sql`
- `migrations/123_improve_merchant_normalize_and_cleanup.sql`
- `migrations/124_fix_cleanup_rpc_and_normalize_gaps.sql`
- `migrations/125_backfill_unlinked_and_register_codes.sql`

Optional env (no new required secrets for the API itself — keys live in the DB):

| Variable | Default | Purpose |
|----------|---------|---------|
| `DISABLE_SUGGEST_MERCHANT_GROUPINGS` | unset/false | Skip weekly Gemini suggestion job |
| `GEMINI_MERCHANT_SUGGESTIONS_ENABLED` | unset/true | Set to `false` to skip the same job |

Agent auth uses keys from the Admin UI, not an env-stored master key.
