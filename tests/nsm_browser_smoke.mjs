import { chromium } from "playwright";
const base="https://nsm.clintware.com"; let browser;
try{
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(base,{waitUntil:"networkidle"});
  await page.getByText("Post-implementation command view").waitFor();
  await page.getByText("Harborview Health System").click();
  await page.getByText("Platform health, not account vibes.").waitFor();
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
