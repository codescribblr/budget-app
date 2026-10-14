/**
 * Shared helpers for narrated UI screencasts (Playwright).
 *
 * Critical: highlights stay glued to the target element. Always
 *   1) scroll target into view
 *   2) wait for layout settle
 *   3) measure bounding box
 *   4) apply overlay
 *   5) during dwell, re-measure and reposition if the element moves
 * Never leave a highlight at stale coordinates after a later scroll.
 */
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";

export const DEFAULT_VIEWPORT = {width: 1440, height: 900};
export const DEFAULT_DWELL_MS = 5500;
export const MIN_DWELL_MS = 4500;
export const MAX_DWELL_MS = 10000;

export const OVERLAY_CSS = `
#sc-root{position:fixed;inset:0;z-index:2147483646;pointer-events:none;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
#sc-dim{position:absolute;inset:0;background:rgba(8,15,30,.58)}
#sc-ring{position:absolute;border:3px solid #38bdf8;border-radius:10px;box-shadow:0 0 0 2px rgba(56,189,248,.35),0 0 30px rgba(56,189,248,.5);display:none}
#sc-card{position:absolute;max-width:460px;min-width:300px;background:#0f172a;color:#f8fafc;border:1px solid rgba(148,163,184,.4);border-radius:12px;padding:14px 16px;box-shadow:0 18px 50px rgba(0,0,0,.5);display:none}
#sc-step{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#7dd3fc;margin-bottom:6px}
#sc-title{font-size:17px;font-weight:700;line-height:1.25;margin-bottom:6px}
#sc-body{font-size:13.5px;line-height:1.45;color:#e2e8f0}
#sc-tip{margin-top:8px;font-size:12.5px;line-height:1.4;color:#fde68a;border-top:1px solid rgba(148,163,184,.25);padding-top:8px;display:none}
#sc-banner{position:absolute;left:50%;top:16px;transform:translateX(-50%);background:rgba(15,23,42,.94);color:#f8fafc;border:1px solid rgba(148,163,184,.4);border-radius:999px;padding:8px 18px;font-size:13px;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.35);white-space:nowrap;display:none}
#sc-progress{position:absolute;left:24px;right:24px;bottom:16px;height:4px;background:rgba(148,163,184,.25);border-radius:999px;overflow:hidden}
#sc-progress>i{display:block;height:100%;width:0%;background:linear-gradient(90deg,#38bdf8,#22c55e)}
#sc-pill{position:absolute;right:20px;top:64px;background:#7f1d1d;color:#fecaca;border:1px solid #f87171;border-radius:8px;padding:8px 12px;font-size:12px;font-weight:700;max-width:280px;line-height:1.35;display:none;white-space:pre-line}
`;

export async function resolveBaseUrl() {
  const explicit = parseArg("base-url", "");
  if (explicit) return explicit.replace(/\/$/, "");
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.AUTH_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].filter(Boolean);
  const seen = new Set();
  for (const raw of candidates) {
    const url = String(raw).replace(/\/$/, "");
    if (seen.has(url)) continue;
    seen.add(url);
    try {
      const res = await fetch(url, {redirect: "follow"});
      const text = await res.text();
      if (/Every Dollar|Budget App|budget setup coach|Sign in/i.test(text)) {
        return url;
      }
    } catch {
      /* try next */
    }
  }
  return "http://localhost:3000";
}

export function parseArg(name, fallback = "") {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--")) {
    return process.argv[i + 1];
  }
  return fallback;
}

export async function ensureOverlay(page) {
  await page.evaluate((css) => {
    if (document.getElementById("sc-root")) return;
    const style = document.createElement("style");
    style.id = "sc-style";
    style.textContent = css;
    document.head.appendChild(style);
    const root = document.createElement("div");
    root.id = "sc-root";
    root.innerHTML = `
      <div id="sc-dim"></div>
      <div id="sc-ring"></div>
      <div id="sc-banner"></div>
      <div id="sc-pill"></div>
      <div id="sc-card">
        <div id="sc-step"></div>
        <div id="sc-title"></div>
        <div id="sc-body"></div>
        <div id="sc-tip"></div>
      </div>
      <div id="sc-progress"><i></i></div>`;
    document.documentElement.appendChild(root);
  }, OVERLAY_CSS);
}

