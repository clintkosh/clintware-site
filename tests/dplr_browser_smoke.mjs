import { chromium } from "playwright";

const base = process.env.DPLR_URL || "https://dplcrm.clintware.com/";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const consoleErrors = [];
const pageErrors = [];
page.on("console", msg => { if (msg.type() === "error") consoleErrors.push(msg.text()); });
page.on("pageerror", err => pageErrors.push(String(err?.stack || err)));
const assert = (cond, message) => { if (!cond) throw new Error(message); };

async function waitStable() {
  await page.waitForSelector(".dplr-appbar", { timeout: 30000 });
  await page.waitForTimeout(220);
  assert(await page.locator(".startup-error").count() === 0, "Startup error is visible");
}

async function assertNoHorizontalOverflow(label) {
  const overflow = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  assert(overflow.sw <= overflow.cw + 2, `${label} horizontal overflow: ${overflow.sw} > ${overflow.cw}`);
}

try {
  const response = await page.goto(base, { waitUntil: "networkidle", timeout: 60000 });
  assert(response && response.ok(), "DPLR homepage HTTP request failed");
  await waitStable();

  assert(await page.locator('link[href="/dplr-ui.css"]').count() === 1, "DPLR UI stylesheet is missing");
  assert(await page.locator('script[src="/dplr-shell.js"]').count() === 1, "DPLR shell script is missing");
  assert(await page.locator('script[src="/dplr-prep.js"]').count() === 1, "DPLR call-prep module is missing");
  assert(await page.locator('script[src="/dplr-enrich.js"]').count() === 1, "DPLR enrichment module is missing");
  assert(await page.locator('link[href*="doppel-brand.css"]').count() === 0, "Old marketing stylesheet leaked into DPLR");
  assert(await page.locator('script[src*="doppel-polish.js"]').count() === 0, "Old marketing shell leaked into DPLR");
  assert(await page.locator(".top").count() === 0, "Legacy topbar is visible instead of DPLR shell");
  assert(await page.locator(".dplr-portfolio-grid").count() === 1, "N7-style portfolio grid did not render");
  assert(await page.locator("[data-customer-open]").count() === 10, "Expected curated ten-account dataset");
  assert(await page.locator('[data-portfolio-layout="list"]').count() === 1, "Customer portfolio should default to list view");
  assert(await page.locator('[data-portfolio-view="list"].active').count() === 1, "List toggle should be active by default");
  await page.locator('[data-portfolio-view="tiles"]').click();
  await page.waitForTimeout(120);
  assert(await page.locator('[data-portfolio-layout="tiles"]').count() === 1, "Tiles view did not activate");
  assert(await page.locator('[data-portfolio-view="tiles"].active').count() === 1, "Tiles toggle did not become active");
  await page.locator('[data-portfolio-view="list"]').click();
  await page.waitForTimeout(120);
  assert(await page.locator('[data-portfolio-layout="list"]').count() === 1, "List view did not restore");
  const firstText = await page.locator("main").innerText();
  assert(firstText.includes("Browser-persistent"), "No-login browser persistence state is not visible");
  assert(await page.locator('a[href="/auth/login"]').count() === 0, "SSO sign-in remains visible");
  assert(await page.locator('form[action="/auth/logout"]').count() === 0, "SSO sign-out remains visible");
  const loginProbe = await page.request.get(new URL("/auth/login", base).toString(), { maxRedirects: 0 });
  assert(loginProbe.status() === 404, "DPLR auth login route should be disabled");
  const me = await (await page.request.get(new URL("/me", base).toString())).json();
  assert(me.authenticated === false && me.persistence === "browser-persistent", "DPLR /me is not explicitly no-login browser-persistent");

  // Theme controls exist in every view through the persistent app bar.
  await page.locator(".dplr-more summary").click();
  await page.locator("#theme").selectOption("dark");
  assert(await page.evaluate(() => document.documentElement.dataset.theme) === "dark", "Dark mode did not apply");
  await page.locator("#theme").selectOption("light");
  assert(await page.evaluate(() => document.documentElement.dataset.theme) === "light", "Light mode did not apply");

  // Open the golden account, then traverse every real functional module plus the role operating model.
  await page.locator("[data-customer-open]").first().click();
  await waitStable();
  const tabs = ["command","prep","live_prompt","live_assistant","triage","risks","handoff","implementation","deployment","issues","raci","rollout","operating_model","adoption","kb","roi","meetings","renewal","documents","accounts"];
  for (const tab of tabs) {
    const btn = page.locator('[data-tab="' + tab + '"]').first();
    assert(await btn.count() === 1, "Missing tab " + tab);
    await btn.click();
    await page.waitForTimeout(160);
    assert(await page.locator(".dplr-main").count() === 1, "Main workspace missing after " + tab);
    const text = (await page.locator(".dplr-main").innerText()).trim();
    assert(text.length > 35, "Tab " + tab + " rendered too little content");
    assert(await page.locator("#theme").count() === 1, "Theme control missing on " + tab);
    assert(await page.locator('a[href="/auth/login"]').count() === 0, "Sign-in surfaced on tab " + tab);
  }

  // Call preparation is a real editable workflow with evidence terminology, issue cards, and official training sources.
  await page.locator('[data-tab="prep"]').first().click();
  await page.waitForTimeout(260);
  const prepViewText = await page.locator(".dplr-main").innerText();
  for (const required of ["Call Preparation","Issue-specific preparation cards","Common technical language","Evidence quality gate","Support graduation gate","Official training + product refresh","SAML assertion","429 / Retry-After","Webhook acknowledgement","Schema / field mapping","MTTD / MTTR"]) {
    assert(prepViewText.includes(required), "Preparation view missing: " + required);
  }
  assert(await page.locator(".dplr-prep-flow article").count() === 6, "Preparation flow is incomplete");
  assert(await page.locator(".dplr-tech-grid article").count() >= 20, "Training, issue, and technology refresh cards are incomplete");
  assert(await page.locator('a[href*="/videos/doppel-platform-overview"]').count() === 1, "Doppel Platform Overview training link missing");
  assert(await page.locator('a[href*="/docs/doppel-okta-setup-instructions"]').count() === 1, "Doppel Okta documentation link missing");
  assert(await page.locator('a[href*="/docs/jira-integration"]').count() === 1, "Doppel Jira documentation link missing");
  assert(await page.locator('a[href*="developer.okta.com/docs/concepts/sso-overview"]').count() === 1, "Okta SSO official training link missing");
  assert(await page.locator('a[href*="help.splunk.com/en/splunk-enterprise/get-started"]').count() === 1, "Splunk official training link missing");
  assert(await page.locator('a[href*="learning.postman.com/docs/getting-started/quick-start"]').count() === 1, "Postman official training link missing");
  await page.locator("[data-tech-guide]").first().click();
  await page.waitForSelector(".overlay .modal");
  assert((await page.locator(".overlay .modal").innerText()).includes("Preparation aid"), "Technology reminder modal did not open");
  await page.locator(".overlay [data-close]").click();

  const prepBefore = await page.locator('[data-row-edit]').count();
  await page.locator("#prep-generate").click();
  await page.waitForSelector(".overlay .modal");
  assert((await page.locator(".overlay .modal").innerText()).includes("Edit call prep"), "Generated prep did not open as an editable modular record");
  await page.locator(".overlay [data-close]").click();
  await page.waitForTimeout(180);
  assert(await page.locator('[data-row-edit]').count() >= prepBefore + 1, "Generated prep did not persist");

  await page.locator("#email-kind").selectOption("post_call");
  await page.locator("#email-generate").click();
  await page.waitForSelector(".overlay .modal");
  assert((await page.locator(".overlay .modal").innerText()).includes("Edit email draft"), "Email generator did not create an editable draft");
  assert((await page.locator('[data-f="body"]').inputValue()).includes("Thanks for the time"), "Default post-call email body was not generated");
  await page.locator(".overlay [data-close]").click();
  await page.waitForTimeout(180);

  // Direct row click must reopen a modular record for editing.
  await page.locator('[data-row-edit]').first().click();
  await page.waitForSelector(".overlay .modal");
  assert((await page.locator(".overlay .modal").innerText()).match(/Edit (call prep|email draft)/), "Clickable modular record did not open editor");
  await page.locator(".overlay [data-close]").click();

  const prepText = await page.evaluate(() => window.DPLRPrep?.prepText?.() || "");
  for (const required of ["TECHNOLOGY QUICK REMINDERS","LIVE ASSIST","ISSUE-SPECIFIC PREPARATION","COMMON TECHNICAL LANGUAGE","EVIDENCE QUALITY GATE","SUPPORT GRADUATION GATE","OFFICIAL TRAINING / PRODUCT REFRESH","Known-good control","First point of divergence","Bounded specialist ask","Webhook acknowledgement","Postman Quick Start"]) {
    assert(prepText.includes(required), "Printable call-prep material missing: " + required);
  }

  // Rich default scenario: verify Ironwood opens with populated prep, people, work, and active investigation data.
  await page.locator('[data-tab="customers"]').first().click();
  await page.locator("#dplr-search").fill("Ironwood Bank");
  await page.locator("#dplr-search").press("Enter");
  await page.waitForTimeout(500);
  assert((await page.locator(".dplr-right").innerText()).includes("Ironwood Bank"), "Ironwood Bank default scenario did not route");
  assert((await page.locator(".dplr-right").innerText()).includes("2 stakeholders"), "Ironwood stakeholders were not populated");
  await page.locator('[data-tab="prep"]').first().click();
  await page.waitForTimeout(250);
  assert((await page.locator(".dplr-main").innerText()).includes("Default technical review prep"), "Default sample call prep was not populated");
  await page.locator('[data-tab="triage"]').first().click();
  await page.waitForTimeout(220);
  const triageText = await page.locator(".dplr-main").innerText();
  assert(triageText.includes("Webhook retry duplicates one takedown workflow action"), "Ironwood real-world incident sample is missing");
  await page.locator('[data-tab="issues"]').first().click();
  await page.waitForTimeout(220);
  assert((await page.locator(".dplr-main").innerText()).includes("Severity differs between platform view and raw API payload"), "Ironwood engineering handoff sample is missing");

  // Guest customer create flow should enter the selected customer's command center.
  await page.locator('[data-tab="customers"]').first().click();
  await page.locator("#newc").click();
  await page.waitForSelector(".overlay .modal");
  await page.locator("#n").fill("Browser Smoke Customer");
  await page.locator("#i").fill("Synthetic browser QA");
  await page.locator("#go").click();
  await page.waitForTimeout(500);
  await waitStable();
  assert(await page.locator(".dplr-right").count() === 1, "Created customer did not enter customer workspace");
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

  // Mobile pass 1: portfolio is intentionally full-width and has no customer left rail.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await waitStable();
  assert(await page.locator(".dplr-portfolio-grid").count() === 1, "Mobile portfolio did not render");
  assert(await page.locator(".dplr-primary").count() === 1, "Mobile primary navigation is missing");
  assert(await page.locator('a[href="/auth/login"]').count() === 0, "Mobile sign-in should not be visible");
  await assertNoHorizontalOverflow("Mobile portfolio");

  // Mobile pass 2: a selected customer exposes the responsive horizontal workspace navigation.
  await page.locator("[data-customer-open]").first().click();
  await waitStable();
  assert(await page.locator(".dplr-left").count() === 1, "Responsive customer navigation is missing");
  assert(await page.locator(".dplr-left nav [data-tab]").count() >= 12, "Responsive customer navigation is incomplete");
  await assertNoHorizontalOverflow("Mobile customer workspace");
  await page.screenshot({ path: "dplr-mobile-smoke.png", fullPage: true });

  if (pageErrors.length) throw new Error("Page errors:\n" + pageErrors.join("\n---\n"));
  if (consoleErrors.length) throw new Error("Console errors:\n" + consoleErrors.join("\n---\n"));
  console.log("DPLR browser smoke passed: ten defaults, fully disabled sign-in, browser persistence, themes, populated technical scenarios, rich call prep, common terminology, official training, modular editing, create/stakeholder/search, mobile navigation, and overflow.");
} catch (err) {
  try { await page.screenshot({ path: "dplr-failure.png", fullPage: true }); } catch {}
  console.error("DPLR browser smoke failure:", err);
  throw err;
} finally {
  await browser.close();
}
