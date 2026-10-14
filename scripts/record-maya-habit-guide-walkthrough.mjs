#!/usr/bin/env node
/**
 * Maya habit-guide walkthrough (light mode).
 *
 * Speeds through beginner coach setup, then narrates the first habit-loop
 * interactions: dashboard Habit Guide → fund envelopes → log spending →
 * check an envelope → Help reopen.
 *
 * Usage:
 *   node scripts/record-maya-habit-guide-walkthrough.mjs
 *   node scripts/record-maya-habit-guide-walkthrough.mjs --base-url http://localhost:3000
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

const MAYA = {
  displayName: "Maya",
  accountLabel: "Screencast · Maya Habit",
  checking: "842.50",
  savings: "120.00",
  income: "3200",
};

const BANNER = "Habit Guide · Maya — first week after setup";
const OUT_SLUG = "onboarding-maya-habit-guide";

function coachDialog(page) {
  return page.getByRole("dialog").filter({hasText: /Budget setup coach/i});
}

async function forceLightMode(page) {
  await page.emulateMedia({colorScheme: "light"});
  await page.evaluate(() => {
    try {
      localStorage.setItem("theme", "light");
    } catch {
      /* ignore */
    }
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    document.documentElement.style.colorScheme = "light";
    document.body?.classList?.remove("dark");
    // Softer dim so light UI stays readable
    const dim = document.getElementById("sc-dim");
    if (dim) dim.style.background = "rgba(15, 23, 42, 0.38)";
  });
  const toggle = page.getByRole("button", {name: /toggle theme/i}).first();
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click().catch(() => {});
    await page.waitForTimeout(200);
    const lightItem = page.getByRole("menuitem", {name: /^light$/i});
    if (await lightItem.isVisible().catch(() => false)) {
      await lightItem.click().catch(() => {});
      await page.waitForTimeout(300);
    } else {
      await page.keyboard.press("Escape").catch(() => {});
    }
  }
  await page.evaluate(() => {
    document.documentElement.classList.remove("dark");
  });
}

async function dismissCompletionDialog(page) {
  await page.evaluate(() => {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("wizard-completion-dismissed-")) {
          localStorage.setItem(key, "true");
        }
      }
    } catch {
      /* ignore */
    }
  });
  const dialog = page.getByRole("dialog").filter({hasText: /How this works|Budget Setup Complete/i});
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!(await dialog.isVisible().catch(() => false))) return;
    const closeX = dialog.locator('button[aria-label="Close"], button:has(svg)').first();
    const btn = dialog
      .getByRole("button", {name: /go to dashboard|i.?ll do this later|close/i})
      .first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({timeout: 4000}).catch(async () => btn.click({force: true}));
    } else if (await closeX.isVisible().catch(() => false)) {
      await closeX.click({force: true}).catch(() => {});
    } else {
      await page.keyboard.press("Escape").catch(() => {});
    }
    await page.waitForTimeout(700);
  }
}

async function waitForHabitGuideCard(page, timeout = 15000) {
  await dismissCompletionDialog(page);
  const card = page.getByTestId("budget-habit-guide");
  await card.waitFor({state: "visible", timeout}).catch(() => {});
  return card;
}

async function waitForCoachReady(page) {
  const dialog = coachDialog(page);
  await dialog.waitFor({state: "visible", timeout: 90000});
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
  await forceLightMode(page);
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
  return (await dialog.locator('[role="checkbox"]').count()) > 3;
}

async function hasNextSteps(page) {
  return coachDialog(page)
    .getByRole("button", {name: /go to dashboard|done|finish/i})
    .or(coachDialog(page).getByText(/how this works|log your first|log spending|gave money jobs/i))
    .first()
    .isVisible()
    .catch(() => false);
}

