/** Controlled browser verification of the production bundle, not a host acceptance test.
 * Run after build; set LUMINA_PLAYWRIGHT_PATH if Playwright is outside this project.
 * Output: continuous stage samples, cancellation assertions, and PNG frames.
 */
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const fs=require('node:fs');
const assert=require('assert/strict');
const {chromium}=require(process.env.LUMINA_PLAYWRIGHT_PATH || 'playwright');
const out=process.env.LUMINA_EVIDENCE_DIR || '/tmp/lumina-send-transfer-evidence';fs.mkdirSync(out,{recursive:true});
const html=`<!doctype html><html lang="zh"><meta charset="utf-8"><style>
html{--dsw-alias-label-primary:#243247;--dsw-alias-bg-layer-1:white;font:17px system-ui;background:#f7f8fc;color:#243247}body{margin:40px auto;width:860px}h1{font-size:21px;font-weight:550}small{color:#7b8391}#chat{height:290px;padding:20px 0;box-sizing:border-box}.user{display:flex;justify-content:flex-end;margin:12px 0}.bubble{max-width:540px;background:#eaf0fe;border-radius:18px;padding:17px 22px;line-height:1.8}.bubble span{white-space:pre-wrap}[data-composer-card]{position:relative;background:white;border:1px solid #dee3ee;border-radius:25px;padding:22px 24px}[data-composer-input]{min-height:75px;line-height:1.8;outline:0;white-space:pre-wrap}footer{display:flex;justify-content:space-between}button{border:0;border-radius:50%;width:42px;height:42px;background:#f1f3f7;font:23px system-ui}#send{background:#b2c5fb;color:white}#note{margin-top:22px;font-size:13px;color:#7b8391}
</style><body><h1>发送文字水滴转场 · 实现版验证</h1><small>受控客户端夹具 · 加载实际插件 bundle · 非真实发送</small><div id="chat" data-conversation-content data-conversation-region="chat" data-conversation-session="one"></div><div data-composer-card><div data-composer-input contenteditable="true">让文字像一滴水，从这里流向消息。<br>汇聚、剥离，再舒展开来。</div><footer><button id="menu">+</button><button id="send">↑</button></footer></div><p id="note">文字成滴 → 融入输入框液面 → 鼓起、拉丝、剥离 → 飞向消息展开</p><script>
window.warnings=[];console.warn=(...args)=>warnings.push(args.join(' '));
window.frames=new Map();window.clock=0;window.rid=0;performance.now=()=>clock;requestAnimationFrame=fn=>{frames.set(++rid,fn);return rid};cancelAnimationFrame=id=>frames.delete(id);window.advance=ms=>{clock=ms;const q=[...frames.values()];frames.clear();q.forEach(fn=>fn(ms))};
window.makeFace=value=>{const fns=new Set();return{getSnapshot:()=>value,subscribe:fn=>{fns.add(fn);return()=>fns.delete(fn)},set:next=>{value=next;fns.forEach(fn=>fn())}}};window.list=makeFace({current:'one'});window.session=makeFace({pendingSubmissions:[]});window.chat=makeFace({order:[],nodes:new Map()});window.cleanups=[];window.__ModuleLoader__={load:r=>window.registration=r};
window.submit=()=>{const input=document.querySelector('[data-composer-input]');const text=input.innerText;session.set({pendingSubmissions:[{requestId:'r1',placement:'transcript',text}]});input.textContent='';const seat=document.createElement('div');seat.className='user';seat.dataset.chatNodeKey='node1';const bubble=document.createElement('div');bubble.className='bubble';const span=document.createElement('span');span.textContent=text;bubble.append(span);seat.append(bubble);document.querySelector('#chat').append(seat);chat.set({order:['node1'],nodes:new Map([['node1',{data:{source:{kind:'user',rpcId:'r1'}}}]])});};document.querySelector('#send').onclick=submit;
</script></body></html>`;
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1080,height:720},deviceScaleFactor:1});let errors=[];page.on('pageerror',e=>errors.push(String(e)));
await page.route('http://lumina.test/**',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto('http://lumina.test');
const boot=async()=>{await page.addScriptTag({content:fs.readFileSync('node_modules/react/umd/react.production.min.js','utf8')});await page.addScriptTag({content:fs.readFileSync('lib/client.js','utf8')});await page.evaluate(()=>{window.plugin=registration.factory(s=>s==='react'?React:{jsx:(t,p)=>React.createElement(t,p),jsxs:(t,p)=>React.createElement(t,p),Fragment:React.Fragment});plugin.apply({slots:{register:()=>()=>{},inject:()=>()=>{}},locale:{register:()=>()=>{},bind:()=>k=>k},effect:fn=>cleanups.push(fn()),sessions:{list,binding:()=>({session})},uiConversation:{binding:()=>{if(window.bindingReady===false)throw Error('binding not ready');return{target:()=>chat}}}})});
};await boot();
await page.locator('[contenteditable]').focus();await page.evaluate(()=>advance(0));await page.screenshot({path:out+'/00-before.png'});await page.locator('#send').click();
const palette=await page.evaluate(()=>{const stop=document.querySelector('.lumina-transfer linearGradient stop:nth-child(2)');advance(0);const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');ctx.fillStyle=getComputedStyle(stop).stopColor;ctx.fillRect(0,0,1,1);return Array.from(ctx.getImageData(0,0,1,1).data)});assert(palette[2]>palette[0]+15,'water must stay cool under the red brand preset');
const samples=[];for(const t of [0,80,170,270,340,390,470,550,610,680,740,830,940,1000,1090,1180]){await page.evaluate(t=>advance(t),t);samples.push(await page.evaluate(t=>{const root=document.querySelector('.lumina-transfer'),glyphs=[...document.querySelectorAll('.lumina-transfer-glyph')];return{t,phase:root?.getAttribute('data-phase'),glyphs:glyphs.slice(0,3).map(g=>getComputedStyle(g).transform),blur:root?.querySelector('feGaussianBlur')?.getAttribute('stdDeviation'),drop:root?.querySelector('[data-liquid-part=drop]')?.getAttribute('d'),neck:root?.querySelector('[data-liquid-part=neck]')?.getAttribute('d'),surface:root?.querySelector('[data-liquid-part=surface]')?.getAttribute('d'),radius:root?.getAttribute('data-liquid-radius'),connected:root?.getAttribute('data-liquid-connected'),edge:root?.getAttribute('data-liquid-edge'),masks:document.querySelectorAll('[data-lumina-transfer-mask]').length}},t));if([0,170,340,390,470,550,610,680,830,1000,1180].includes(t))await page.screenshot({path:out+`/${String(t).padStart(3,'0')}.png`});}
assert(samples[1].glyphs[0]!==samples[2].glyphs[0]);assert(samples[4].neck);assert.equal(samples[6].radius,'0.000');assert.equal(samples[6].drop,'');assert(samples[6].surface);assert.equal(samples[8].connected,'true');assert(samples[8].neck);assert.equal(samples[10].connected,'false');assert.equal(samples.at(-1).masks,0);assert.equal(samples.at(-1).phase,undefined);
const cleanup=await page.evaluate(()=>{for(const clean of cleanups)clean?.();return{styles:document.querySelectorAll('style[data-plugin="ratel-lumina"]').length,masks:document.querySelectorAll('[data-lumina-transfer-mask]').length,overlays:document.querySelectorAll('.lumina-transfer').length,warnings}});assert.equal(cleanup.styles,0);assert.equal(cleanup.overlays,0);assert.equal(errors.length,0);assert.equal(cleanup.warnings.length,0);const scenarios={};
for (const scenario of ['unload','reduce','session','wheel','target-loss','replacement','new-draft','timeout','reduced-before']) {
  await page.emulateMedia({reducedMotion:'no-preference'});await page.reload();await boot();
  if(scenario==='reduced-before')await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#send').click();await page.evaluate(()=>advance(310));
  if(scenario==='unload')await page.evaluate(()=>cleanups.forEach(fn=>fn?.()));
  if(scenario==='reduce'){await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>advance(330));await page.waitForFunction(()=>!document.querySelector('.lumina-transfer'),null,{timeout:1000})}
  if(scenario==='session')await page.evaluate(()=>list.set({current:'two'}));
  if(scenario==='wheel')await page.evaluate(()=>window.dispatchEvent(new WheelEvent('wheel')));
  if(scenario==='target-loss')await page.evaluate(()=>{advance(800);document.querySelector('.user').remove();advance(820)});
  if(scenario==='replacement')await page.evaluate(()=>{const seat=document.querySelector('.user');seat.replaceWith(seat.cloneNode(true));advance(650);advance(1200)});
  if(scenario==='new-draft')await page.evaluate(()=>{document.querySelector('[contenteditable]').textContent='新的草稿不应被隐藏';advance(350)});
  if(scenario==='timeout')await page.evaluate(()=>{document.querySelector('.user').remove();chat.set({order:[],nodes:new Map()});advance(350);advance(1200)});
  const state=await page.evaluate(()=>({masks:document.querySelectorAll('[data-lumina-transfer-mask]').length,overlays:document.querySelectorAll('.lumina-transfer').length,draftMasked:document.querySelector('[contenteditable]').hasAttribute('data-lumina-transfer-mask')}));
  if(scenario==='new-draft'){assert.equal(state.draftMasked,false);await page.evaluate(()=>cleanups.forEach(fn=>fn?.()))}else{assert.equal(state.masks,0,scenario);assert.equal(state.overlays,0,scenario)}
  scenarios[scenario]=state;
}
for(const scenario of ['first-session','late-binding']){
  await page.emulateMedia({reducedMotion:'no-preference'});await page.reload();
  await page.evaluate(kind=>{if(kind==='first-session')list.set({current:undefined});else window.bindingReady=false},scenario);
  await boot();await page.locator('#send').click();
  await page.evaluate(()=>{window.bindingReady=true;list.set({current:'one'});advance(310)});
  assert.equal(await page.locator('.lumina-transfer').count(),1,scenario+' must start a real renderer');
  await page.evaluate(()=>advance(1200));
  const state=await page.evaluate(()=>({masks:document.querySelectorAll('[data-lumina-transfer-mask]').length,overlays:document.querySelectorAll('.lumina-transfer').length}));
  assert.equal(state.masks,0);assert.equal(state.overlays,0);scenarios[scenario]=state;
}
await page.emulateMedia({reducedMotion:'no-preference'});await page.reload();await boot();await page.locator('#send').click();
for(let t=0;t<=1200;t+=40){await page.evaluate(t=>advance(t),t);await page.screenshot({path:out+`/frame-${String(t).padStart(3,'0')}.png`})}
fs.writeFileSync(out+'/evidence.json',JSON.stringify({palette,samples,cleanup,scenarios,errors},null,2));console.log(JSON.stringify({phases:samples.map(s=>[s.t,s.phase]),cleanup,scenarios,errors,out},null,2));await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