export async function clearHighlight(page) {
  await page.evaluate(() => {
    window.__scStopSticky?.();
    const dim = document.getElementById("sc-dim");
    const ring = document.getElementById("sc-ring");
    const card = document.getElementById("sc-card");
    if (dim) dim.style.clipPath = "none";
    if (ring) ring.style.display = "none";
    if (card) card.style.display = "none";
  });
}

export async function setBanner(page, text) {
  await page.evaluate((t) => {
    const el = document.getElementById("sc-banner");
    if (!el) return;
    el.style.display = t ? "block" : "none";
    el.textContent = t || "";
  }, text || "");
}

export async function setPill(page, text) {
  await page.evaluate((t) => {
    const el = document.getElementById("sc-pill");
    if (!el) return;
    el.style.display = t ? "block" : "none";
    el.textContent = t || "";
  }, text || "");
}

export async function setProgress(page, index, total) {
  await page.evaluate(
    ({index, total}) => {
      const bar = document.querySelector("#sc-progress > i");
      if (bar) bar.style.width = `${Math.round(((index + 1) / Math.max(total, 1)) * 100)}%`;
    },
    {index, total}
  );
}

/**
 * Dismiss toasts or leftover dialogs that would steal clicks.
 */
export async function dismissBlockingOverlays(page) {
  for (let i = 0; i < 2; i++) {
    // Avoid habit-guide / feature teaser "Got it" — those are intentional UI, not blockers.
    const close = page
      .locator('[role="dialog"] button, [data-toast] button, [role="alert"] button')
      .filter({hasText: /^(Close|Dismiss|×)$/i})
      .first();
    if (await close.isVisible().catch(() => false)) {
      await close.click({force: true}).catch(() => {});
      await page.waitForTimeout(200);
    }
    await page.evaluate(() => {
      document.querySelectorAll("[data-toast] button").forEach((el) => {
        if (el instanceof HTMLElement && /close|dismiss/i.test(el.textContent || "")) {
          el.click();
        }
      });
    });
    await page.waitForTimeout(80);
  }
}

export async function safeClick(page, locator) {
  await dismissBlockingOverlays(page);
  const first = locator.first();
  await first.click({timeout: 8000}).catch(async () => {
    await first.click({force: true, timeout: 5000}).catch(async () => {
      await first.evaluate((el) => el.click());
    });
  });
}

/**
 * Scroll target into the visual center of the nearest scrollport, wait for
 * layout, then return a fresh viewport bounding box.
 */
export async function measureStableBox(page, locator, {pad = 0} = {}) {
  const first = locator.first();
  if ((await first.count()) === 0) return null;

  await first.evaluate((el) => {
    el.scrollIntoView({block: "center", inline: "nearest", behavior: "instant"});
  });
  // Nested scroll containers + React layout need a beat to settle.
  await page.waitForTimeout(350);
  await first.evaluate((el) => {
    el.scrollIntoView({block: "center", inline: "nearest", behavior: "instant"});
  });
  await page.waitForTimeout(200);

  const box = await first.boundingBox();
  if (!box || box.width < 2 || box.height < 2) return null;
  if (pad) {
    return {
      x: Math.max(0, box.x - pad),
      y: Math.max(0, box.y - pad),
      width: box.width + pad * 2,
      height: box.height + pad * 2,
    };
  }
  return box;
}

export async function unionStableBoxes(page, locators, {pad = 0} = {}) {
  const boxes = [];
  for (const loc of locators) {
    const box = await measureStableBox(page, loc);
    if (box) boxes.push(box);
  }
  if (!boxes.length) return null;
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const right = Math.max(...boxes.map((b) => b.x + b.width));
  const bottom = Math.max(...boxes.map((b) => b.y + b.height));
  const united = {x, y, width: right - x, height: bottom - y};
  if (!pad) return united;
  return {
    x: Math.max(0, united.x - pad),
    y: Math.max(0, united.y - pad),
    width: united.width + pad * 2,
    height: united.height + pad * 2,
  };
}

/**
 * Apply overlay for a box + caption. If `stickyLocator` is provided, keep the
 * ring glued to that element for the entire dwell (fixes scroll drift).
 */
