const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const path=require('node:path');
const digest=value=>require('node:crypto').createHash('sha256').update(value).digest('hex');
const {pathToFileURL}=require('node:url');
const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100},locale:'en-US'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>typeof rendered!=='undefined'&&!!rendered);
  assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.equal(await page.locator('#language').inputValue(),'en');
  assert.equal(await page.locator('.intro').count(),0);assert.equal(await page.locator('h1').count(),0);
  assert.doesNotMatch(await page.locator('body').innerText(),/Less color|More character|Every pixel|每个像素|少一些颜色|把风景/);
  assert.equal(await page.locator('#reset').innerText(),'Reset');
  assert.match(await page.locator('#sceneName').innerText(),/The Great Wave/);
  assert.equal(await page.locator('#preview').getAttribute('aria-label'),'Dithered image');
  // Only the language selector's native-language option should contain Chinese in English UI.
  const chinese=await page.evaluate(()=>{const copy=document.body.cloneNode(true);copy.querySelectorAll('script,style,#language').forEach(n=>n.remove());return (copy.textContent.match(/[\u3400-\u9fff]+/g)||[]);});assert.deepEqual(chinese,[]);
  await page.locator('#cell').fill('7');await page.locator('#cell').dispatchEvent('input');await page.waitForFunction(()=>document.getElementById('cellValue').textContent==='7 PX');
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const pixels=digest(await page.evaluate(()=>rendered.canvas.toDataURL()));
  await page.locator('#language').selectOption('zh');assert.equal(await page.locator('#reset').innerText(),'重置');assert.match(await page.locator('#sceneName').innerText(),/神奈川/);
  assert.equal(await page.locator('#cell').inputValue(),'7');assert.equal(digest(await page.evaluate(()=>rendered.canvas.toDataURL())),pixels);
  await page.locator('summary').first().click();await page.locator('#measurement').fill('bad json');await page.locator('#applyMeasurement').click();assert.match(await page.locator('#status').innerText(),/请输入有效的 JSON/);
  await page.locator('#language').selectOption('en');assert.equal(await page.locator('#status').innerText(),'Cannot apply: Enter valid JSON');
  await page.locator('#measurement').fill('{"width":516,"height":290.109375,"y":394.671875,"dpr":1}');await page.locator('#applyMeasurement').click();assert.match(await page.locator('#calibration').innerText(),/Fractional device-pixel/);
  await page.locator('#language').selectOption('zh');assert.match(await page.locator('#calibration').innerText(),/小数设备像素/);
  await page.reload();await page.waitForFunction(()=>typeof rendered!=='undefined'&&!!rendered);assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');
  await page.locator('#language').selectOption('en');const dl=page.waitForEvent('download');await page.locator('#exportX').click();await dl;await page.waitForFunction(()=>document.getElementById('status').textContent.startsWith('Exported'));
  await page.locator('#language').selectOption('zh');assert.match(await page.locator('#status').innerText(),/已导出 516×290/);
  await page.locator('#language').selectOption('en');await page.locator('#upload').setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('bad')});assert.equal(await page.locator('#status').innerText(),'Choose an image file');
  for(const width of [390,320]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,`English mobile overflow at ${width}`);}
  const blocked=await browser.newPage({locale:'fr-FR'});await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked');}}));await blocked.goto(url);await blocked.waitForFunction(()=>typeof rendered!=='undefined'&&!!rendered);assert.equal(await blocked.locator('html').getAttribute('lang'),'en');await blocked.locator('#language').selectOption('zh');assert.equal(await blocked.locator('#reset').innerText(),'重置');
  assert.deepEqual(errors,[]);console.log('PASS: zh/en coverage, browser language, persistence, blocked storage, no slogans, translated errors/calibration/export state, preserved pixels and controls, English mobile layout.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
