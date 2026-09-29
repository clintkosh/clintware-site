import fs from "node:fs/promises";
import { chromium } from "playwright";

const base=process.env.BM_URL||"https://bm.clintware.com/";
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1050}});
const consoleErrors=[],pageErrors=[];
page.on("console",m=>{if(m.type()==="error")consoleErrors.push(m.text())});
page.on("pageerror",e=>pageErrors.push(String(e?.stack||e)));
const assert=(x,m)=>{if(!x)throw new Error(m)};

async function waitApp(){
  await page.waitForSelector(".dplr-appbar",{timeout:30000});
  await page.waitForTimeout(200);
  assert(await page.locator(".startup-error").count()===0,"Startup error visible");
}
async function noOverflow(label){
  const x=await page.evaluate(()=>({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
  assert(x.sw<=x.cw+2,label+" horizontal overflow");
}

try{
  await page.addInitScript(()=>{if(!sessionStorage.getItem("__bm_test_initialized")){localStorage.clear();sessionStorage.clear();sessionStorage.setItem("__bm_test_initialized","1")}});
  const r=await page.goto(base,{waitUntil:"networkidle",timeout:60000});
  assert(r&&r.ok(),"Boom CRM homepage request failed");
  await waitApp();
  await page.waitForSelector(".bm-track-gate",{timeout:10000});
  assert(await page.locator(".bm-track-card").count()===12,"Expected exactly 12 launch tracks");
  assert(await page.locator('.bm-track-card[data-group="CSM"]').count()===6,"Expected six CSM tracks");
  assert(await page.locator('.bm-track-card[data-group="Support"]').count()===6,"Expected six Support tracks");
  const gateText=await page.locator(".bm-track-panel").innerText();
  assert(gateText.includes("not an official Boom product"),"Candidate/synthetic boundary missing");

  await page.locator('[data-bm-track="csm-onboarding"]').click();
  await page.waitForTimeout(300);
  assert(await page.locator(".bm-track-gate").count()===0,"Track gate did not close");
  assert((await page.locator(".bm-track-banner").innerText()).includes("Onboarding & Time-to-Value"),"CSM track banner missing");
  assert(await page.evaluate(()=>localStorage.getItem("bmActiveTrack"))==="csm-onboarding","CSM track preference not stored");

  const downloadPromise=page.waitForEvent("download");
  await page.locator("#bm-track-brief").click();
  const download=await downloadPromise;
  const p=await download.path();
  assert(p,"Track brief download path missing");
  const buf=await fs.readFile(p);
  assert(buf.subarray(0,4).toString()==="%PDF","Track brief is not a PDF");
  assert(buf.length>500,"Track brief PDF is unexpectedly small");

  await page.locator("#bm-switch-track").click();
  await page.waitForSelector(".bm-track-gate");
  await page.locator('[data-bm-track="support-command"]').click();
  await page.waitForTimeout(300);
  assert((await page.locator(".bm-track-banner").innerText()).includes("Support Command"),"Support track banner missing");
  assert(await page.evaluate(()=>localStorage.getItem("bmActiveTrack"))==="support-command","Support track preference not stored");

  const state=await (await page.request.get(new URL("/api/state",base).toString())).json();
  assert(state.customers.length===7,"Expected seven synthetic Boom sample accounts");
  assert(state.customer.name==="Pinnacle Residential Group","Golden Boom synthetic account missing");
  assert(state.customers.every(c=>!c.isPublicReference),"Boom sample set should not imply private/public customer facts");

  await page.locator('[data-tab="customers"]').first().click();
  await page.waitForTimeout(150);
  await page.locator("#dplr-search").fill("Pinnacle Residential Group");
  await page.locator("#dplr-search").press("Enter");
  await page.waitForTimeout(450);
  assert((await page.locator(".dplr-right").innerText()).includes("Pinnacle Residential Group"),"Shared customer context did not open");

  await page.locator('[data-add="stakeholder"]').first().click();
  await page.waitForSelector(".overlay .modal");
  await page.locator('[data-f="name"]').fill("BM Browser QA Stakeholder");
  await page.locator('[data-f="role"]').fill("Property Operations Lead");
  await page.locator('[data-f="status"]').fill("Active");
  await page.locator("#save").click();
  await page.waitForTimeout(450);
  assert((await page.locator(".dplr-right").innerText()).includes("4 stakeholders"),"Stakeholder did not persist into shared context");

  await page.locator("#bm-operating-model").click();
  await page.waitForTimeout(180);
  assert((await page.locator(".dplr-main").innerText()).includes("12 launch tracks"),"Dual-track operating model missing");
  assert(await page.locator('.dplr-main [data-bm-track]').count()===12,"Operating model does not expose all tracks");

  await page.screenshot({path:"bm-desktop-smoke.png",fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.reload({waitUntil:"networkidle"});
  await waitApp();
  await noOverflow("Mobile Boom CRM");
  assert(await page.locator("#bm-switch-track").count()===1,"Mobile track switcher missing");
  assert((await page.locator(".bm-track-banner").innerText()).includes("Support Command"),"Selected track did not survive reload");
  await page.screenshot({path:"bm-mobile-smoke.png",fullPage:true});

  if(pageErrors.length)throw new Error("Page errors:\n"+pageErrors.join("\n---\n"));
  if(consoleErrors.length)throw new Error("Console errors:\n"+consoleErrors.join("\n---\n"));
  console.log("BM browser smoke passed: 12-track chooser, 6+6 balance, CSM/Support switching, shared persisted customer context, real PDF brief, and mobile.");
}finally{
  await browser.close();
}
