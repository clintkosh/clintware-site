import { chromium } from "playwright";

const base = process.env.DPLR_URL || "https://dplrcrm.clintware.com/";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const consoleErrors = [];
const pageErrors = [];
page.on("console", msg => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
page.on("pageerror", err => pageErrors.push(String(err?.stack || err)));
const assert = (cond, message) => { if (!cond) throw new Error(message); };

async function waitStable() {
  await page.waitForSelector(".dplr-appbar", { timeout: 30000 });
  await page.waitForTimeout(160);
  assert(await page.locator(".startup-error").count() === 0, "Startup error is visible");
}

try {
  const response = await page.goto(base, { waitUntil: "networkidle", timeout: 60000 });
  assert(response && response.ok(), "DPLR homepage HTTP request failed");
  await waitStable();

  assert(await page.locator('link[href="/dplr-ui.css"]').count() === 1, "DPLR UI stylesheet is missing");
  assert(await page.locator('script[src="/dplr-shell.js"]').count() === 1, "DPLR shell script is missing");
  assert(await page.locator('link[href*="doppel-brand.css"]').count() === 0, "Old marketing stylesheet leaked into DPLR");
  assert(await page.locator('script[src*="doppel-polish.js"]').count() === 0, "Old marketing shell leaked into DPLR");
  assert(await page.locator(".top").count() === 0, "Legacy topbar is visible instead of DPLR shell");
  assert(await page.locator(".dplr-portfolio-grid").count() === 1, "N7-style portfolio grid did not render");
  assert(await page.locator("[data-customer-open]").count() === 7, "Expected curated seven-account dataset");
  const firstText = await page.locator("main").innerText();
  assert(firstText.includes("Guest session") || firstText.includes("SSO durable"), "Retention state is not visible");

  // Theme controls exist in every view through the persistent app bar.
  await page.locator(".dplr-more summary").click();
  await page.locator("#theme").selectOption("dark");
  assert(await page.evaluate(() => document.documentElement.dataset.theme) === "dark", "Dark mode did not apply");
  await page.locator("#theme").selectOption("light");
  assert(await page.evaluate(() => document.documentElement.dataset.theme) === "light", "Light mode did not apply");

  // Open the golden account, then traverse every real functional module plus the role operating model.
  await page.locator("[data-customer-open]").first().click();
  await waitStable();
  const tabs = ["command","live_prompt","live_assistant","triage","risks","handoff","implementation","deployment","issues","raci","rollout","operating_model","adoption","kb","roi","meetings","renewal","documents","accounts"];
  for (const tab of tabs) {
    const btn = page.locator('[data-tab="' + tab + '"]').first();
    assert(await btn.count() === 1, "Missing tab " + tab);
    await btn.click();
    await page.waitForTimeout(130);
    assert(await page.locator(".dplr-main").count() === 1, "Main workspace missing after " + tab);
    const text = (await page.locator(".dplr-main").innerText()).trim();
    assert(text.length > 35, "Tab " + tab + " rendered too little content");
    assert(await page.locator("#theme").count() === 1, "Theme control missing on " + tab);
  }

  // Guest customer create flow.
  await page.locator('[data-tab="customers"]').first().click();
  await page.locator("#newc").click();
  await page.waitForSelector(".overlay .modal");
  await page.locator("#n").fill("Browser Smoke Customer");
  await page.locator("#i").fill("Synthetic browser QA");
  await page.locator("#go").click();
  await page.waitForTimeout(500);
  await waitStable();
  assert((await page.locator(".dplr-right").innerText()).includes("Browser Smoke Customer"), "Created customer did not become selected");

  // First-class stakeholder CRUD from the persistent right context rail.
  await page.locator('[data-add="stakeholder"]').first().click();
  await page.waitForSelector(".overlay .modal");
  await page.locator('[data-f="name"]').fill("Browser QA Stakeholder");
  await page.locator('[data-f="role"]').fill("Security Operations Lead");
  await page.locator('[data-f="status"]').fill("Active");
  await page.locator("#save").click();
  await page.waitForTimeout(500);
  assert((await page.locator(".dplr-right").innerText()).includes("1 stakeholders"), "Stakeholder save did not refresh account context");

  // Search routes to a real customer.
  await page.locator('[data-tab="customers"]').first().click();
  await page.locator("#dplr-search").fill("ACME GLOBAL");
  await page.locator("#dplr-search").press("Enter");
  await page.waitForTimeout(450);
  assert((await page.locator(".dplr-right").innerText()).includes("ACME GLOBAL"), "Customer search did not route to ACME GLOBAL");

  await page.screenshot({ path: "dplr-desktop-smoke.png", fullPage: true });

  // Mobile usability and overflow pass.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await waitStable();
  const overflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  assert(overflow.sw <= overflow.cw + 2, `Mobile horizontal overflow: ${overflow.sw} > ${overflow.cw}`);
  assert(await page.locator(".dplr-left").count() === 1, "Responsive navigation is missing");
  await page.screenshot({ path: "dplr-mobile-smoke.png", fullPage: true });

  if (pageErrors.length) throw new Error("Page errors:\n" + pageErrors.join("\n---\n"));
  if (consoleErrors.length) throw new Error("Console errors:\n" + consoleErrors.join("\n---\n"));
  console.log("DPLR browser smoke passed: desktop modules, theme, create, stakeholder, search, and mobile overflow.");
} catch (err) {
  try { await page.screenshot({ path: "dplr-failure.png", fullPage: true }); } catch {}
  console.error("DPLR browser smoke failure:", err);
  throw err;
} finally {
  await browser.close();
}
