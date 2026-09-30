import { chromium } from "playwright";

const base="https://cpl.clintware.com";
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
let page;
try{
  page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(base,{waitUntil:"domcontentloaded",timeout:60000});

  await page.getByText("Customer Success CRM").first().waitFor({timeout:20000});
  const accounts=await page.locator(".account-row").count();
  if(accounts<13)throw new Error("Expected at least 13 CRM accounts, saw "+accounts);

  await page.locator(".account-row").first().click();
  await page.locator(".account-head h1").waitFor();
  await page.getByText("Next actions").waitFor();

  await page.click('[data-action="edit-account"]');
  await page.locator('.modal input[name="healthScore"]').fill("77");
  await page.locator('.modal select[name="health"]').selectOption({label:"Healthy"});
  await page.locator('.modal input[name="adoption"]').fill("82");
  await page.locator('.modal textarea[name="nextAction"]').fill("Confirm executive value proof");
  await page.locator('.modal button[type="submit"]').click();
  await page.getByText("Account updated").waitFor({timeout:15000});
  await page.getByText("77 / 100").waitFor();
  await page.getByText("Healthy").first().waitFor();

  await page.click('[data-action="add-task"]');
  await page.locator('.modal input[name="title"]').fill("Executive value proof follow-up");
  await page.locator('.modal input[name="owner"]').fill("CS Lead");
  await page.locator('.modal select[name="status"]').selectOption({label:"Open"});
  await page.locator('.modal button[type="submit"]').click();
  await page.getByText("Task added").waitFor({timeout:15000});
  await page.getByText("Executive value proof follow-up").waitFor();

  await page.click('[data-view="risks"]');
  await page.getByRole("heading",{name:"Risks"}).waitFor();
  await page.click('[data-action="add-risk"]');
  await page.locator('.modal input[name="title"]').fill("Synthetic browser-test risk");
  await page.locator('.modal textarea[name="impact"]').fill("Demonstrates a real persistent risk workflow.");
  await page.locator('.modal button[type="submit"]').click();
  await page.getByText("Risk added").waitFor({timeout:15000});
  await page.getByText("Synthetic browser-test risk").waitFor();

  await page.click('[data-view="people"]');
  await page.getByRole("heading",{name:"Stakeholders"}).waitFor();
  await page.click('[data-action="add-person"]');
  await page.locator('.modal input[name="name"]').fill("Morgan Test");
  await page.locator('.modal input[name="role"]').fill("Executive Sponsor");
  await page.locator('.modal button[type="submit"]').click();
  await page.getByText("Stakeholder added").waitFor({timeout:15000});
  await page.getByText("Morgan Test").waitFor();

  await page.click('[data-view="renewal"]');
  await page.getByRole("heading",{name:"Renewal",exact:true}).waitFor();
  await page.click('[data-action="edit-renewal"]');
  await page.locator('.modal select[name="renewalForecast"]').selectOption({label:"Commit"});
  await page.locator('.modal textarea[name="valueRealized"]').fill("Synthetic value proof approved for browser verification.");
  await page.locator('.modal button[type="submit"]').click();
  await page.getByText("Renewal updated").waitFor({timeout:15000});
  await page.getByText("Synthetic value proof approved for browser verification.").waitFor();

  await page.click('[data-view="notes"]');
  await page.getByRole("heading",{name:"Notes"}).waitFor();
  await page.click('[data-action="add-note"]');
  await page.locator('.modal input[name="title"]').fill("Browser verification note");
  await page.locator('.modal textarea[name="body"]').fill("Persistent CRM note created through the UI.");
  await page.locator('.modal button[type="submit"]').click();
  await page.getByText("Note added").waitFor({timeout:15000});
  await page.getByText("Browser verification note").waitFor();
  const persisted=await page.evaluate(async()=>{const r=await fetch("/api/state",{cache:"no-store"});return {status:r.status,body:await r.json(),mode:window.CW_ASTRO_LOCAL_MODE===true,stored:Object.keys(localStorage).some(k=>k.startsWith("cw-astro:cpl-cs-os:"))}});
  if(persisted.status!==200||!persisted.mode||persisted.body?.access?.storage!=="browser-local"||!persisted.stored)throw new Error("CPL browser-local persistence contract missing");
  if(persisted.body.customer?.portfolio?.healthScore!==77||persisted.body.customer?.portfolio?.adoption!==82)throw new Error("CPL account edits missing from browser-local state");
  if(!persisted.body.records.some(r=>r.type==="note"&&r.data?.title==="Browser verification note"))throw new Error("CPL note missing from browser-local state");
  await page.reload({waitUntil:"domcontentloaded"});
  await page.getByText("Customer Success CRM").first().waitFor({timeout:20000});
  const reloaded=await page.evaluate(async()=>{const r=await fetch("/api/state",{cache:"no-store"});return r.json()});
  if(reloaded.customer?.portfolio?.healthScore!==77||!reloaded.records.some(r=>r.type==="note"&&r.data?.title==="Browser verification note"))throw new Error("CPL browser-local changes did not survive reload");

  await page.click('[data-action="application"]');
  const drawer=page.locator("#applicationDrawer");
  await drawer.getByText("Why I built this").waitFor();
  const caseLink=drawer.locator('a[href="https://dplrcrm.clintware.com"]');
  if(await caseLink.count()!==1)throw new Error("Missing recent-case link in application drawer");
  await page.click('[data-action="close-application"]');

  await page.screenshot({path:"cpl-desktop-smoke.png",fullPage:true});

  await page.evaluate(()=>localStorage.setItem("cpl-crm-view","overview"));
  await page.setViewportSize({width:390,height:844});
  await page.goto(base,{waitUntil:"domcontentloaded",timeout:60000});
  await page.getByText("Customer Success CRM").first().waitFor();
  await page.getByText("Next actions").waitFor();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  if(overflow>3)throw new Error("Mobile horizontal overflow: "+overflow);
  await page.click('[data-action="application"]');
  if(!(await page.locator("#applicationDrawer").evaluate(el=>el.classList.contains("open"))))throw new Error("Mobile application drawer did not open");
  await page.screenshot({path:"cpl-mobile-smoke.png",fullPage:true});

  const reset=await page.evaluate(async()=>{const r=await fetch("/api/customers/reset-samples",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});return {ok:r.ok,status:r.status,body:await r.json()}});
  if(!reset.ok)throw new Error("Could not restore synthetic defaults after browser mutation: "+reset.status);
  console.log("CPL working CRM browser smoke passed");
}catch(err){
  if(page)await page.screenshot({path:"cpl-failure.png",fullPage:true}).catch(()=>{});
  throw err;
}finally{
  await browser.close();
}