async function fillFinances(page) {
  const dialog = coachDialog(page);
  await waitForCoachReady(page);
  // Coach sometimes skips straight to categories — don't hang on missing money fields
  const hasInputs = await dialog
    .locator('input[type="number"], input[type="text"]')
    .first()
    .isVisible()
    .catch(() => false);
  if (!hasInputs) {
    console.log("  (no finances form — coach skipped ahead)");
    return;
  }
  await dialog.locator("input:not([disabled])").first().waitFor({
    state: "visible",
    timeout: 30000,
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

  const filledChecking = await fillByLabel(/checking/i, MAYA.checking);
  await fillByLabel(/savings/i, MAYA.savings);
  const filledIncome = await fillByLabel(/income|take-home|monthly/i, MAYA.income);

  if (!filledChecking && !filledIncome) {
    const inputs = dialog.locator('input[type="number"], input[type="text"]');
    const count = await inputs.count();
    if (count >= 1) await inputs.nth(0).fill(String(MAYA.checking));
    if (count >= 2) await inputs.nth(count === 2 ? 1 : 2).fill(String(MAYA.income));
    if (count >= 3) {
      await inputs.nth(1).fill(String(MAYA.savings));
      await inputs.nth(2).fill(String(MAYA.income));
    }
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
  return false;
}

async function confirmPlan(page) {
  const dialog = coachDialog(page);
  await dialog
    .getByText(/review|starter budget|create my budget|confirm|looks good|choose your budget/i)
    .first()
    .waitFor({timeout: 60000})
    .catch(() => {});
  const confirm = dialog
    .getByRole("button", {
      name: /create my budget plan|create my budget|create budget|confirm|apply|looks good|save my budget|finish setup/i,
    })
    .first();
  if ((await confirm.count()) > 0) {
    await confirm.click({timeout: 5000}).catch(async () => confirm.click({force: true}));
  } else {
    await submitForm(page);
  }
  await page.waitForTimeout(3000);
}

async function runFastSetup(page, baseUrl) {
  await openCoach(page, baseUrl);

  await clickCoachOption(page, [
    /help me set up|guided/i,
    /brand new|complete beginner|total beginner|never budgeted|walk me through/i,
  ]);
  await clickCoachOption(page, [
    /paycheck|stressed|need control|overwhelm|getting control|control of my money/i,
  ]);

  await advanceUntil(
    page,
    async () => (await hasFinancesForm(page)) || (await hasCategoriesForm(page)),
    {
      patterns: [
        /continue|next|stable|saving|rebuilding|stressed|debt|beginner|some|power|help me|paycheck|control|basics|pro/i,
      ],
      max: 5,
    }
  );
  await waitForCoachReady(page);

  if (await hasFinancesForm(page)) {
    await fillFinances(page);
    await submitForm(page);
    await waitForCoachReady(page);
  }

  await advanceUntil(page, () => hasCategoriesForm(page), {
    patterns: [/continue|next|build|choose/i],
    max: 3,
  });
  await waitForCoachReady(page);
  if (await hasCategoriesForm(page)) {
    await submitForm(page);
    await waitForCoachReady(page);
  }

  await advanceUntil(page, () => hasReviewPlan(page), {
    patterns: [/continue|next|build my plan|choose|review|create my budget plan/i],
    max: 4,
  });
  await waitForCoachReady(page);
  await confirmPlan(page);
  await advanceUntil(page, () => hasNextSteps(page), {patterns: [], max: 2});
  await waitForCoachReady(page);
}

async function ensureBudgetSeeded(page) {
  const status = await page.evaluate(async () => {
    const [accountsRes, categoriesRes] = await Promise.all([
      fetch("/api/accounts"),
      fetch("/api/categories"),
    ]);
    const accounts = accountsRes.ok ? await accountsRes.json() : [];
    const categories = categoriesRes.ok ? await categoriesRes.json() : [];
    const accountList = Array.isArray(accounts) ? accounts : [];
    const categoryList = Array.isArray(categories) ? categories : [];
    return {
      accounts: accountList.length,
      categories: categoryList.filter((c) => c && !c.is_system && !c.is_buffer).length,
    };
  });
  console.log(`  seeded check: ${JSON.stringify(status)}`);
  if (status.accounts > 0 && status.categories > 0) return status;

  console.log("  bootstrapping accounts + categories via API…");
  await page.evaluate(async ({checking, savings}) => {
    const makeAccount = async (name, balance, account_type) => {
      await fetch("/api/accounts", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name, balance, account_type, include_in_totals: true}),
      });
    };
    const makeCategory = async (name, monthly_amount) => {
      await fetch("/api/categories", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name, monthly_amount, current_balance: 0}),
      });
    };
    const accountsRes = await fetch("/api/accounts");
    const accounts = accountsRes.ok ? await accountsRes.json() : [];
    if (!Array.isArray(accounts) || accounts.length === 0) {
      await makeAccount("Checking Account", Number(checking), "checking");
      await makeAccount("Savings Account", Number(savings), "savings");
    }
    const categoriesRes = await fetch("/api/categories");
    const categories = categoriesRes.ok ? await categoriesRes.json() : [];
    const userCats = Array.isArray(categories)
      ? categories.filter((c) => c && !c.is_system && !c.is_buffer)
      : [];
    if (userCats.length === 0) {
      for (const [name, amount] of [
        ["Rent/Mortgage", 1100],
        ["Groceries", 450],
        ["Utilities", 200],
        ["Transportation", 250],
        ["Dining Out", 150],
      ]) {
        await makeCategory(name, amount);
      }
    }
  }, {checking: MAYA.checking, savings: MAYA.savings});

  // Enable habit guide after bootstrap; pre-dismiss completion dialog
  const completedAt = new Date().toISOString();
  await page.evaluate(async (completedAt) => {
    await fetch("/api/settings", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        settings: [
          {key: "habit_guide_enabled", value: "true"},
          {key: "budget_wizard_completed", value: completedAt},
        ],
      }),
    });
    try {
      localStorage.setItem(`wizard-completion-dismissed-${completedAt}`, "true");
    } catch {
      /* ignore */
    }
  }, completedAt);
  return {bootstrapped: true};
}