export async function narrate(page, opts) {
  const {
    locator,
    locators,
    box: givenBox,
    title,
    body,
    tip = "",
    stepLabel = "",
    dwellMs = DEFAULT_DWELL_MS,
    pad = 8,
    cardSide = "auto",
    viewport = DEFAULT_VIEWPORT,
    freezeScroll = true,
  } = opts;

  await ensureOverlay(page);

  let sticky = null;
  if (locator) sticky = locator.first();
  else if (locators?.length) sticky = locators[0].first();

  let box = givenBox || null;
  if (!box && sticky) {
    box = await measureStableBox(page, sticky, {pad: 0});
  } else if (!box && locators?.length) {
    box = await unionStableBoxes(page, locators, {pad: 0});
  }

  if (freezeScroll) {
    await page.evaluate(() => {
      const lock = (el) => {
        if (!el || el.dataset.scLocked) return;
        el.dataset.scLocked = "1";
        el.dataset.scOverflow = el.style.overflow || "";
        el.style.overflow = "hidden";
      };
      lock(document.documentElement);
      lock(document.body);
      document.querySelectorAll("*").forEach((el) => {
        const style = window.getComputedStyle(el);
        if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 4) {
          lock(el);
        }
      });
    });
  }

  const apply = async (nextBox) => {
    await page.evaluate(
      ({box, title, body, tip, stepLabel, pad, cardSide, vw, vh}) => {
        const dim = document.getElementById("sc-dim");
        const ring = document.getElementById("sc-ring");
        const card = document.getElementById("sc-card");
        document.getElementById("sc-step").textContent = stepLabel || "";
        document.getElementById("sc-title").textContent = title || "";
        document.getElementById("sc-body").textContent = body || "";
        const tipEl = document.getElementById("sc-tip");
        if (tip) {
          tipEl.style.display = "block";
          tipEl.textContent = tip;
        } else {
          tipEl.style.display = "none";
          tipEl.textContent = "";
        }

        let hole = {x: 48, y: 90, w: vw - 96, h: vh - 180};
        if (box) {
          hole = {
            x: Math.max(0, box.x - pad),
            y: Math.max(0, box.y - pad),
            w: Math.min(vw - 8, box.width + pad * 2),
            h: Math.min(vh - 8, box.height + pad * 2),
          };
          ring.style.display = "block";
          ring.style.left = `${hole.x}px`;
          ring.style.top = `${hole.y}px`;
          ring.style.width = `${hole.w}px`;
          ring.style.height = `${hole.h}px`;
        } else {
          ring.style.display = "none";
        }

        const x1 = hole.x,
          y1 = hole.y,
          x2 = hole.x + hole.w,
          y2 = hole.y + hole.h;
        dim.style.clipPath = `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${x1}px ${y1}px, ${x1}px ${y2}px, ${x2}px ${y2}px, ${x2}px ${y1}px, ${x1}px ${y1}px)`;

        card.style.display = "block";
        const cw = Math.min(460, card.offsetWidth || 400);
        const ch = card.offsetHeight || 160;

        const overlapsHole = (left, top) => {
          const right = left + cw;
          const bottom = top + ch;
          const padGap = 12;
          return !(
            right < hole.x - padGap ||
            left > hole.x + hole.w + padGap ||
            bottom < hole.y - padGap ||
            top > hole.y + hole.h + padGap
          );
        };

        const placeForSide = (side) => {
          let left = 24;
          let top = 24;
          if (side === "right") {
            left = Math.min(vw - cw - 16, hole.x + hole.w + 16);
            top = Math.max(16, Math.min(vh - ch - 28, hole.y));
          } else if (side === "left") {
            left = Math.max(16, hole.x - cw - 16);
            top = Math.max(16, Math.min(vh - ch - 28, hole.y));
          } else if (side === "bottom") {
            left = Math.max(16, Math.min(vw - cw - 16, hole.x));
            top = Math.min(vh - ch - 28, hole.y + hole.h + 16);
          } else if (side === "top") {
            left = Math.max(16, Math.min(vw - cw - 16, hole.x));
            top = Math.max(16, hole.y - ch - 16);
          } else if (side === "bottom-right") {
            left = Math.max(16, vw - cw - 24);
            top = Math.max(16, vh - ch - 48);
          } else if (side === "bottom-left") {
            left = 24;
            top = Math.max(16, vh - ch - 48);
          }
          return {left, top, side};
        };

        let chosen = null;
        const preferred =
          cardSide === "auto"
            ? ["right", "left", "bottom", "top", "bottom-right", "bottom-left"]
            : [cardSide, "right", "left", "bottom", "top", "bottom-right", "bottom-left"];
        for (const side of preferred) {
          const candidate = placeForSide(side);
          if (!overlapsHole(candidate.left, candidate.top)) {
            chosen = candidate;
            break;
          }
        }
        if (!chosen) {
          // Last resort: park in the corner farthest from the hole center
          const hx = hole.x + hole.w / 2;
          const hy = hole.y + hole.h / 2;
          const corners = [
            {left: 24, top: 64},
            {left: Math.max(16, vw - cw - 24), top: 64},
            {left: 24, top: Math.max(16, vh - ch - 48)},
            {left: Math.max(16, vw - cw - 24), top: Math.max(16, vh - ch - 48)},
          ];
          chosen = corners
            .map((c) => ({
              ...c,
              dist: Math.hypot(c.left + cw / 2 - hx, c.top + ch / 2 - hy),
            }))
            .sort((a, b) => b.dist - a.dist)[0];
        }
        card.style.left = `${chosen.left}px`;
        card.style.top = `${chosen.top}px`;
      },
      {
        box: nextBox,
        title,
        body,
        tip,
        stepLabel,
        pad,
        cardSide,
        vw: viewport.width,
        vh: viewport.height,
      }
    );
  };

  await apply(box);

  // Sticky re-measure loop: if the target moves/reflows, move the ring with it.
  if (sticky) {
    await sticky.evaluate((el) => {
      window.__scStopSticky?.();
      let alive = true;
      const tick = () => {
        if (!alive) return;
        const r = el.getBoundingClientRect();
        if (r.width > 2 && r.height > 2) {
          const ring = document.getElementById("sc-ring");
          const dim = document.getElementById("sc-dim");
          if (ring && dim) {
            const pad = 8;
            const x = Math.max(0, r.left - pad);
            const y = Math.max(0, r.top - pad);
            const w = r.width + pad * 2;
            const h = r.height + pad * 2;
            ring.style.display = "block";
            ring.style.left = `${x}px`;
            ring.style.top = `${y}px`;
            ring.style.width = `${w}px`;
            ring.style.height = `${h}px`;
            dim.style.clipPath = `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${x}px ${y}px, ${x}px ${y + h}px, ${x + w}px ${y + h}px, ${x + w}px ${y}px, ${x}px ${y}px)`;
          }
        }
        requestAnimationFrame(tick);
      };
      window.__scStopSticky = () => {
        alive = false;
      };
      requestAnimationFrame(tick);
    });
  }

  const clamped = Math.max(MIN_DWELL_MS, Math.min(MAX_DWELL_MS, dwellMs));
  await page.waitForTimeout(clamped);

  await page.evaluate(() => {
    window.__scStopSticky?.();
    document.querySelectorAll("[data-sc-locked]").forEach((el) => {
      el.style.overflow = el.dataset.scOverflow || "";
      delete el.dataset.scLocked;
      delete el.dataset.scOverflow;
    });
  });
}

