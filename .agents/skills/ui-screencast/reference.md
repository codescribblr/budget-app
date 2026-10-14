# UI Screencast — reference (Every Dollar Budget App)

## Beat template

```js
await setBanner(page, "Onboarding coach · Maya");
await setProgress(page, i, beats.length);

await narrate(page, {
  locator: page.getByRole("button", {name: /beginner/i}),
  stepLabel: `Step ${i + 1} of ${beats.length}`,
  title: "Short title",
  body: "What to notice. One idea per beat.",
  tip: "Optional: why it matters",
  dwellMs: 5500,
  cardSide: "auto",
});
```

## Import path

From `scripts/record-*.mjs` at repo root:

```js
import {
  DEFAULT_VIEWPORT,
  prepareOutputDirs,
  loadDotEnv,
  ensureScreencastUser,
  prepareEmptyOnboardingAccount,
  loginWithPassword,
  dismissBlockingOverlays,
  safeClick,
  narrate,
  clearHighlight,
  setBanner,
  setPill,
  setProgress,
  runBeat,
  finalizeVideo,
  parseArg,
  resolveBaseUrl,
} from "../.cursor/skills/ui-screencast/scripts/screencast-lib.mjs";
```

```bash
cd scripts/screencast && npm install && npx playwright install chromium
```

## Launch + video

```js
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({
  viewport: DEFAULT_VIEWPORT,
  ignoreHTTPSErrors: true,
  recordVideo: {
    dir: path.join(OUT_DIR, ".video-tmp"),
    size: DEFAULT_VIEWPORT,
  },
});
```

## QC checklist

- [ ] Ring sits on the named control in frame PNGs
- [ ] Caption readable; adjust `cardSide` if clipped
- [ ] Progress bar advances; banner names the tour
- [ ] `.webm` plays; duration roughly `beats × ~6s`
- [ ] Output under `docs/screenshots/<slug>/`

## Suggested dwell times

| Beat type | dwellMs |
|-----------|---------|
| Overview / dialog | 4500 |
| Single control | 5500 |
| Dense review plan | 7000 |
| Critical callout | 8000–10000 |

## Login defaults

```js
loadDotEnv(REPO_ROOT);
const user = await ensureScreencastUser(REPO_ROOT);
await loginWithPassword(page, {
  baseUrl: BASE_URL,
  email: user.email,
  password: user.password,
});
await prepareEmptyOnboardingAccount(page, "Screencast · Maya");
```

## When not to use this skill

- Ticket verify scripts that assert pass/fail
- User only wants a still screenshot
