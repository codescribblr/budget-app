# Loading in the new interface

The page should feel present before its data arrives. Keep known headings, labels, navigation, and filters visible. Put neutral placeholders where the fetched values and records will appear, matching the finished layout on both desktop and mobile.

## Components and placement

- `src/components/new-look/page-skeleton.tsx`: route-aware full-page layouts. `PageSkeleton` is the fallback for a route, Suspense boundary, or `DataBoundary`. Use `heading={false}` when the real heading is already mounted. Set `view` explicitly when the current URL does not describe the region. Add a matching layout for new page types; do not silently reuse an unrelated list.
- `src/components/new-look/skeleton-sections.tsx`: `SkeletonRegion`, `SkeletonRows`, `SkeletonFields`, `SkeletonSummary`, `SkeletonChart`, and `GoalCardsSkeleton` for independently loaded regions. For example, an activity panel uses `<SkeletonRows kind="activity" label="Loading envelope activity" />`; a transaction list uses `kind="transactions"` without duplicating the already-loaded totals or filters.
- `src/components/new-look/home-skeleton.tsx`: dashboard reference and shared `SkeletonLine`. `HomeLoadingShell` supplies the initial navigation shell while account selection is checked; its child determines the actual requested page.
- Shared classic/new components can wrap their original loading markup in `ContentLoading`. It shows the matching section skeleton only under `/new`. The existing `LoadingSpinner` adapts full-page legacy callers to route-aware skeletons; prefer explicit components in new code.
- Use the existing theme tokens and `.nl-skeleton` animation. No hardcoded gray, simulated money, invented account names, chart values, or fake completion statuses. Placeholders are decorative, not disabled-looking interactive controls.

## Loading is not refreshing

Keep these states distinct:

1. **Initial load / new scope:** no usable result for the selected user, budget, or filter. Render the appropriate skeleton immediately, without an artificial delay.
2. **Background refresh:** retain the last result while fetching. Use the shared freshness indicator. Do not flash skeletons, remount editors, clear selections, overwrite drafts, or move focus. Follow the resource/version and stale-edit contracts in `NEW_LOOK_SYNC_PLAN.md`.
3. **Error:** stop the skeleton and show a specific retry state. If prior content is usable for the same scope, retain it alongside the error. Do not show another budget or filter's records as a fallback.
4. **Empty success:** show useful empty-state guidance. Zero results are loaded data, not a reason to keep skeletons visible.
5. **User action:** saving, uploading, processing, scanning, and loading older rows keep their explicit action progress. Do not skeletonize the entire page during these operations.

Example for an independently fetched section:

```tsx
// `result` is scoped to the active budget and filters; refresh never clears it.
{result ? (
  <ActivityList result={result} refreshError={error} />
) : error ? (
  <ActivityLoadError onRetry={retry} />
) : (
  <SkeletonRows kind="activity" label="Loading activity" />
)}
```

## Accessibility and verification

`SkeletonRegion` announces one named loading region and hides its decorative content. Do not add focusable controls inside it. Keep real controls outside the skeleton and gate their actions until data/permissions are ready. Respect `prefers-reduced-motion`; both themes use the same semantic tokens.

For every new or changed view, check its route/Suspense fallback, budget bootstrap, feature/permission load, and independent data sections. Compare the skeleton to the populated page at desktop and narrow phone widths. Check no horizontal overflow, stable headings, empty/error/retry behavior, and no skeleton flash or draft loss during live refresh. No artificial delays belong in production.

`/new/loading-preview` is a development-only gallery of the actual components. Add new layout types there so they can be inspected without relying on a fast network request. The route is unavailable in production. The dashboard also supports `/new?preview=loading` locally. Verify actual loaded views too; the gallery is not a substitute for checking transitions.

## Rollout verification · 2026-10-31

TypeScript and the isolated production build pass, along with 13 focused refresh/draft tests. All 24 gallery layouts fit a 390px viewport without page overflow and expose no placeholder controls. Representative desktop/mobile layouts were inspected in both themes. Real transaction and profile views transitioned from skeletons to content; transaction refresh preserved loaded rows, totals, and search text, and an empty search correctly replaced the loader with its empty state. No financial data was changed during verification. This expanded loading pass is local on the feature branch until separately deployed.
