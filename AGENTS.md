# New interface conventions

When creating or changing a page, view, dialog, or data-loading section in `/new`, follow [the skeleton loading standard](docs/NEW_LOOK_LOADING.md). This also applies to shared components rendered in the new interface.

- Show the actual layout immediately, using shared, theme-aware skeletons only for data that has not loaded yet.
- Preserve existing content, focus, and drafts during background refresh. Never replace a usable view with a loader merely because a request is pending.
- Cover route/Suspense fallbacks, initial account checks, feature/permission checks, and independently loaded sections. Keep explicit progress for user actions such as saving, uploading, and processing imports.
- Check desktop/mobile, light/dark, reduced motion, error/retry, empty results, and refresh behavior. Add the new layout to the local loading preview when appropriate.
- Do not change classic loading behavior just to implement the new-interface pattern.