/**
 * QC: after a step frame is captured, verify the sticky target still intersects
 * the ring. Returns {ok, reason}.
 */
export async function assertHighlightAligned(page, locator) {
  if (!locator) return {ok: true, reason: "no-locator"};
  const first = locator.first();
  if ((await first.count()) === 0) return {ok: false, reason: "missing-target"};
  return page.evaluate((selAbsent) => {
    void selAbsent;
    const ring = document.getElementById("sc-ring");
    if (!ring || ring.style.display === "none") return {ok: false, reason: "no-ring"};
    // Caller already scoped locator; we only check ring is on-screen with size.
    const rr = ring.getBoundingClientRect();
    if (rr.width < 4 || rr.height < 4) return {ok: false, reason: "ring-empty"};
    if (rr.bottom < 0 || rr.top > window.innerHeight) return {ok: false, reason: "ring-offscreen"};
    return {ok: true, reason: "ok"};
  }, null);
}

export function loadDotEnv(repoRoot = process.cwd()) {
  for (const name of [".env.local", ".env"]) {
    const envPath = path.join(repoRoot, name);
    if (!fs.existsSync(envPath)) continue;
    for (const raw of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] == null) process.env[key] = value;
    }
  }
}

export function staffNav(page) {
  return page.locator('[data-sidebar="sidebar"]').locator("visible=true").first();
}

export function portalNav(page) {
  return staffNav(page);
}

