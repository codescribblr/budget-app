# Version Update Notification

This feature automatically detects when a new version of the app has been deployed and prompts users to refresh their browser to get the latest updates.

## How It Works

1. **Version Generation**: On each build, a `version.json` file is generated in the `public/` directory containing:
   - `buildTime`: ISO timestamp of when the build was created
   - `buildTimestamp`: Unix timestamp for easy comparison

2. **Version API**: The `/api/version` endpoint serves the current build version from the `version.json` file.

3. **Client-Side Checking**: The `useVersionCheck` hook:
   - Fetches the initial version when the app loads
   - Periodically checks for updates every 60 seconds (after an initial 30-second delay)
   - Also checks when the window regains focus or becomes visible
   - Compares the server version with the client's loaded version

4. **Notification Display**: When a new version is detected:
   - A notification banner appears at the bottom of the screen
   - Users can click "Refresh" to reload the page
   - Users can dismiss the notification (it will re-check after 5 minutes)

## Implementation Details

### Files Created

- `scripts/generate-version.js` - Generates version.json on build
- `src/app/api/version/route.ts` - API endpoint serving version info
- `src/hooks/use-version-check.ts` - React hook for version checking
- `src/components/version/VersionUpdateNotification.tsx` - Notification component

### Build Integration

The version file is automatically generated before each build via the `prebuild` script in `package.json`. This ensures that every deployment has a unique version identifier.

### Configuration

- **Check Interval**: 60 seconds (configurable in `use-version-check.ts`)
- **Initial Delay**: 30 seconds before first check
- **Dismiss Duration**: 5 minutes before re-checking after dismissal

## Usage

The notification component is automatically included in the root layout, so it works across the entire application without any additional setup.

## Testing

To test the feature:

1. Build the app: `npm run build`
2. Start the server: `npm start`
3. Open the app in a browser
4. In another terminal, rebuild the app (this generates a new version)
5. Wait 30-90 seconds or switch tabs and come back
6. The notification should appear prompting you to refresh
