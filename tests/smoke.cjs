const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const zlib=require('node:zlib');
const {chromium}=require('playwright');
function decodePNG(buf){
 assert.deepEqual([...buf.subarray(0,8)],[137,80,78,71,13,10,26,10]);let w,h,palette,parts=[];
 for(let pos=8;pos<buf.length;){const len=buf.readUInt32BE(pos),name=buf.toString('ascii',pos+4,pos+8),data=buf.subarray(pos+8,pos+8+len);let crc=0xffffffff;for(const v of buf.subarray(pos+4,pos+8+len)){crc^=v;for(let b=0;b<8;b++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}assert.equal((crc^0xffffffff)>>>0,buf.readUInt32BE(pos+8+len),'PNG CRC');if(name==='IHDR'){w=data.readUInt32BE(0);h=data.readUInt32BE(4);assert.equal(data[8],1);assert.equal(data[9],3);}if(name==='PLTE')palette=data;if(name==='IDAT')parts.push(data);pos+=len+12;}
 const raw=zlib.inflateSync(Buffer.concat(parts)),stride=1+Math.ceil(w/8),rgba=Buffer.alloc(w*h*4);assert.equal(raw.length,stride*h);
 for(let y=0;y<h;y++){assert.equal(raw[y*stride],0);for(let x=0;x<w;x++){let bit=(raw[y*stride+1+(x>>3)]>>(7-(x&7)))&1,i=(y*w+x)*4;rgba[i]=palette[bit*3];rgba[i+1]=palette[bit*3+1];rgba[i+2]=palette[bit*3+2];rgba[i+3]=255;}}return {w,h,rgba};
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);await page.waitForFunction(()=>typeof rendered!=='undefined'&&!!rendered);
 assert.equal(await page.locator('.scene').count(),8);assert.equal(await page.locator('#imageInfo').textContent(),'516 × 290 / 2 COLORS');
 const report=await page.evaluate(async()=>{
  const hashes=[];
  for(let i=0;i<SCENES.length;i++){await chooseScene(i);let bytes=rendered.canvas.getContext('2d').getImageData(0,0,rendered.w,rendered.h).data;let hash=0;for(let j=0;j<bytes.length;j+=4)hash=Math.imul(hash,31)+bytes[j]|0;hashes.push(hash);}
  const algorithms=[...$('algorithm').options].map(o=>o.value);let count=0;
  for(const algorithm of algorithms)for(const cell of [1,7,16]){$('algorithm').value=algorithm;$('cell').value=cell;const f=generate(true),pixels=f.canvas.getContext('2d').getImageData(0,0,f.w,f.h).data;for(let i=3;i<pixels.length;i+=4)if(pixels[i]!==255)throw Error('Incomplete edge pixels');count++;}
  $('reset').click();await chooseScene(0);return {unique:new Set(hashes).size,count};
 });assert.equal(report.unique,8);assert.equal(report.count,24);
 await page.locator('summary').first().click();await page.locator('#measurement').fill(JSON.stringify([{width:516,height:290.109375,dpr:1,x:981,y:394.671875,opacity:'1'}]));await page.locator('#applyMeasurement').click();assert.match(await page.locator('#calibration').textContent(),/小数设备像素位置/);assert.match(await page.locator('#scaleInfo').textContent(),/≈/);
 await page.locator('#measurement').fill('{bad json');await page.locator('#applyMeasurement').click();assert.match(await page.locator('#status').textContent(),/无法应用/);
 await page.locator('#measurement').fill('{"width":516,"height":290,"dpr":2}');await page.locator('#applyMeasurement').click();assert.match(await page.locator('#imageInfo').textContent(),/1032 × 580/);
 await page.locator('#reset').click();await page.locator('#width').selectOption('680');assert.equal(await page.locator('#xMode').isChecked(),false);
 const downloadPromise=page.waitForEvent('download');await page.locator('#exportNormal').click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'ditherpunk-art-680x383.png');const bytes=fs.readFileSync(await download.path());const decoded=decodePNG(bytes);assert.equal(decoded.w,680);assert.equal(decoded.h,383);
 const actual=await page.evaluate(()=>Array.from(rendered.canvas.getContext('2d').getImageData(0,0,rendered.w,rendered.h).data));assert.deepEqual(decoded.rgba,Buffer.from(actual));
 const fallback=await page.evaluate(async()=>{const original=window.CompressionStream;window.CompressionStream=undefined;try{return Array.from(new Uint8Array(await (await encodePNG(rendered)).arrayBuffer()));}finally{window.CompressionStream=original;}});assert.deepEqual(decodePNG(Buffer.from(fallback)).rgba,decoded.rgba);
 await page.locator('#upload').setInputFiles({name:'roundtrip.png',mimeType:'image/png',buffer:bytes});await page.waitForFunction(()=>document.getElementById('sceneName').textContent.includes('roundtrip.png'));await page.locator('.scene').nth(2).click();await page.waitForFunction(()=>document.getElementById('sceneName').textContent.includes('蓝色弹珠'));
 await page.locator('#reset').click();const xDownload=page.waitForEvent('download');await page.locator('#exportX').click();const xd=await xDownload;assert.equal(xd.suggestedFilename(),'ditherpunk-x-516x290.png');decodePNG(fs.readFileSync(await xd.path()));
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'Mobile page overflow');
 assert.deepEqual(errors,[]);console.log('PASS: 8 landscapes, 24 algorithm/cell combinations, fractional calibration, DPR, validation, upload, scene reset, normal/X downloads, exact PNG pixels + CRC, fallback encoder, mobile layout.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
