---
name: ui-screencast
description: >-
  Produce slow, narrated UI screencasts with spotlight overlays, captions, and
  progress chrome for the Every Dollar Budget App. Use when the user asks for a
  screencast, walkthrough video, onboarding demo, narrated demo, feature tour,
  or meeting prep recording of the UI. Defaults to Playwright recording with
  sticky highlights — do not ask the user to specify "go slow" or "add callouts".
---

# UI Screencast (narrated walkthrough video)

When the user asks for a **screencast**, **walkthrough video**, **onboarding
demo**, or similar, produce a **slow, captioned, spotlighted** recording by
default. They should not need to say “go slow” or “call out the features.”

## Defaults (always)

| Setting | Value |
|---------|--------|
| Pace | Slow. Dwell **4.5–10s** per beat (default **5.5s**) |
| Chrome | Dimmed viewport + cyan spotlight ring + caption card + top banner + bottom progress |
| Highlight sync | **Sticky** — ring tracks the live element; never leave a ring where the element used to be |
| Output | `docs/screenshots/<feature-slug>/<name>-walkthrough.webm` + frame PNGs (local only; gitignored) |
| Tooling | Playwright Chromium via `scripts/screencast` |
| Length | Feature tours **8–16 beats**. Onboarding persona tours may go longer to finish setup. |

Do **not** use Codex browser MCP for the final video. Use a Playwright script so
video + frames are deterministic.

## Workflow

```
Task Progress:
- [ ] 1. Scope beats (what must be seen / explained)
- [ ] 2. Confirm base URL + login (or screencast demo user)
- [ ] 3. Ensure empty budget account for first-run coach
- [ ] 4. Write / adapt recorder script using screencast-lib
- [ ] 5. Record
- [ ] 6. QC highlights (frames: ring on target)
- [ ] 7. Hand user the .webm path (+ optional frame folder)
```

### 1. Scope beats

Turn the request into an ordered storyboard of **beats**:

- Each beat = one UI target + short title + 1–3 sentence body (+ optional tip)
- Prefer real UI elements over abstract full-page narration
- For AI Onboarding Coach tours, cover discovery → finances → categories →
  review/confirm → next steps

### 2. Environment

- Local Next.js: `npm run dev` (defaults to `http://localhost:3000`)
- Recorders probe for this app automatically; override with `--base-url`
- Require `AI_ONBOARDING_DEFAULT=true` and `NEXT_PUBLIC_AI_ONBOARDING_DEFAULT=true`
- Login: `SCREENCAST_EMAIL` / `SCREENCAST_PASSWORD` in `.env.local`, or the
  recorder creates a dedicated demo user via the service role key
- Empty budget account: recorder creates/resets one named for the persona

### 3. Recorder script

Create `scripts/record-<slug>-walkthrough.mjs` that:

1. Imports helpers from `.cursor/skills/ui-screencast/scripts/screencast-lib.mjs`
2. Ensures demo user + empty budget account
3. Launches Chromium with `recordVideo: {dir, size: viewport}`
4. Logs in, switches account, opens `/dashboard`
5. For each beat: click/fill → `runBeat(...)` / `narrate(...)` → frame PNG
6. Finalizes with `finalizeVideo(...)`

Checked-in onboarding tours:

- `scripts/record-onboarding-coach-walkthroughs.mjs` — four persona screencasts

```bash
cd scripts/screencast && npm install && npx playwright install chromium
cd ../..
# server running with AI onboarding env flags
node scripts/record-onboarding-coach-walkthroughs.mjs --base-url http://localhost:3000
# or one persona:
node scripts/record-onboarding-coach-walkthroughs.mjs --persona maya-beginner
```

### 4. Highlight alignment (mandatory)

1. Pass a Playwright **`locator`** into `narrate()` / `runBeat()`
2. Measure **after** scroll settle
3. Keep sticky rAF loop during dwell
4. **Freeze scroll** while the caption is up
5. Do not scroll or open another panel while dwelling
6. Spot-check frame PNGs: ring must sit on the named control

### 5. Caption voice

- Title: short noun phrase (“Pick your experience”)
- Body: plain English; what to notice and why
- Tip: optional caveat
- Step label: `Step 3 of 12`

### 6. Deliver

Tell the user:

1. Path to each `.webm`
2. Frame folder
3. Base URL / branch recorded
4. Any beat that could not find its target

## Anti-patterns

- Fast cursor clicking with no dwell
- Full-page dim with no ring when a specific control was intended
- Measuring a box, then scrolling underneath it
- Codex browser MCP as the final deliverable
- Asking the user “should I add overlays?” — always add them

## More detail

- Overlay API, QC checklist, beat template: [reference.md](reference.md)
- Personas for onboarding: [personas.md](personas.md)
