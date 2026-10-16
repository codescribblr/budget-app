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

## Normalization

Shared helper: `src/lib/merchant-pattern-normalize.ts`  
SQL twin: `normalize_merchant_pattern()` in migration `122_…`.

Example:

| Raw | Normalized |
|-----|------------|
| `SP BRIDGE CITY CO 01/14 PURCHASE GREENVILLE SC` | `bridge city co` |
| `SQ *BRIDGE CITY COFFEE` | `bridge city coffee` |

New transaction descriptions that normalize to an already-mapped pattern inherit that global merchant (trigger + import lookup).

## Disabling the weekly Gemini job

Default behavior is unchanged (job runs). To skip Gemini merchant suggestions:

```bash
DISABLE_SUGGEST_MERCHANT_GROUPINGS=true
# or
GEMINI_MERCHANT_SUGGESTIONS_ENABLED=false
```

## Migrations & env

Run migration:

- `migrations/122_add_admin_api_keys_and_merchant_agent.sql`

Optional env (no new required secrets for the API itself — keys live in the DB):

| Variable | Default | Purpose |
|----------|---------|---------|
| `DISABLE_SUGGEST_MERCHANT_GROUPINGS` | unset/false | Skip weekly Gemini suggestion job |
| `GEMINI_MERCHANT_SUGGESTIONS_ENABLED` | unset/true | Set to `false` to skip the same job |

Agent auth uses keys from the Admin UI, not an env-stored master key.
