const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),assert=require('node:assert/strict');
const base=process.env.AUDIT_URL||'http://127.0.0.1:8001/';
const routes=JSON.parse(fs.readFileSync('scripts/routes.json','utf8'));
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();
for(const [source,route]of Object.entries(routes)){
 const suffix=source==='contact.html'?'?source=legacy#estimate':source==='projects.html'?'?filter=flooring#gallery':'?source=legacy';
 await page.goto(base+source+suffix);await page.waitForURL(base+route+suffix);
 assert.equal(await page.locator('h1').count(),1);
 for(const a of await page.locator('a[href]').all()){
  const href=await a.getAttribute('href');assert(!href.includes('.html'),source+' file-name link '+href);
 }
 await page.goto(base+route+'index.html');assert.equal(page.url(),base+route);
 await page.locator('.skip').focus();await page.keyboard.press('Enter');assert.equal(page.url(),base+route+'#main');
}
await page.goto(base+'projects.html?filter=flooring#gallery');await page.waitForURL(base+'projects/?filter=flooring#gallery');assert.equal(await page.locator('[data-filter="flooring"]').getAttribute('aria-pressed'),'true');
const noJS=await browser.newContext({javaScriptEnabled:false});const fallback=await noJS.newPage();await fallback.goto(base+'about.html');await fallback.waitForURL(base+'about/');assert.equal(await fallback.locator('h1').count(),1);await noJS.close();
await browser.close();console.log('PASS: 11 legacy/index routes, clean internal links, skip links, query/hash preservation, gallery filter redirect, and no-JavaScript fallback.');
})().catch(e=>{console.error(e);process.exit(1)});
