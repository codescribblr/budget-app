#!/usr/bin/env node
/**
 * Record narrated onboarding-coach walkthroughs for four realistic personas.
 *
 * Usage:
 *   node scripts/record-onboarding-coach-walkthroughs.mjs
 *   node scripts/record-onboarding-coach-walkthroughs.mjs --persona maya-beginner
 *   node scripts/record-onboarding-coach-walkthroughs.mjs --base-url http://localhost:3000
 */
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {
  DEFAULT_VIEWPORT,
  clearHighlight,
  dismissBlockingOverlays,
  ensureOverlay,
  ensureScreencastUser,
  finalizeVideo,
  loadDotEnv,
  loginWithPassword,
  parseArg,
  prepareEmptyOnboardingAccount,
  prepareOutputDirs,
  resolveBaseUrl,
  runBeat,
  safeClick,
  setBanner,
} from "../.cursor/skills/ui-screencast/scripts/screencast-lib.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(REPO_ROOT, "scripts/screencast/package.json"));
const {chromium} = require("playwright");

loadDotEnv(REPO_ROOT);

const PERSONAS = {
  "maya-beginner": {
    slug: "maya-beginner",
    displayName: "Maya",
    banner: "Onboarding coach · Maya — first budget ever",
    accountLabel: "Screencast · Maya",
    summary:
      "Maya has never budgeted. She’s paycheck-to-paycheck and needs a gentle guided setup.",
    path: "beginner",
    checking: "842.50",
    savings: "120.00",
    income: "3200",
    freeText: null,
  },
  "derek-debt": {
    slug: "derek-debt",
    displayName: "Derek",
    banner: "Onboarding coach · Derek — paying down debt",
    accountLabel: "Screencast · Derek",
    summary:
      "Derek has tried budgeting before. Credit cards are the main stress; he wants a clearer plan.",
    path: "some",
    situation: "debt",
    checking: "1104.00",
    savings: "40.00",
    income: "4800",
    freeText: null,
  },
  "priya-power": {
    slug: "priya-power",
    displayName: "Priya",
    banner: "Onboarding coach · Priya — spreadsheet power user",
    accountLabel: "Screencast · Priya",
    summary:
      "Priya already runs her money in spreadsheets. She wants the fast track into envelopes.",
    path: "power",
    checking: "4520.75",
    savings: "12500.00",
    income: "7800",
    freeText: null,
  },
  "sam-freelance": {
    slug: "sam-freelance",
    displayName: "Sam",
    banner: "Onboarding coach · Sam — irregular freelance income",
    accountLabel: "Screencast · Sam",
    summary:
      "Sam is rebuilding after a slow season. They describe their situation in their own words first.",
    path: "freetext",
    checking: "2100.00",
    savings: "0",
    income: "3600",
    freeText:
      "I'm freelance / 1099 with irregular pay. Coming off a slow season and need an emergency fund and a simple budget I can actually stick to.",
  },
};

function coachDialog(page) {
  return page.getByRole("dialog").filter({hasText: /Budget setup coach/i});
}