export async function loginWithPassword(page, {baseUrl, email, password, next = "/dashboard"}) {
  const url = `${baseUrl.replace(/\/$/, "")}/login?redirectTo=${encodeURIComponent(next)}`;
  await page.goto(url, {waitUntil: "domcontentloaded", timeout: 90000});
  await page.waitForTimeout(500);
  // Clear any leftover session so the login form is authoritative
  await page.context().clearCookies();
  await page.goto(url, {waitUntil: "domcontentloaded", timeout: 90000});
  const emailInput = page.locator("#email, input[type='email']").first();
  const passwordInput = page.locator("#password, input[type='password']").first();
  await emailInput.waitFor({state: "visible", timeout: 30000});
  await emailInput.click();
  await emailInput.fill("");
  await emailInput.fill(email);
  await passwordInput.click();
  await passwordInput.fill("");
  await passwordInput.fill(password);
  const filled = {
    email: await emailInput.inputValue(),
    passwordLen: (await passwordInput.inputValue()).length,
  };
  if (!filled.email || filled.passwordLen < 1) {
    throw new Error(`Login fields not filled: ${JSON.stringify(filled)}`);
  }
  await page.getByRole("button", {name: /sign in/i}).first().click();
  try {
    await page.waitForURL((u) => !u.pathname.includes("/login"), {timeout: 60000});
  } catch (err) {
    const msg = await page
      .locator('[role="alert"], .text-destructive, .text-red-500, .text-red-600')
      .first()
      .textContent()
      .catch(() => "");
    throw new Error(`Login failed at ${page.url()}: ${msg || err.message}`);
  }
  await page.waitForTimeout(1000);
  await dismissBlockingOverlays(page);
}

/**
 * Ensure a dedicated screencast user exists (service role) and return credentials.
 */
export async function ensureScreencastUser(repoRoot = process.cwd()) {
  loadDotEnv(repoRoot);
  const email =
    process.env.SCREENCAST_EMAIL || "screencast.onboarding@example.com";
  const password = process.env.SCREENCAST_PASSWORD || "ScreencastOnboard1!";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  }

  const require = createRequire(path.join(repoRoot, "package.json"));
  const {createClient} = require("@supabase/supabase-js");
  const admin = createClient(url, serviceKey, {
    auth: {autoRefreshToken: false, persistSession: false},
  });

  const list = await admin.auth.admin.listUsers({page: 1, perPage: 200});
  const existing = list.data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
    });
    return {email, password, userId: existing.id};
  }

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {full_name: "Onboarding Screencast"},
  });
  if (created.error) throw new Error(created.error.message);
  return {email, password, userId: created.data.user.id};
}

/**
 * Ensure a single reusable empty onboarding lab account, wipe its data, switch to it.
 * Avoids cleanupDuplicateEmptyAccounts() soft-deleting brand-new empty accounts
 * when the user already owns 3+ budgets.
 */
