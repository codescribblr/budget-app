# Cloud Panel deployment and migration gates

The Cloud Panel implementation is live on cloud.jrwdev.com; web02 runs agent 0.11.1. Budget production remains on Vercel. The `PRODUCTION_HOST` repository variable defaults to Vercel; do not change it during staging. This branch introduces the budget runtime and deployment contract; it does not authorize a DNS, webhook or cron cutover.

## Current staging contract

`cloud-panel-staging` deploys through GitHub Actions to app 20 at https://budget-stage.jrwdev.com/login. The `cloud-staging` GitHub environment allows only that branch. Its expiring credential permits deployment of this staging app only. Builds run on Linux with Node 24, install native dependencies there, and package Next standalone output, static/public assets and email templates. No source checkout or compilation is needed on web02.

Staging currently uses `NEXT_PUBLIC_DEPLOYMENT_MODE=smoke`, an invalid Supabase hostname and placeholder credentials. Authentication, API writes, server actions, callbacks and cron are blocked. The login shell, browser JavaScript, image runtime, version banner, TLS, release promotion and rollback can be exercised safely. Readiness explicitly reports `mode: smoke` and `dependenciesChecked: false`. This is runtime proof, not a claim that banking, payments, email or production data have passed functional staging tests. Full functional staging requires an isolated Supabase-compatible database/auth/storage project and sandbox provider credentials.

The smoke-mode flag is baked into browser and server output. Switching to a functional environment requires a new build. Public environment variables must be marked build/both in Cloud Panel; private runtime secrets should be runtime-only. A release snapshots its environment revision, so editing values does not alter an already running artifact. Never put the backup encryption key or database migration URL into the application environment.

## Release contract

1. Fetch a panel build/configuration snapshot and validate its environment.
2. Test, build and package immutable output identified by full commit SHA and GitHub run/attempt. Verify native Linux dependencies and the build identity.
3. Reserve the app deployment lock and upload digest-checked chunks; stage without changing traffic.
4. For production, check pending migrations; make an encrypted backup and verify both authenticated download and the web02 replica before any schema change. Run compatible pre-deploy migrations under one PostgreSQL advisory lock.
5. Start the candidate under its app user and check readiness. Production readiness checks the release manifest and a bounded read-only PostgREST query; it never returns user records.
6. Promote after readiness, verify the public TLS endpoint's exact release identity, and drain the previous runtime. Finalize post-deploy migrations, then mark the release active.
7. If post-deploy migration/finalization fails, leave the deployment locked for review. Do not restore a database or silently roll back a schema change. Incompatible schema generations cannot use application rollback.

`scheduled-jobs-v2` is this release's schema compatibility generation. Change it whenever a future contract migration makes prior application artifacts unsafe. Retained old chunks support open tabs; `/api/version` and readiness are uncached. The browser compares the loaded JavaScript identity with the server on its first check, on focus and every 60 seconds. Rollback is also an identity change. Refresh requires confirmation and refuses while registered budget editors contain unsaved changes; existing native before-unload guards remain effective.

## Migration and scheduled-job safety

The migration runner uses one connection and session advisory lock for a phase. A migration's SQL and `_migrations` insert commit together. Outer transaction wrappers are normalized; unsupported/partial wrappers fail before execution. Nontransactional SQL requires explicit `migration-transaction: none` and `migration-idempotent: true` comments, and needs review after any interruption. PostgreSQL diagnostics are withheld from public Actions logs. Migration 149 contained a redundant second COMMIT; removing it does not rerun that already recorded migration.

Migration 156 adds a unique active job per type, token-fenced atomic claims, 15-minute renewable leases and atomic completion/next-run creation while preserving history. If legacy data contains duplicate active jobs, the migration stops for review. UTC daily, weekly and first-of-month schedules match the live schedule inventory. Missing cron secrets fail closed, and handler failures return unsuccessful HTTP/JSON outcomes. Keep exactly one production dispatcher: `0 8 * * *` UTC, `GET /api/cron/run-jobs`, secret header reference `CRON_SECRET`, no automatic retries.

Expired or uncertain work becomes failed and is not automatically repeated: email, provider calls and other external effects may already have occurred. Existing failed rows continue to make job monitoring unhealthy until reviewed. The read-only inventory on 2026-11-06 found two historical failed rows; review their effects and choose whether to acknowledge or retry before enabling the new dispatcher. Acknowledgement preserves failed history by setting `failure_reviewed_at` after recording the operator, reason and external-effect review in the job metadata; it does not rerun the job. An intentional retry is a new pending row after checking that no active row of that type exists. Do not bulk reset historical completed/failed rows to pending. Stop dispatchers and confirm no running jobs before the schema/application transition. Vercel route `maxDuration` does not impose a timeout on a self-hosted Node process; Cloud Panel has its own HTTP timeout and drain limit.

## Before production cutover

- Reconcile actual Vercel project settings, environment values/scopes, preview deployments, usage limits and callback registrations. Preserve the existing integration encryption key and literal multiline Teller certificates. Verify `CRON_SECRET` is configured before shipping the fail-closed routes to Vercel.
- Run authenticated workflows and migration/restore rehearsals on isolated data, including imports, AI streaming, webhooks with original request bodies, email templates, images, realtime and unsaved-form refresh behavior.
- Measure actual peak memory with two budget runtimes plus existing web02 tenants; test large imports and enforce an appropriate request/concurrency budget. Idle smoke results alone cannot establish production capacity.
- Configure a protected `cloud-production` GitHub environment restricted to main, app 19, and a separate production deploy credential. Keep backup-only credentials separate. No production deploy credential is provisioned by this staging change.
- Confirm verified backups and recovery-key availability. Prepare the exact DNS/Cloudflare redirect and Supabase/Stripe/Teller/email callback changes and their reversal. The existing domain redirects to the Vercel hostname; an A record alone will not remove that redirect.
- Disable the Vercel cron trigger and verify no running jobs. Only after approval, set `PRODUCTION_HOST=cloud-panel`, deploy, change public routing/callbacks and enable the single panel dispatcher. Preserve the Vercel deployment for an observation/rollback window of at least one full daily job cycle (prefer seven days).
- Monitor public health, latency, memory/OOM/restarts, disk, certificates, job outcomes and provider retries. Panel state is visible in the UI; external alert delivery and replica-retention automation still need operational follow-up.

Application rollback is distinct from restoring data. Use the panel only for a compatible retained artifact. A production database restore remains a reviewed `production-recovery` operation. Never automatically restore SQL in a deployment error handler.

## Verification evidence

See the Cloud Panel repository's `docs/ARTIFACT_RELEASES.md` for the live synthetic proof: GitHub build/upload/promotion, TLS, streaming drain, restart recovery, rollback, rejected unsafe inputs, secret isolation, managed jobs and replicated encrypted archives. Budget-specific staging proof and capacity measurements are appended after the live runs complete.
