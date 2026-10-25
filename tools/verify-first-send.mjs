/** Actual-bundle first-send layout handoff regression; local fixture only. */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const out=process.env.LUMINA_EVIDENCE_DIR||'/private/tmp/lumina-first-send-fixed';fs.mkdirSync(out,{recursive:true})
const {chromium}=require(process.env.LUMINA_PLAYWRIGHT_PATH||'playwright');
const fixture=`<!doctype html><html lang="zh"><meta charset="utf-8"><style>
html{font:17px system-ui;color:#263349;background:#f7f8fc;--dsw-alias-label-primary:#263349;--dsw-alias-label-tertiary:#778398;--dsw-alias-brand-primary-new-colorprimary-new-color:#4176e6;--dsw-alias-bg-layer-1:white}body{width:840px;margin:44px auto}h1{font-size:22px}small{color:#778398}#chat{height:260px;padding-top:125px;box-sizing:border-box}.row{display:flex;justify-content:flex-end}.bubble{max-width:500px;border-radius:18px;background:#eaf0fe;padding:17px 20px;line-height:1.8}.bubble span{white-space:pre-wrap}[data-composer-card]{position:relative;border:1px solid #ddd;border-radius:24px;padding:22px;background:white}[data-composer-input]{min-height:65px;outline:0;line-height:1.8}footer{display:flex;justify-content:space-between}button{border:0;width:40px;height:40px;border-radius:50%;font:23px system-ui}#send{background:#b6c9fa;color:white}p{font-size:13px;color:#778398}
</style><body><h1>流光发送转场 · 渲染核对</h1><small>实际插件构建 / 受控页面，非真实客户端录屏</small><div id="chat" data-conversation-content data-conversation-region="chat" data-conversation-session="one"></div><div data-composer-card><div data-composer-input contenteditable="true">整段文字交给流光，抵达后保持排版完整展开。</div><footer><button>＋</button><button id="send">↑</button></footer></div><p>文字收束 → 光绸牵出与流动 → 收进消息 → 整段展开</p><script>
localStorage.setItem('ratel-lumina/settings/v1',JSON.stringify({version:1,effects:{sendTransition:"flow"}}));
window.clock=0;window.tasks=new Map();window.rid=0;performance.now=()=>clock;
// Screenshot time must not expire the production watchdog while the animation clock is paused.
window.longTimers=new Map();window.timerId=0;const nativeTimeout=setTimeout,nativeClear=clearTimeout;
window.setTimeout=(fn,ms,...args)=>{if(ms<1500)return nativeTimeout(fn,ms,...args);const id=--timerId;longTimers.set(id,{at:clock+ms,fn:()=>fn(...args)});return id};window.clearTimeout=id=>{if(id<0)longTimers.delete(id);else nativeClear(id)};
requestAnimationFrame=fn=>{tasks.set(++rid,fn);return rid};cancelAnimationFrame=id=>tasks.delete(id);window.advance=t=>{clock=t;for(const [id,timer] of longTimers){if(timer.at<=clock){longTimers.delete(id);timer.fn()}}const q=[...tasks.values()];tasks.clear();q.forEach(fn=>fn(clock))};
window.face=value=>{const ls=new Set();return{getSnapshot:()=>value,subscribe:fn=>{ls.add(fn);return()=>ls.delete(fn)},set:next=>{value=next;ls.forEach(fn=>fn())}}};window.current=face({key:'one'});window.session=face({pendingSubmissions:[]});window.chat=face({order:[],nodes:new Map()});window.cleanups=[];window.__ModuleLoader__={load:r=>window.registration=r};
document.querySelector('#send').onclick=()=>{const input=document.querySelector('[contenteditable]'),text=input.innerText;session.set({pendingSubmissions:[{requestId:'request-one',placement:'transcript',text,time:Date.now()}]});input.textContent='';const row=document.createElement('div');row.className='row';row.dataset.chatNodeKey='node-one';const bubble=document.createElement('div');bubble.className='bubble';const span=document.createElement('span');span.textContent=text;bubble.append(span);row.append(bubble);document.querySelector('#chat').append(row);chat.set({order:['node-one'],nodes:new Map([['node-one',{data:{source:{kind:'user',rpcId:'request-one'}}}]])})};
</script></body></html>`;
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];try{
for(const scenario of ['move-before-confirm','move-after-confirm','replace-before-confirm','replace-after-confirm','preallocated-empty','cancel-mid-handoff']){
const page=await browser.newPage({viewport:{width:1040,height:820}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
let html=scenario==='preallocated-empty'?fixture:fixture.replace("window.current=face({key:'one'})","window.current=face({})");
html+=`<style>[data-composer-card]{position:fixed!important;left:100px;top:280px;width:800px;box-sizing:border-box}</style><script>
const originalSend=document.querySelector('#send').onclick;
document.querySelector('#send').onclick=()=>{
 const card=document.querySelector('[data-composer-card]');window.before=card.getBoundingClientRect().top;
 originalSend();
 if('${scenario}'==='replace-before-confirm'){const replacement=card.cloneNode(true);replacement.style.top='600px';card.replaceWith(replacement);current.set({key:'one'})}
 else if('${scenario}'==='move-before-confirm'){card.style.top='600px';current.set({key:'one'})}
 else{current.set({key:'one'});if('${scenario}'==='replace-after-confirm'){const replacement=card.cloneNode(true);replacement.style.top='600px';card.replaceWith(replacement)}else card.style.top='600px'}
};</script>`;
await page.route('http://lumina.test/**',r=>r.fulfill({contentType:'text/html',body:html}));await page.goto('http://lumina.test');
await page.addScriptTag({content:fs.readFileSync('node_modules/react/umd/react.production.min.js','utf8')});
await page.addScriptTag({content:fs.readFileSync('lib/client.js','utf8')});
await page.evaluate(()=>{const plugin=registration.factory(s=>s==='react'?React:{jsx:(t,p)=>React.createElement(t,p),jsxs:(t,p)=>React.createElement(t,p),Fragment:React.Fragment});plugin.apply({slots:{register:()=>()=>{},inject:()=>()=>{}},locale:{register:()=>()=>{},bind:()=>k=>k},effect:fn=>cleanups.push(fn()),sessions:{binding:()=>({session})},uiSession:{current},uiConversation:{binding:()=>({target:()=>chat})}})});
await page.locator('#send').click();await page.evaluate(()=>advance(0));
const sample=await page.evaluate(()=>{const root=document.querySelector('.lumina-transfer'),material=root?.querySelector('[data-flow-part]'),matrix=material?.transform.baseVal.consolidate()?.matrix,rect=root?.getBoundingClientRect(),glyph=root?.querySelector('.lumina-transfer-layer span');return{before,liveComposerTop:document.querySelector('[data-composer-card]').getBoundingClientRect().top,overlayExists:!!root,flowStartY:matrix&&rect?matrix.d*164+matrix.f+rect.top:null,sourceCopyTop:glyph?.getBoundingClientRect().top,phase:root?.dataset.phase}});
const samples=[];
for(const time of [0,90,180,220,320,500,820]){
 await page.evaluate(t=>advance(t),time);
 const sample=await page.evaluate(time=>{const root=document.querySelector('.lumina-transfer'),material=root?.querySelector('[data-flow-part]'),matrix=material?.transform.baseVal.consolidate()?.matrix,rect=root?.getBoundingClientRect(),glyph=root?.querySelector('.lumina-transfer-layer span');return{time,cardTop:document.querySelector('[data-composer-card]').getBoundingClientRect().top,translate:document.querySelector('[data-composer-card]').style.translate,phase:root?.dataset.phase,flowStartY:matrix&&rect?matrix.d*164+matrix.f+rect.top:null,sourceTop:glyph?.getBoundingClientRect().top,masks:document.querySelectorAll('[data-lumina-transfer-mask]').length,overlays:document.querySelectorAll('.lumina-transfer').length}},time);
 samples.push(sample);
 if(time===90&&scenario==='cancel-mid-handoff'){
  await page.evaluate(()=>window.dispatchEvent(new Event('resize')))
  const restored=await page.evaluate(()=>({top:document.querySelector('[data-composer-card]').getBoundingClientRect().top,translate:document.querySelector('[data-composer-card]').style.translate,overlays:document.querySelectorAll('.lumina-transfer').length,masks:document.querySelectorAll('[data-lumina-transfer-mask]').length}))
  assert.deepEqual(restored,{top:600,translate:'',overlays:0,masks:0});results.push({scenario,samples,restored,errors});break
 }
 if((time===90||time===320)&&scenario==='move-after-confirm')await page.screenshot({path:out+'/'+time+'.png'});

}
if(scenario==='cancel-mid-handoff'){await page.close();continue}
assert.equal(samples[0].phase,'layout-handoff');
assert(Math.abs(samples[0].cardTop-280)<.1);
assert(samples[1].cardTop>280&&samples[1].cardTop<600);
for(const sample of samples.filter(s=>s.time<=180))assert(Math.abs(sample.sourceTop-sample.cardTop-28)<.2);
assert(Math.abs(samples.at(-1).cardTop-600)<.1);assert.equal(samples.at(-1).translate,'');
assert.equal(samples.at(-1).overlays,0);assert.equal(samples.at(-1).masks,0);
const flying=samples.find(s=>s.phase==='flow');assert(flying);assert(Math.abs(flying.flowStartY-601)<.1);
assert.equal(await page.locator('.lumina-send-ripple[data-active]').count(),0);
assert.equal(errors.length,0);results.push({scenario,samples,errors});
await page.close();
}
fs.writeFileSync(out+'/evidence.json',JSON.stringify(results,null,2));console.log(JSON.stringify({scenarios:results.length,sourceTracksComposer:true,flowStartsAtBottom:true,restored:true,errors:[],out},null,2));
}finally{await browser.close()}})();
