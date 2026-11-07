# Version update notification

Each build writes `public/version.json` with an immutable `releaseId`, full `commitSha`, `buildTime` and `buildTimestamp`. Next bakes that release ID into the browser JavaScript. Cloud Panel uses the GitHub run and attempt in the ID; rebuilding or rolling back can therefore be distinguished even when the source commit is unchanged.

`/api/version` reads the manifest without caching and verifies it against the runtime release identity. Missing or mismatched manifests return 503, never a fresh fallback timestamp. Health/version requests bypass Supabase session refresh. The version manifest is included in standalone and Vercel file tracing.

The client compares the server identity with the identity of its loaded code immediately on mount, every 60 seconds, and on focus/visibility. It does not adopt the first network response as its baseline. Requests cannot overlap and abort after eight seconds. Invalid responses and offline failures cannot invent an update. A rollback to an older build also shows the banner.

Users can dismiss the banner for five minutes. Refresh asks them to save first and confirm. Registered unsaved budget editors block the refresh; existing browser before-unload protections still apply. Canceling refresh leaves the page and update banner intact. New version checks are disabled in development.

Tests cover first-fetch races, rollback identities, invalid manifests and multiple dirty editors. The staging browser proof covers live promotion, retained chunks, canceling the confirmation, refreshing to the new build and repeating that process after rollback. Full unsaved financial-form testing belongs in an authenticated isolated staging environment.

See [Cloud Panel deployment](CLOUD_PANEL_DEPLOYMENT.md) for release and cutover details.
