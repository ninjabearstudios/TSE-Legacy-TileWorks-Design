/* Run with Node.js and Playwright available; defaults to installed Microsoft Edge.
   Example: PLAYWRIGHT_MODULE=/path/to/playwright node tests/audit.cjs
   Build with python scripts/build-site.py, then serve _site at http://127.0.0.1:8000 first. Never submits the form. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('fs'), assert=require('node:assert/strict');
const base=process.env.AUDIT_URL || 'http://127.0.0.1:8000/';
const routes=JSON.parse(fs.readFileSync('scripts/routes.json','utf8'));
const widths=[320,360,375,390,430,768,1024,1280,1440,1920];
(async()=>{
 const browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL || 'msedge',headless:true});
 const page=await browser.newPage();const failures=[],errors=[],responseErrors=[];const check=(ok,msg)=>{if(!ok) failures.push(msg)};
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)responseErrors.push(r.url())});
 const pages=fs.readdirSync('.').filter(x=>x.endsWith('.html'));let links=0; const titles=new Set(),descriptions=new Set();
 for(const file of pages){
  await page.goto(base+routes[file]);await page.evaluate(()=>document.fonts.ready);
  titles.add(await page.title()); descriptions.add(await page.locator('meta[name="description"]').getAttribute('content'));
  check(await page.locator('h1').count()===1,file+' one h1');
  check(await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll(els=>els.every((e,i)=>i===0||Number(e.tagName[1])<=Number(els[i-1].tagName[1])+1)),file+' heading hierarchy');
  check(await page.locator('link[rel="canonical"]').getAttribute('href')==='https://ninjabearstudios.github.io/TSE-Legacy-TileWorks-Design/'+routes[file],file+' canonical');
  check(await page.locator('meta[property^="og:"]').count()>=7,file+' Open Graph');
  await page.locator('script[type="application/ld+json"]').evaluateAll(els=>els.forEach(el=>JSON.parse(el.textContent)));
  const references=await page.locator('a[href],img[src],link[href],script[src],[data-full],[srcset]').evaluateAll(els=>els.flatMap(el=>[el.getAttribute('href')||el.getAttribute('src')||el.dataset.full,...(el.getAttribute('srcset')||'').split(',').map(s=>s.trim().split(' ')[0])]).filter(Boolean));
  for(const ref of references){if(/^(https?:|tel:|mailto:)/.test(ref))continue;const u=new URL(ref,base+routes[file]);let f='_site/'+decodeURIComponent(u.pathname.slice(new URL(base).pathname.length));if(f.endsWith('/'))f+='index.html';check(fs.existsSync(f),file+' missing '+ref);links++;if(u.hash&&f.endsWith('.html'))check(fs.readFileSync(f,'utf8').includes('id="'+decodeURIComponent(u.hash.slice(1))+'"'),file+' missing anchor '+ref);}
  for(const width of widths){
   await page.setViewportSize({width,height:900});
   const overflow=await page.evaluate(()=>({page:document.documentElement.scrollWidth>innerWidth+1,items:[...document.querySelectorAll('main h1,main h2,main h3,.hero-copy p,.hero-actions a')].filter(e=>e.getBoundingClientRect().right>innerWidth+1||e.getBoundingClientRect().left< -1).map(e=>e.textContent)}));
   check(!overflow.page&&!overflow.items.length,file+' overflow '+width+' '+JSON.stringify(overflow));
  }
 }
 check(titles.size===pages.length,'unique titles');check(descriptions.size===pages.length,'unique descriptions');
 await page.goto(base+'');await page.setViewportSize({width:1280,height:720});
 check(await page.locator('.hero-actions').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight),'1280x720 hero actions above fold');
 await page.screenshot({path:'.audit/home-1280.png'});
 for(const width of [320,768,1920]){await page.setViewportSize({width,height:900});await page.screenshot({path:'.audit/home-'+width+'.png',fullPage:true});}
 for(const width of [320,1280]){await page.setViewportSize({width,height:900});await page.evaluate(()=>document.documentElement.style.fontSize='200%');check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'home 200% text overflow '+width);await page.screenshot({path:'.audit/home-text-200-'+width+'.png'});await page.evaluate(()=>document.documentElement.style.fontSize='');}
 await page.setViewportSize({width:375,height:900});await page.goto(base+'contact/');
 await page.locator('.menu-toggle').focus();await page.keyboard.press('Enter');check(await page.locator('.menu-toggle').getAttribute('aria-expanded')==='true','mobile menu opens');
 await page.locator('.nav-cta').focus();await page.keyboard.press('Enter');await page.waitForTimeout(500);
 check(await page.locator('.menu-toggle').getAttribute('aria-expanded')==='false','mobile anchor closes menu');check(page.url().endsWith('#estimate'),'anchor preserved');check(await page.locator('#estimate').evaluate(e=>document.activeElement===e),'anchor focus');check(await page.locator('#estimate').evaluate(e=>e.getBoundingClientRect().top>=document.querySelector('.site-header').getBoundingClientRect().bottom-1),'anchor visible below header');
 await page.locator('.menu-toggle').click();await page.locator('.nav a').first().focus();await page.keyboard.press('Escape');check(await page.locator('.menu-toggle').evaluate(e=>e===document.activeElement),'menu escape restores focus');
 // The historical mailto form baseline applies only to the earlier audit.
 if(process.env.CHECK_LEGACY_FORM_BASELINE==='1' && fs.existsSync('.audit/form-computed-before.json')){
  await page.mouse.move(0,0);
  await page.evaluate(()=>document.fonts.ready);
  // Let hover transitions settle before comparing the untouched form styles.
  await page.waitForTimeout(250);
  const baseline=JSON.parse(fs.readFileSync('.audit/form-computed-before.json'));let differences=[];
  for(const w of [320,768,1280]){await page.setViewportSize({width:w,height:900});const current=await page.locator('#estimate-form').evaluate(el=>[el,...el.querySelectorAll('*')].map(e=>({tag:e.tagName,style:Array.from(getComputedStyle(e)).map(k=>[k,getComputedStyle(e).getPropertyValue(k)]),width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));if(JSON.stringify(current)!==JSON.stringify(baseline[w]))differences.push(w);}
  check(!differences.length,'form computed styles changed '+differences);fs.writeFileSync('.audit/form-computed-result.json',JSON.stringify({unchanged:!differences.length,differences}));
 }
 await page.goto(base+'projects/');await page.setViewportSize({width:1280,height:900});const count=await page.locator('.gallery-open').count();
 for(const filter of await page.locator('[data-filter]').all()){
  await filter.focus();await page.keyboard.press('Enter');const value=await filter.getAttribute('data-filter');check(await filter.getAttribute('aria-pressed')==='true','filter state '+value);
  check(await page.locator('[aria-pressed="true"]').count()===1,'single selected filter');
  check(await page.locator('[data-project]').evaluateAll((els,v)=>els.every(e=>e.hidden===(v!=='all'&&e.dataset.project!==v)),value),'filter visibility '+value);
 }
 await page.locator('[data-filter="all"]').click();
 for(const image of await page.locator('.gallery-open img').all()) { await image.scrollIntoViewIfNeeded(); await image.evaluate(img=>img.decode()); }
 for(const trigger of await page.locator('.gallery-open').all()) {
  await trigger.click(); await page.locator('.lightbox img').evaluate(img=>img.decode()); await page.keyboard.press('Escape');
 }
 for(const index of [0,Math.floor(count/2),count-1]){
  const trigger=page.locator('.gallery-open').nth(index);await trigger.focus();await page.keyboard.press('Enter');
  check(await page.locator('.lightbox-close').evaluate(e=>e===document.activeElement),'lightbox initial focus');
  check(await page.locator('main').evaluate(e=>e.inert),'background inert');
  for(const key of ['Tab','Shift+Tab','Tab']){await page.keyboard.press(key);check(await page.locator('.lightbox-close').evaluate(e=>e===document.activeElement),'lightbox trap '+key);}
  await page.locator('.lightbox img').evaluate(img=>img.decode());
  if(index===0)await page.screenshot({path:'.audit/lightbox.png'});
  await page.keyboard.press('Escape');check(await trigger.evaluate(e=>e===document.activeElement),'lightbox return focus');check(await page.locator('main').evaluate(e=>!e.inert),'background restored');
 }
 await page.locator('.gallery-open').first().click();await page.locator('.lightbox-close').click();check(await page.locator('#lightbox').isHidden(),'close button');
 await page.locator('.gallery-open').first().click();await page.locator('#lightbox').click({position:{x:5,y:5}});check(await page.locator('#lightbox').isHidden(),'backdrop close');
 await page.goto(base+'projects/?filter=flooring#gallery');check(await page.locator('[data-filter="flooring"]').getAttribute('aria-pressed')==='true','deep linked filter');
 await page.goto(base+'');for(const faq of await page.locator('.faq-q').all()){await faq.focus();await page.keyboard.press('Enter');check(await faq.getAttribute('aria-expanded')==='true','FAQ opens');await page.keyboard.press('Space');check(await faq.getAttribute('aria-expanded')==='false','FAQ closes');}
 await page.emulateMedia({reducedMotion:'reduce'});check(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior==='auto'),'reduced motion scroll');check(await page.locator('.portfolio-tile img').first().evaluate(e=>getComputedStyle(e).transitionDuration==='0s'),'reduced motion transition');
 await page.goto(base+'about/');await page.screenshot({path:'.audit/about.png',fullPage:true});
 await page.goto(base+'custom-showers/');await page.locator('.cta').scrollIntoViewIfNeeded();await page.screenshot({path:'.audit/shower-cta.png'});
 check(!errors.length,'JS errors '+errors);check(!responseErrors.length,'HTTP errors '+responseErrors);
 const result={pages:pages.length,widths,layoutChecks:pages.length*widths.length,linksChecked:links,galleryPhotographs:count,failures,errors,responseErrors};fs.writeFileSync('.audit/test-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await browser.close();if(failures.length)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
