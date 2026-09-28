import { chromium } from "playwright";
import fs from "node:fs";

const base="https://cpl.clintware.com";
const browser=await chromium.launch({headless:true});
let page;
try{
  page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(base,{waitUntil:"networkidle",timeout:60000});
  await page.getByText("CPL // CS OPERATING SYSTEM").first().waitFor({timeout:20000});
  await page.getByText("Customer Success Command Center").waitFor();
  const metrics=await page.locator(".metric").count();
  if(metrics<6)throw new Error("Expected command-center metrics");
  const narrative=page.locator("#applicationPanel");
  if(!(await narrative.isVisible()))throw new Error("Application narrative should be visible on desktop");
  const narrativeText=await narrative.innerText();
  for(const phrase of ["You asked for a zero-to-one builder","20–40 named accounts","dplrcrm.clintware.com"]){
    if(!narrativeText.includes(phrase))throw new Error("Missing narrative proof: "+phrase);
  }

  await page.click('[data-route="portfolio"]');
  await page.getByText("One operating view for every customer").waitFor();
  const portfolioRows=await page.locator("tbody tr[data-customer]").count();
  if(portfolioRows<12)throw new Error("Expected at least 12 synthetic accounts, saw "+portfolioRows);

  await page.locator("tbody tr[data-customer]").first().click();
  await page.getByText("Account records").waitFor();
  const accountCards=await page.locator(".record-card").count();
  if(accountCards<8)throw new Error("Expected rich selected-account records");

  const approve=page.locator('[data-action="approve"]').last();
  await approve.click();
  await page.getByText("Approved into the account audit record").waitFor({timeout:15000});
  await page.getByText("Human-approved next action").waitFor({timeout:15000});

  for(const r of ["health","renewal","playbooks","cadence","team","tooling","proof"]){
    await page.click('[data-route="'+r+'"]');
    await page.waitForTimeout(120);
  }
  await page.getByText("The operating system is the application").waitFor();
  await page.screenshot({path:"cpl-desktop-smoke.png",fullPage:true});

  await page.setViewportSize({width:390,height:844});
  await page.goto(base,{waitUntil:"networkidle",timeout:60000});
  await page.getByText("Customer Success Command Center").waitFor();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  if(overflow>3)throw new Error("Mobile horizontal overflow: "+overflow);
  await page.locator('[data-action="letter"]').click();
  await page.waitForTimeout(200);
  if(!(await page.locator("#applicationPanel").evaluate(el=>el.classList.contains("open"))))throw new Error("Mobile application drawer did not open");
  await page.screenshot({path:"cpl-mobile-smoke.png",fullPage:true});

  const reset=await page.request.post(base+"/api/customers/reset-samples",{data:{}});
  if(!reset.ok())throw new Error("Could not restore synthetic defaults after browser mutation");
  console.log("CPL browser smoke passed");
}catch(err){
  if(page)await page.screenshot({path:"cpl-failure.png",fullPage:true}).catch(()=>{});
  throw err;
}finally{
  await browser.close();
}
