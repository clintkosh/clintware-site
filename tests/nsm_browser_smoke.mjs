import { chromium } from "playwright";
import fs from "node:fs";
const base="https://nsm.clintware.com"; let browser;
try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on("console",m=>console.log("BROWSER_CONSOLE",m.type(),m.text()));
  page.on("pageerror",e=>console.log("BROWSER_PAGEERROR",e.message));
  page.on("requestfailed",r=>console.log("BROWSER_REQUEST_FAILED",r.url(),r.failure()?.errorText));
  page.on("response",r=>{if(/nsm\.js|\/api\/state|\/api\/records/.test(r.url()))console.log("BROWSER_RESPONSE",r.status(),r.url(),r.headers()["content-type"]||"no-content-type");});
  await page.goto(base,{waitUntil:"networkidle"});
  try{await page.getByText("Post-implementation command view").waitFor({timeout:12000});}
  catch(e){console.log("BROWSER_BODY",(await page.locator("body").innerText()).slice(0,3000));throw e;}

  await page.getByText("Harborview Health System").click();
  await page.getByText("Account Workspace").waitFor();
  await page.getByText("Key contacts").waitFor();
  await page.getByText("KPIs / success criteria").waitFor();

  await page.getByText("+ Add contact").click();
  await page.locator('#contact-form input[name="name"]').fill("Jamie Rivera");
  await page.locator('#contact-form input[name="role"]').fill("ServiceNow Platform Analyst");
  await page.locator('#contact-form input[name="decisionRole"]').fill("Technical contributor");
  await page.locator('#contact-form button[type="submit"]').click();
  await page.getByText("Jamie Rivera").waitFor();

  await page.getByRole("button",{name:"Meeting Brief"}).click();
  await page.getByRole("heading",{name:"Meeting Brief",exact:true}).waitFor();
  await page.getByText("Current preview").waitFor();
  const downloadPromise=page.waitForEvent("download");
  await page.getByRole("button",{name:"Download PDF"}).click();
  const download=await downloadPromise;
  const filePath="/tmp/"+download.suggestedFilename();
  await download.saveAs(filePath);
  const pdf=fs.readFileSync(filePath);
  if(pdf.length<1000||pdf.subarray(0,4).toString()!=="%PDF")throw new Error("Meeting brief PDF was not valid");
  await page.getByText("Meeting brief PDF downloaded and prep saved.").waitFor();

  await page.getByRole("button",{name:"Escalation"}).click();
  await page.getByText("Escalate with context already attached.").waitFor();
  await page.screenshot({path:"nsm-desktop.png",fullPage:true});

  const mobile=await browser.newPage({viewport:{width:390,height:844}});
  await mobile.goto(base,{waitUntil:"networkidle"});
  await mobile.getByText("Post-implementation command view").waitFor();
  await mobile.screenshot({path:"nsm-mobile.png",fullPage:true});
}catch(e){
  if(browser){const pages=browser.contexts().flatMap(c=>c.pages());if(pages[0])await pages[0].screenshot({path:"nsm-failure.png",fullPage:true}).catch(()=>{});}
  throw e;
}finally{if(browser)await browser.close();}