async function waitForCoach(page) {
  await page.goto(`${(await resolveBaseUrl())}/dashboard`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  // Prefer already-resolved base from caller — patched below via parameter
}

async function waitForCoachReady(page) {
  const dialog = coachDialog(page);
  await dialog.waitFor({state: "visible", timeout: 90000});
  // Wait out Gemini turn / busy overlay (disabled inputs)
  for (let i = 0; i < 40; i++) {
    const busy = await dialog.locator(".animate-spin").isVisible().catch(() => false);
    const disabledInput = await dialog.locator("input:disabled").count();
    if (!busy && disabledInput === 0) return;
    await page.waitForTimeout(500);
  }
}

async function openCoach(page, baseUrl) {
  await page.goto(`${baseUrl}/dashboard`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await waitForCoachReady(page);
  await page.waitForTimeout(500);
  await ensureOverlay(page);
}

async function clickCoachOption(page, patterns) {
  const dialog = coachDialog(page);
  for (const pattern of patterns) {
    const btn = dialog.getByRole("button", {name: pattern}).first();
    const visible = (await btn.count()) > 0 && (await btn.isVisible().catch(() => false));
    if (!visible) continue;
    try {
      await btn.click({timeout: 5000});
    } catch {
      await btn.click({force: true, timeout: 3000}).catch(() => {});
    }
    await page.waitForTimeout(1500);
    return true;
  }
  return false;
}

async function waitForCoachScreen(page, textPattern, timeout = 45000) {
  await coachDialog(page)
    .getByText(textPattern)
    .first()
    .waitFor({state: "visible", timeout})
    .catch(() => {});
}

async function advanceUntil(page, predicate, {patterns = [], max = 6} = {}) {
  for (let i = 0; i < max; i++) {
    if (await predicate()) return true;
    const clicked = await clickCoachOption(page, patterns);
    if (!clicked) break;
  }
  return predicate();
}

async function hasFinancesForm(page) {
  return coachDialog(page)
    .locator('input[type="number"]')
    .first()
    .isVisible()
    .catch(() => false);
}

async function hasReviewPlan(page) {
  return coachDialog(page)
    .getByRole("button", {name: /create my budget|confirm/i})
    .first()
    .isVisible()
    .catch(() => false);
}

async function hasCategoriesForm(page) {
  const dialog = coachDialog(page);
  const multi = await dialog.locator('[role="checkbox"]').count();
  return multi > 3;
}

async function hasNextSteps(page) {
  return coachDialog(page)
    .getByRole("button", {name: /go to dashboard|done|finish/i})
    .or(coachDialog(page).getByText(/fund your envelopes|next steps|you.?re set up/i))
    .first()
    .isVisible()
    .catch(() => false);
}

async function fillMoneyField(page, labelPattern, value) {
  const dialog = coachDialog(page);
  const field = dialog.getByLabel(labelPattern).first();
  if ((await field.count()) === 0) return false;
  await field.fill(String(value));
  return true;
}

async function fillFinances(page, persona) {
  const dialog = coachDialog(page);
  await waitForCoachReady(page);
  await dialog.locator("input:not([disabled])").first().waitFor({
    state: "visible",
    timeout: 60000,
  });

  async function fillByLabel(pattern, value) {
    const label = dialog.locator("label").filter({hasText: pattern}).first();
    if ((await label.count()) === 0) return false;
    const forId = await label.getAttribute("for");
    let input;
    if (forId) {
      const safeId = forId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      input = dialog.locator(`[id="${safeId}"]`);
    } else {
      input = label.locator("xpath=following::input[1]");
    }
    if ((await input.count()) === 0) return false;
    const target = input.first();
    await target.waitFor({state: "visible", timeout: 15000});
    for (let i = 0; i < 20; i++) {
      if (await target.isEnabled().catch(() => false)) break;
      await page.waitForTimeout(400);
    }
    await target.fill(String(value));
    return true;
  }

  const filledChecking = await fillByLabel(/checking/i, persona.checking);
  const filledSavings = await fillByLabel(/savings/i, persona.savings);
  const filledIncome = await fillByLabel(/income|take-home|monthly/i, persona.income);

  if (!filledChecking && !filledIncome) {
    const inputs = dialog.locator('input[type="number"], input[type="text"]');
    const count = await inputs.count();
    if (count >= 1) await inputs.nth(0).fill(String(persona.checking));
    if (count >= 2) await inputs.nth(count === 2 ? 1 : 2).fill(String(persona.income));
    if (count >= 3) {
      await inputs.nth(1).fill(String(persona.savings));
      await inputs.nth(2).fill(String(persona.income));
    }
  } else if (filledChecking && !filledSavings && !filledIncome) {
    // Two-field Gemini form: checking + income
    await fillByLabel(/income|take-home|monthly|paycheck/i, persona.income);
  }
}

async function submitForm(page) {
  const dialog = coachDialog(page);
  const candidates = [
    dialog.getByRole("button", {
      name: /continue|build my plan|choose my envelopes|choose envelopes|next|save|submit|looks good|create plan/i,
    }),
    dialog.locator('button[type="submit"]'),
    dialog.locator("button").filter({
      hasText: /continue|next|build|save|choose|envelopes|plan/i,
    }),
  ];
  for (const loc of candidates) {
    const btn = loc.first();
    if ((await btn.count()) > 0 && (await btn.isVisible().catch(() => false))) {
      const label = ((await btn.textContent()) || "").trim();
      if (/skip|close|use this description/i.test(label)) continue;
      await btn.click({timeout: 5000}).catch(async () => {
        await btn.click({force: true});
      });
      await page.waitForTimeout(2500);
      return true;
    }
  }
  const buttons = dialog.getByRole("button");
  const n = await buttons.count();
  for (let i = n - 1; i >= 0; i--) {
    const btn = buttons.nth(i);
    const text = ((await btn.textContent()) || "").trim();
    if (/skip|close|use this description/i.test(text)) continue;
    if (!(await btn.isVisible().catch(() => false))) continue;
    await btn.click({force: true}).catch(() => {});
    await page.waitForTimeout(2500);
    return true;
  }
  return false;
}

async function confirmPlan(page) {
  const dialog = coachDialog(page);
  await dialog
    .getByText(/review|starter budget|create my budget|confirm|looks good/i)
    .first()
    .waitFor({timeout: 60000})
    .catch(() => {});
  const confirm = dialog
    .getByRole("button", {
      name: /create my budget|create budget|confirm|apply|looks good|save my budget|finish setup/i,
    })
    .first();
  if ((await confirm.count()) > 0) {
    await confirm.click({timeout: 5000}).catch(async () => confirm.click({force: true}));
  } else {
    await submitForm(page);
  }
  await page.waitForTimeout(3000);
}

async function recordPersona(persona, {baseUrl, email, password}) {
  const outDir = path.join(
    REPO_ROOT,
    "docs/screenshots",
    `onboarding-${persona.slug}`
  );
  const framesDir = path.join(outDir, "frames");
  const dest = path.join(outDir, `${persona.slug}-walkthrough.webm`);
  prepareOutputDirs(outDir, framesDir);

  const browser = await chromium.launch({headless: true});
  const context = await browser.newContext({
    viewport: DEFAULT_VIEWPORT,
    ignoreHTTPSErrors: true,
    recordVideo: {dir: path.join(outDir, ".video-tmp"), size: DEFAULT_VIEWPORT},
  });
  const page = await context.newPage();
  const missed = [];
  let i = 0;
  // Approximate; we increment as we go
  let total = 12;
  const banner = persona.banner;

  async function beat(slug, opts) {
    console.log(`  beat ${i + 1} ${slug}`);
    const result = await runBeat(page, framesDir, i, total, slug, {banner, ...opts});
    if (result.missing) missed.push(slug);
    i += 1;
  }

  console.log(`\n=== Recording ${persona.slug} (${persona.displayName}) ===`);
  console.log(persona.summary);

  try {
  await loginWithPassword(page, {baseUrl, email, password});
  // Let session cookies settle before account APIs
  await page.goto(`${baseUrl}/dashboard`, {waitUntil: "domcontentloaded", timeout: 90000});
  await page.waitForTimeout(1500);
  await dismissBlockingOverlays(page);
  const account = await prepareEmptyOnboardingAccount(
    page,
    persona.accountLabel,
    REPO_ROOT
  );
  console.log(`  account ${account.id} · ${account.name}`);
  await openCoach(page, baseUrl);

  await beat("coach-opens", {
    locator: coachDialog(page),
    title: `${persona.displayName} meets the setup coach`,
    body: persona.summary,
    tip: "The coach only appears on an empty budget account when AI onboarding is enabled.",
    dwellMs: 7000,
    cardSide: "bottom",
  });

  if (persona.path === "freetext") {
    const area = coachDialog(page).getByRole("textbox").first();
    await area.fill(persona.freeText);
    await beat("free-text", {
      locator: area,
      title: "Describe the situation in your own words",
      body: "Sam doesn’t pick a canned chip first — they explain irregular freelance income and the need for an emergency fund.",
      tip: "Free text feeds the same setup pipeline as the buttons.",
      dwellMs: 8000,
      cardSide: "left",
    });
    await clickCoachOption(page, [/use this description/i]);
    await page.waitForTimeout(2000);
  } else if (persona.path === "power") {
    await clickCoachOption(page, [
      /know what i.?m doing|budgeting pro|fast track|skip the intro|power|customization/i,
    ]);
    await beat("power-path", {
      locator: coachDialog(page),
      title: "Power-user fast path",
      body: "Priya skips the beginner teaching track and jumps toward balances, categories, and review.",
      dwellMs: 5500,
      cardSide: "right",
    });
  } else if (persona.path === "beginner") {
    await clickCoachOption(page, [
      /help me set up|guided/i,
      /brand new|complete beginner|total beginner|never budgeted|walk me through/i,
    ]);
    await beat("beginner-choice", {
      locator: coachDialog(page),
      title: "Beginner path",
      body: "Maya chooses the guided path so the coach can teach envelope basics as it builds her starter plan.",
      dwellMs: 5500,
      cardSide: "right",
    });
    await clickCoachOption(page, [
      /brand new|complete beginner|total beginner|never budgeted|walk me through/i,
    ]);
    await clickCoachOption(page, [
      /paycheck|stressed|need control|overwhelm|getting control|control of my money/i,
    ]);
    await beat("situation-stressed", {
      locator: coachDialog(page),
      title: "Focus: getting control",
      body: "She marks paycheck-to-paycheck so suggestions lean toward essentials, emergency fund, and realistic starter amounts.",
      dwellMs: 5500,
      cardSide: "right",
    });
  } else if (persona.path === "some") {
    await clickCoachOption(page, [
      /help me set up|guided|some experience|tried before|budgeted before|know the basics/i,
    ]);
    await clickCoachOption(page, [
      /some experience|tried before|know the basics|budgeted before/i,
    ]);
    await beat("some-experience", {
      locator: coachDialog(page),
      title: "Some experience",
      body: "Derek already knows the basics — he wants a better system, not a lecture.",
      dwellMs: 5500,
      cardSide: "right",
    });
    await clickCoachOption(page, [/debt|pay down|credit card/i]);
    await beat("situation-debt", {
      locator: coachDialog(page),
      title: "Focus: pay down debt",
      body: "Choosing debt bias adds a Debt Payment envelope and goal-oriented next steps later.",
      dwellMs: 5500,
      cardSide: "right",
    });
  }

  await advanceUntil(page, () => hasFinancesForm(page), {
    patterns: [
      /continue|next|stable|saving|rebuilding|stressed|debt|beginner|some|power|help me|paycheck|control|basics|pro/i,
    ],
    max: 5,
  });
  await waitForCoachReady(page);
  await fillFinances(page, persona);
  await waitForCoachReady(page);
  await beat("finances", {
    locator: coachDialog(page),
    title: "Money snapshot",
    body: `Checking $${persona.checking}, savings $${persona.savings}, monthly take-home about $${persona.income}. Approximate numbers are fine — the coach uses them to suggest envelope amounts.`,
    tip: "Accounts = where money lives. Categories = what money is for.",
    dwellMs: 7500,
    cardSide: "left",
  });
  await submitForm(page);
  await waitForCoachReady(page);

  await advanceUntil(page, () => hasCategoriesForm(page), {
    patterns: [/continue|next|build|choose/i],
    max: 3,
  });
  await waitForCoachReady(page);
  await beat("categories", {
    locator: coachDialog(page),
    title: "Choose starter envelopes",
    body: "Common categories are pre-selected. Users can add Debt Payment, Emergency Fund, and others before the plan is built.",
    dwellMs: 6500,
    cardSide: "left",
  });
  await submitForm(page);
  await waitForCoachReady(page);

  await advanceUntil(page, () => hasReviewPlan(page), {
    patterns: [/continue|next|build my plan|choose|review/i],
    max: 3,
  });
  await waitForCoachReady(page);
  await beat("review-plan", {
    locator: coachDialog(page),
    title: "Review before anything is saved",
    body: "Suggested monthly amounts appear here. Nothing is created until Confirm — users can tweak names and dollars first.",
    tip: "Mutations are confirm-only for safety.",
    dwellMs: 8000,
    cardSide: "left",
  });
  await confirmPlan(page);

  await advanceUntil(page, () => hasNextSteps(page), {patterns: [], max: 1});
  await beat("next-steps", {
    locator: coachDialog(page),
    title: "Personalized next steps",
    body: "After create, the coach hands off with deep links — fund envelopes, refine amounts, configure income, and relevant Help articles.",
    dwellMs: 8000,
    cardSide: "left",
  });

  const done = coachDialog(page).getByRole("button", {
    name: /go to dashboard|done|finish/i,
  });
  if (await done.first().isVisible().catch(() => false)) {
    await beat("finish", {
      locator: done.first(),
      title: "Enter the budget",
      body: `${persona.displayName} lands on the dashboard with accounts and envelopes ready — next real habit is funding envelopes in Money Movement.`,
      dwellMs: 5500,
      cardSide: "top",
    });
    await done.first().click({timeout: 5000}).catch(() => {});
    await page.waitForTimeout(2000);
  }

  total = Math.max(total, i);
  await clearHighlight(page);
  } catch (err) {
    console.error(`  recording error: ${err.message}`);
    missed.push(`error:${err.message.slice(0, 80)}`);
    await page.screenshot({
      path: path.join(framesDir, `error-${Date.now()}.png`),
      fullPage: true,
    }).catch(() => {});
  }

  const videoPath = await finalizeVideo(page, context, browser, dest);
  console.log(`  wrote ${videoPath}`);
  if (missed.length) console.warn(`  missed targets: ${missed.join(", ")}`);
  return {dest: videoPath, framesDir, missed};
}

async function main() {
  const baseUrl = (parseArg("base-url", "") || (await resolveBaseUrl())).replace(/\/$/, "");
  const only = parseArg("persona", "");
  const user = await ensureScreencastUser(REPO_ROOT);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Screencast user: ${user.email}`);

  // Quick health check
  const res = await fetch(baseUrl).catch(() => null);
  if (!res?.ok && res?.status !== 307 && res?.status !== 302) {
    throw new Error(`App not reachable at ${baseUrl}. Start npm run dev first.`);
  }

  const list = only
    ? [PERSONAS[only]].filter(Boolean)
    : Object.values(PERSONAS);
  if (!list.length) {
    throw new Error(
      `Unknown persona "${only}". Choose: ${Object.keys(PERSONAS).join(", ")}`
    );
  }

  const results = [];
  for (const persona of list) {
    results.push(await recordPersona(persona, {baseUrl, ...user}));
  }

  console.log("\nDone:");
  for (const r of results) {
    console.log(`- ${r.dest}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
