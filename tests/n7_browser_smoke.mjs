import { chromium } from "playwright";

const base = process.env.N7_URL || "https://n7demo.clintware.com/";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const consoleErrors = [];
const pageErrors = [];
page.on("console", msg => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
page.on("pageerror", err => pageErrors.push(String(err?.stack || err)));
const assert = (cond, message) => { if (!cond) throw new Error(message); };
try {
  const response = await page.goto(base, { waitUntil: "networkidle", timeout: 60000 });
  assert(response && response.ok(), "Homepage HTTP request failed");
  await page.waitForSelector("#app .top, #app .startup-error", { timeout: 30000 });
  if (await page.locator(".startup-error").count()) throw new Error("Startup error rendered: " + await page.locator(".startup-error").innerText());
  assert(await page.locator(".top").count() === 1, "CRM top navigation did not render");
  assert(await page.locator(".side").count() === 1, "CRM side navigation did not render");
  const bodyText = await page.locator("body").innerText();
  assert(bodyText.includes("No login required") || bodyText.includes("Guest"), "Guest/no-login state is not visible");
  assert(await page.locator('a[href="/auth/login"]').count() >= 1, "Optional OAuth sign-in link is missing");
  const tabs = ["customers","command","implementation","deployment","risks","handoff","raci","rollout","issues","triage","roi","adoption","meetings","renewal","kb","documents","accounts","live_prompt","live_assistant"];
  for (const tab of tabs) {
    const btn = page.locator('[data-tab="' + tab + '"]').first();
    assert(await btn.count() === 1, "Missing tab " + tab);
    await btn.click();
    await page.waitForTimeout(120);
    assert(await page.locator("main").count() === 1, "Main content missing after " + tab);
    const text = (await page.locator("main").innerText()).trim();
    assert(text.length > 20, "Tab " + tab + " rendered empty content");
    assert(await page.locator(".startup-error").count() === 0, "Startup error appeared while visiting " + tab);
  }
  await page.locator('[data-tab="customers"]').click();
  const before = await page.locator("[data-customer-open]").count();
  await page.locator("#newc").click();
  await page.waitForSelector(".overlay .modal");
  const nameField = page.locator(".overlay .modal input, .overlay .modal textarea").first();
  await nameField.fill("Browser Smoke Customer");
  const createBtn = page.locator(".overlay .modal button").filter({ hasText: /Save|Create/i }).first();
  await createBtn.click();
  await page.waitForTimeout(500);
  const after = await page.locator("[data-customer-open]").count();
  assert(after >= before, "Guest customer create flow failed");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".top", { timeout: 30000 });
  assert(await page.locator(".startup-error").count() === 0, "Startup failed after reload");
  await page.screenshot({ path: "n7-home-smoke.png", fullPage: true });
  if (pageErrors.length) throw new Error("Page errors:\n" + pageErrors.join("\n---\n"));
  if (consoleErrors.length) throw new Error("Console errors:\n" + consoleErrors.join("\n---\n"));
  console.log("N7 browser smoke passed.");
} catch (err) {
  try { await page.screenshot({ path: "n7-home-smoke.png", fullPage: true }); } catch {}
  console.error("N7 browser smoke failure:", err);
  throw err;
} finally {
  await browser.close();
}