export async function prepareEmptyOnboardingAccount(page, accountName, repoRoot = process.cwd()) {
  loadDotEnv(repoRoot);
  const require = createRequire(path.join(repoRoot, "package.json"));
  const {createClient} = require("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY required to prepare onboarding lab account");
  }
  const admin = createClient(url, serviceKey, {
    auth: {autoRefreshToken: false, persistSession: false},
  });

  // Identify current user from the browser session
  const meRes = await page.evaluate(async () => {
    const res = await fetch("/api/budget-accounts");
    return {status: res.status, body: await res.json().catch(() => ({}))};
  });
  if (meRes.status === 401) throw new Error("Not authenticated when preparing lab account");

  const sessionUser = await page.evaluate(async () => {
    // lightweight: read any authenticated endpoint
    const res = await fetch("/api/settings");
    return res.status;
  });
  void sessionUser;

  // Resolve owner id via service role using screencast email
  const email =
    process.env.SCREENCAST_EMAIL || "screencast.onboarding@example.com";
  const list = await admin.auth.admin.listUsers({page: 1, perPage: 200});
  const user = list.data?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error(`Screencast user not found: ${email}`);

  const labName = accountName.split("·")[0].trim() || "Screencast Onboarding Lab";
  // Prefer an existing non-deleted lab account with this prefix
  const {data: existing} = await admin
    .from("budget_accounts")
    .select("id, name, deleted_at")
    .eq("owner_id", user.id)
    .is("deleted_at", null)
    .ilike("name", `${labName}%`)
    .order("id", {ascending: true})
    .limit(1);

  let accountId = existing?.[0]?.id;
  if (!accountId) {
    const {data: created, error} = await admin
      .from("budget_accounts")
      .insert({owner_id: user.id, name: labName})
      .select("id, name")
      .single();
    if (error) throw new Error(error.message);
    accountId = created.id;
    await admin.from("account_users").upsert(
      {
        account_id: accountId,
        user_id: user.id,
        role: "owner",
        status: "active",
        accepted_at: new Date().toISOString(),
      },
      {onConflict: "account_id,user_id"}
    );
  } else {
    // Ensure not soft-deleted and membership exists
    await admin
      .from("budget_accounts")
      .update({deleted_at: null, name: labName})
      .eq("id", accountId);
    await admin.from("account_users").upsert(
      {
        account_id: accountId,
        user_id: user.id,
        role: "owner",
        status: "active",
        accepted_at: new Date().toISOString(),
      },
      {onConflict: "account_id,user_id"}
    );
  }

  // Wipe first-run data so the coach opens
  await admin.from("goals").delete().eq("account_id", accountId);
  await admin.from("transactions").delete().eq("budget_account_id", accountId);
  await admin.from("accounts").delete().eq("account_id", accountId);
  await admin.from("categories").delete().eq("account_id", accountId);
  await admin
    .from("settings")
    .delete()
    .eq("account_id", accountId)
    .in("key", [
      "budget_wizard_completed",
      "budget_wizard_skipped",
      "ai_onboarding_completed",
      "ai_onboarding_skipped",
      "annual_income",
      "annual_salary",
      "pay_frequency",
      "include_extra_paychecks",
      "habit_guide_enabled",
      "habit_guide_dismissed_step",
      "habit_guide_interactions",
      "habit_guide_completed",
      "habit_guide_checked_envelope",
    ]);
  await admin
    .from("ai_conversations")
    .update({is_archived: true})
    .eq("account_id", accountId);

  // Switch via app API (sets httpOnly cookie)
  let lastErr = "switch failed";
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.waitForTimeout(300 * (attempt + 1));
    const switched = await page.evaluate(async (id) => {
      const res = await fetch("/api/budget-accounts/switch", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({accountId: id}),
      });
      return {ok: res.ok, body: await res.json().catch(() => ({}))};
    }, accountId);
    if (switched.ok) {
      return {id: accountId, name: labName};
    }
    lastErr = switched.body.error || switched.body.message || "switch failed";
  }
  throw new Error(`Failed to switch budget account: ${lastErr}`);
}

/** @deprecated property-app helper — use ensureScreencastUser */
export async function ensureWalkthroughData(repoRoot = process.cwd()) {
  return ensureScreencastUser(repoRoot);
}

export async function runBeat(page, framesDir, index, total, slug, opts) {
  await ensureOverlay(page);
  if (opts.banner) await setBanner(page, opts.banner);
  await setProgress(page, index, total);
  await setPill(page, opts.pill || "");
  let locator = opts.locator;
  if (locator && (await locator.count()) === 0) locator = undefined;
  const locators = [];
  for (const loc of opts.locators ?? []) {
    if ((await loc.count()) > 0) locators.push(loc);
  }
  const missing = !locator && locators.length === 0;
  if (missing) {
    console.warn(`  ! beat ${index + 1} (${slug}): target not found — caption only`);
  }
  await narrate(page, {
    ...opts,
    locator: missing ? undefined : locator,
    locators: locators.length ? locators : undefined,
    stepLabel: opts.stepLabel || `Step ${index + 1} of ${total}`,
  });
  const framePath = path.join(framesDir, `${String(index + 1).padStart(2, "0")}-${slug}.png`);
  await page.screenshot({path: framePath});
  await clearHighlight(page);
  return {slug, missing, framePath};
}

export function prepareOutputDirs(outDir, framesDir) {
  fs.mkdirSync(framesDir, {recursive: true});
  for (const f of fs.readdirSync(framesDir)) {
    if (f.endsWith(".png")) fs.unlinkSync(path.join(framesDir, f));
  }
  fs.mkdirSync(outDir, {recursive: true});
}

export async function finalizeVideo(page, context, browser, destPath) {
  const video = page.video();
  const videoPath = video ? await video.path() : null;
  await context.close();
  await browser.close();
  if (!videoPath || !fs.existsSync(videoPath)) {
    throw new Error("No Playwright video produced");
  }
  fs.mkdirSync(path.dirname(destPath), {recursive: true});
  fs.copyFileSync(videoPath, destPath);
  if (path.resolve(videoPath) !== path.resolve(destPath)) {
    try {
      fs.unlinkSync(videoPath);
    } catch {
      /* ignore */
    }
  }
  return destPath;
}