async function ensureFundableBalances(page, baseUrl) {
  const result = await page.evaluate(async ({checking, savings}) => {
    const res = await fetch("/api/accounts");
    const accounts = res.ok ? await res.json() : [];
    if (!Array.isArray(accounts) || accounts.length === 0) {
      return {updated: 0, reason: "no-accounts"};
    }
    let updated = 0;
    for (const account of accounts) {
      const name = String(account.name || "").toLowerCase();
      const target = /sav/i.test(name) ? Number(savings) : Number(checking);
      const patch = await fetch(`/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({balance: target}),
      });
      if (patch.ok) updated += 1;
    }
    return {updated, count: accounts.length};
  }, {checking: MAYA.checking, savings: MAYA.savings});
  console.log(`  balances patched: ${JSON.stringify(result)}`);
  await page.goto(`${baseUrl}/money-movement`, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await forceLightMode(page);
  await page.waitForTimeout(2000);
}

async function fundFirstEnvelope(page) {
  await clearHighlight(page);
  // Prefer Groceries allocate input; never Use Monthly Amounts (over-allocates).
  const grocery = page.getByText("Groceries", {exact: true}).first();
  await grocery.waitFor({state: "attached", timeout: 20000});
  await grocery.evaluate((el) => {
    el.scrollIntoView({block: "center", behavior: "instant"});
  });
  await page.waitForTimeout(500);
  const groceryRow = page.locator("tr").filter({hasText: /Groceries/i}).first();
  let allocateInput = groceryRow.locator('input[type="number"]').first();
  if ((await allocateInput.count()) === 0) {
    allocateInput = page.locator('input[id^="allocate-"]').first();
  }
  await allocateInput.waitFor({state: "attached", timeout: 15000});
  await allocateInput.scrollIntoViewIfNeeded().catch(() => {});
  await allocateInput.fill("150", {force: true});
  await page.waitForTimeout(400);

  const allocateBtn = page
    .getByRole("button", {name: /allocate to envelopes|allocate funds/i})
    .first();
  await allocateBtn.click({timeout: 8000}).catch(async () => {
    await allocateBtn.click({force: true});
  });
  await page.waitForTimeout(2500);
  await dismissBlockingOverlays(page);
  for (const name of [/continue without|allocate without|close|dismiss/i]) {
    const btn = page.getByRole("button", {name}).first();
    if (await btn.isVisible().catch(() => false)) {
      const text = ((await btn.textContent()) || "").trim();
      if (/got it|don.?t show/i.test(text)) continue;
      await btn.click({force: true}).catch(() => {});
      await page.waitForTimeout(600);
    }
  }
}

async function addGroceryPurchase(page) {
  const addBtn = page.getByRole("button", {name: /^add transaction$/i}).first();
  await addBtn.waitFor({state: "visible", timeout: 15000});
  await safeClick(page, addBtn);
  await page.waitForTimeout(600);

  const dialog = page.getByRole("dialog").filter({hasText: /Add Transaction/i});
  await dialog.waitFor({state: "visible", timeout: 15000});

  const desc = dialog.locator("#description, input[name='description']").first()
    .or(dialog.getByLabel(/description|merchant|payee/i).first());
  if (await desc.count()) {
    await desc.first().fill("Kroger groceries");
  } else {
    const textInputs = dialog.locator('input[type="text"]');
    if ((await textInputs.count()) > 0) await textInputs.first().fill("Kroger groceries");
  }

  const amount = dialog.getByLabel(/amount/i).first()
    .or(dialog.locator('input[type="number"]').first());
  if (await amount.count()) {
    await amount.first().fill("42.50");
  }

  // Pick first non-system category if a select exists
  const catTrigger = dialog.getByRole("combobox").first()
    .or(dialog.locator('[role="combobox"]').first());
  if (await catTrigger.isVisible().catch(() => false)) {
    await catTrigger.click();
    await page.waitForTimeout(400);
    const option = page.getByRole("option").filter({hasText: /grocer|food|eating/i}).first()
      .or(page.getByRole("option").nth(1));
    if (await option.isVisible().catch(() => false)) {
      await option.click();
    } else {
      await page.keyboard.press("Escape");
    }
  }

  const submit = dialog.getByRole("button", {name: /^add transaction$/i}).last();
  await submit.click({timeout: 8000}).catch(async () => submit.click({force: true}));
  await page.waitForTimeout(2000);
  await dismissBlockingOverlays(page);
}

async function main() {
  const baseUrl = (parseArg("base-url", "") || (await resolveBaseUrl())).replace(/\/$/, "");
  const user = await ensureScreencastUser(REPO_ROOT);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Screencast user: ${user.email}`);

  const res = await fetch(baseUrl).catch(() => null);
  if (!res?.ok && res?.status !== 307 && res?.status !== 302) {
    throw new Error(`App not reachable at ${baseUrl}. Start npm run dev first.`);
  }

  const outDir = path.join(REPO_ROOT, "docs/screenshots", OUT_SLUG);
  const framesDir = path.join(outDir, "frames");
  const dest = path.join(outDir, "maya-habit-guide-walkthrough.webm");
  prepareOutputDirs(outDir, framesDir);

  const browser = await chromium.launch({headless: true});
  const context = await browser.newContext({
    viewport: DEFAULT_VIEWPORT,
    colorScheme: "light",
    ignoreHTTPSErrors: true,
    recordVideo: {dir: path.join(outDir, ".video-tmp"), size: DEFAULT_VIEWPORT},
  });
  await context.addInitScript(() => {
    try {
      localStorage.setItem("theme", "light");
      // Pre-empt any leftover completion dismiss keys
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("wizard-completion-dismissed-")) {
          localStorage.setItem(key, "true");
        }
      }
    } catch {
      /* ignore */
    }
    // next-themes reads before paint when possible
    document.documentElement.classList.remove("dark");
  });
  const page = await context.newPage();
  await forceLightMode(page);

  const missed = [];
  let i = 0;
  let total = 11;
  const banner = BANNER;

  async function beat(slug, opts) {
    console.log(`  beat ${i + 1} ${slug}`);
    await forceLightMode(page);
    const result = await runBeat(page, framesDir, i, total, slug, {banner, ...opts});
    if (result.missing) missed.push(slug);
    i += 1;
  }

  console.log("\n=== Recording Maya habit guide (light mode) ===");

  try {
    await loginWithPassword(page, {
      baseUrl,
      email: user.email,
      password: user.password,
    });
    await forceLightMode(page);
    await page.goto(`${baseUrl}/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await forceLightMode(page);
    await page.waitForTimeout(1500);
    await dismissBlockingOverlays(page);

    const account = await prepareEmptyOnboardingAccount(
      page,
      MAYA.accountLabel,
      REPO_ROOT
    );
    console.log(`  account ${account.id} · ${account.name}`);

    console.log("  fast setup through coach…");
    await runFastSetup(page, baseUrl);
    await ensureOverlay(page);
    await setBanner(page, banner);

    // --- Habit story starts ---
    const logCta = coachDialog(page)
      .getByRole("link", {name: /log spending/i})
      .or(coachDialog(page).getByRole("button", {name: /log spending/i}))
      .first();
    const nextStepsTarget =
      (await logCta.isVisible().catch(() => false))
        ? logCta
        : coachDialog(page);

    await beat("01-habit-exit", {
      locator: nextStepsTarget,
      title: "How this works",
      body: "Setup is done. The coach now teaches the habit: envelopes hold purpose, logging spending makes them real, and Log spending is the primary next step.",
      tip: "Fund envelopes is secondary — Import stays optional for later.",
      dwellMs: 8000,
      cardSide: "left",
    });

    const done = coachDialog(page).getByRole("button", {
      name: /go to dashboard|done|finish/i,
    });
    if (await done.first().isVisible().catch(() => false)) {
      await done.first().click({timeout: 5000}).catch(() => {});
    }
    await page.waitForTimeout(2500);
    await forceLightMode(page);
    await dismissBlockingOverlays(page);

    // Ensure accounts/categories exist even if the coach UI skipped apply
    await ensureBudgetSeeded(page);

    // Wizard completion dialog uses the same habit story — show it, then dismiss
    const completion = page.getByRole("dialog").filter({hasText: /How this works/i});
    await completion.waitFor({state: "visible", timeout: 8000}).catch(() => {});
    if (await completion.isVisible().catch(() => false)) {
      await beat("02-completion-habit-story", {
        locator: completion.getByRole("button", {name: /fund envelopes/i}).first()
          .or(completion.getByText(/Fund your envelopes/i).first()),
        title: "Same habit story on arrival",
        body: "The completion dialog repeats the three beats so Maya doesn’t lose the thread when the coach closes.",
        tip: "Primary action is still Log spending; Fund envelopes is right underneath.",
        dwellMs: 7000,
        cardSide: "left",
      });
      await dismissCompletionDialog(page);
    }

    await page.goto(`${baseUrl}/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await forceLightMode(page);
    await page.waitForTimeout(2000);
    await dismissCompletionDialog(page);
    await ensureOverlay(page);

    const habitCard = await waitForHabitGuideCard(page);
    await beat("03-dashboard-fund-tip", {
      locator: habitCard,
      title: "Habit Guide on the dashboard",
      body: "Only the next incomplete step shows. For Maya that’s Fund your envelopes — give paycheck dollars jobs before she starts spending.",
      tip: "Dismiss for now, or Don’t show habit tips. She can always reopen from Help.",
      dwellMs: 7500,
      cardSide: "bottom-right",
    });

    const fundCta = page.getByRole("link", {name: /open money movement|fund envelopes/i}).first();
    if (await fundCta.isVisible().catch(() => false)) {
      await fundCta.click();
    } else {
      await page.goto(`${baseUrl}/money-movement`, {waitUntil: "domcontentloaded"});
    }
    await forceLightMode(page);
    await page.waitForTimeout(1500);
    await ensureFundableBalances(page, baseUrl);
    await ensureOverlay(page);

    const mmTip = page.getByTestId("habit-guide-tip").first();
    await mmTip.waitFor({state: "visible", timeout: 10000}).catch(() => {});
    await beat("04-money-movement-tip", {
      locator: mmTip,
      title: "Payday vs spending",
      body: "Money Movement puts cash into envelopes. Spending later uses Transactions to take money out — two different moves.",
      dwellMs: 7000,
      cardSide: "bottom-right",
    });

    await clearHighlight(page);
    await page.waitForTimeout(500);
    // Reload once more so allocate rows are painted with balances
    await page.goto(`${baseUrl}/money-movement`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await forceLightMode(page);
    await page.waitForTimeout(2000);
    await ensureOverlay(page);

    const allocateInput = page.locator('input[id^="allocate-"]').first();
    await allocateInput.waitFor({state: "attached", timeout: 20000});
    await beat("05-fund-action", {
      locator: allocateInput.or(
        page.getByRole("button", {name: /allocate to envelopes/i}).first()
      ),
      title: "Fund a few envelopes",
      body: "Maya puts $150 into Groceries so that envelope holds real dollars before her first purchase.",
      dwellMs: 5500,
      cardSide: "left",
    });
    await clearHighlight(page);
    await fundFirstEnvelope(page);
    await forceLightMode(page);

    await page.goto(`${baseUrl}/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await forceLightMode(page);
    await page.waitForTimeout(2500);
    await dismissCompletionDialog(page);
    await ensureOverlay(page);

    const logCard = await waitForHabitGuideCard(page, 20000);
    await beat("06-dashboard-log-tip", {
      locator: logCard,
      title: "Next: log spending",
      body: "Once envelopes are funded, the guide advances. Logging purchases is what makes the budget match real life.",
      dwellMs: 7000,
      cardSide: "bottom-right",
    });

    const logLink = page.getByRole("link", {name: /add a transaction|log spending/i}).first();
    if (await logLink.isVisible().catch(() => false)) {
      await logLink.click();
    } else {
      await page.goto(`${baseUrl}/transactions`, {waitUntil: "domcontentloaded"});
    }
    await forceLightMode(page);
    await page.waitForTimeout(2000);
    await ensureOverlay(page);

    const txnTip = page.getByTestId("habit-guide-tip").first();
    await txnTip.waitFor({state: "visible", timeout: 10000}).catch(() => {});
    await beat("07-transactions-tip", {
      locator: txnTip,
      title: "Empty Transactions tip",
      body: "When Maya buys groceries, she adds it here and picks Groceries — that envelope goes down. The bank balance alone doesn’t update the budget.",
      dwellMs: 7500,
      cardSide: "bottom-right",
    });

    await beat("08-add-purchase", {
      locator: page.getByRole("button", {name: /^add transaction$/i}).first(),
      title: "Log the first purchase",
      body: "She records a $42.50 grocery run. This is the moment the habit clicks: spend → log → envelope drops.",
      dwellMs: 5500,
      cardSide: "left",
    });
    await addGroceryPurchase(page);
    await forceLightMode(page);
    await ensureOverlay(page);

    await page.goto(`${baseUrl}/categories`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await forceLightMode(page);
    await dismissCompletionDialog(page);
    await page
      .locator("table tbody tr, [role='row']")
      .filter({hasText: /Groceries|Rent/i})
      .first()
      .waitFor({state: "visible", timeout: 45000})
      .catch(() => {});
    await page.waitForTimeout(1000);
    await ensureOverlay(page);

    const groceries = page
      .locator("table tbody tr, [role='row']")
      .filter({hasText: /Groceries/i})
      .first()
      .or(page.getByText("Groceries", {exact: true}).first());
    await groceries.waitFor({state: "attached", timeout: 15000}).catch(() => {});
    await beat("09-check-envelope", {
      locator: groceries,
      title: "Check the envelope",
      body: "On Budgets she sees Groceries funded and spent. Visiting categories after funding + logging completes the “check an envelope” milestone.",
      tip: "That’s the whole loop: fund → log → check.",
      dwellMs: 8000,
      cardSide: "right",
    });

    await page.goto(`${baseUrl}/help/getting-started/habit-loop`, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });
    await forceLightMode(page);
    await page.waitForTimeout(1500);
    await ensureOverlay(page);

    const reopenBtn = page
      .getByRole("button", {name: /Show Habit Guide on Dashboard|Show Habit Guide/i})
      .first()
      .or(page.getByRole("heading", {name: /Budget Habit Guide/i}).first());
    await reopenBtn.waitFor({state: "visible", timeout: 10000}).catch(() => {});

    await beat("10-reopen-help", {
      locator: reopenBtn,
      title: "Always findable again",
      body: "If Maya dismissed the tips, Help → Budget Habit Guide brings them back — including Show Habit Guide on Dashboard.",
      tip: "Also linked from the sidebar under Wizards.",
      dwellMs: 7500,
      cardSide: "bottom-right",
    });

    total = Math.max(total, i);
    await clearHighlight(page);
  } catch (err) {
    console.error(`  recording error: ${err.message}`);
    missed.push(`error:${err.message.slice(0, 120)}`);
    await page
      .screenshot({
        path: path.join(framesDir, `error-${Date.now()}.png`),
        fullPage: true,
      })
      .catch(() => {});
  }

  const videoPath = await finalizeVideo(page, context, browser, dest);
  console.log(`\nWrote ${videoPath}`);
  console.log(`Frames: ${framesDir}`);
  if (missed.length) console.warn(`Missed: ${missed.join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
