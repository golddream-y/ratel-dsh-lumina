/** Actual bundle on source-verified native tool markup; not original-client acceptance. */
import fs from 'node:fs'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.LUMINA_PLAYWRIGHT_PATH||'playwright')
const out=process.env.LUMINA_EVIDENCE_DIR||'.local/diagnostics/2026-10-29-tool-motion-client'
fs.mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'chrome'})
try{
 const page=await browser.newPage({viewport:{width:1100,height:850},deviceScaleFactor:2}),errors=[]
 page.on('pageerror',e=>errors.push(e.message))
 await page.route('http://127.0.0.1:8759/**',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html><style>
 body{font:14px -apple-system,BlinkMacSystemFont,sans-serif;color:#263349;background:#fff;margin:80px auto;max-width:780px;--dsw-alias-label-primary:#263349}h2{font-size:22px;font-weight:600}small{color:#8c96a7}[data-chat-node-key]{margin:16px 0}[data-disclosure-header],[data-sample=bash]{position:relative;padding:10px 0;border-radius:7px}[data-disclosure-row],[data-sample=bash]{cursor:pointer}[data-disclosure-row]:before,[data-sample=bash]:before{content:'›';padding-right:10px;color:#7e8ea9}pre{font:12px/1.85 monospace;margin:12px 0 0 24px;background:#f6f8fc;padding:18px;border:1px solid #e6ebf3;border-radius:10px;color:#667994}button{font:inherit;padding:8px 14px;margin:15px 5px 24px 0;border:1px solid #dae2ee;border-radius:9px;background:#fff;color:#536681}[data-disclosure-header]:hover{background:#f8f9fb}
 </style><body><small>实际插件构建 · 受控原生结构 · 示例数据</small><h2>工具执行动效</h2><button id="finish">完成第一项</button><button id="error">失败第一项</button><div data-conversation-content data-conversation-region="chat" data-conversation-session="one"></div>
 <script>window.cleanups=[];window.registration=null;window.__ModuleLoader__={load:r=>registration=r};window.addTool=(id,state='running',bash=false)=>{const call=document.createElement('div');call.setAttribute('data-chat-flow-kind','tool-call');call.setAttribute('data-chat-node-key',id);call.innerHTML=bash?'<div data-sample="bash" data-variant="bash" data-state="'+state+'" role="button" aria-expanded="false">执行命令 · npm test</div>':'<div data-tool="read_file" data-variant="read" data-state="'+state+'"><div><div data-disclosure-header><div data-disclosure-row role="button" aria-expanded="false" tabindex="0">读取文件 · package.json</div></div></div></div>';document.querySelector('[data-conversation-content]').append(call);const row=call.querySelector('[data-state]'),trigger=call.querySelector('[aria-expanded]'),header=bash?row:call.querySelector('[data-disclosure-header]');trigger.onclick=()=>{const open=trigger.getAttribute('aria-expanded')!=='true';trigger.setAttribute('aria-expanded',String(open));if(open){const pre=document.createElement('pre');pre.textContent='$ npm test\\n\\n RUN project\\n ✓ config.spec.ts\\n ✓ session.spec.ts';header.after(pre)}else header.nextElementSibling?.remove()};return row};
 document.querySelector('#finish').onclick=()=>document.querySelector('[data-state]').dataset.state='ok';document.querySelector('#error').onclick=()=>document.querySelector('[data-state]').dataset.state='error';
 localStorage.setItem('ratel-lumina/settings/v1',JSON.stringify({version:1,effects:{hero:false,caret:false,composerRibbon:false,sessionActivity:false,sendTransition:'off'}}));</script></body></html>`}))
 await page.goto('http://127.0.0.1:8759/')
 await page.addScriptTag({content:fs.readFileSync('node_modules/react/umd/react.production.min.js','utf8')})
 await page.addScriptTag({content:fs.readFileSync('lib/client.js','utf8')})
 await page.evaluate(()=>{const plugin=registration.factory(s=>s==='react'?React:{jsx:(t,p)=>React.createElement(t,p),jsxs:(t,p)=>React.createElement(t,p),Fragment:React.Fragment});plugin.apply({slots:{register:options=>{if(options.name==='settings.section')window.settingsStore=options.inject().hooks.settings;return()=>{}},inject:()=>()=>{}},locale:{register:()=>()=>{},bind:()=>k=>k},effect:fn=>cleanups.push(fn())});addTool('one');addTool('two','running',true);addTool('three')})
 await page.waitForFunction(()=>document.querySelectorAll('[data-lumina-tool-flow]').length===2)
 const sample=()=>page.locator('[data-lumina-tool-flow] .lumina-tool-a').first().evaluate(n=>getComputedStyle(n).transform)
 const before=await sample();await page.waitForTimeout(180);assert.notEqual(await sample(),before)
 const headerHeight=await page.locator('[data-disclosure-header]').first().evaluate(n=>n.getBoundingClientRect().height)
 await page.screenshot({path:out+'/running.png'})
 const active=await page.locator('[data-lumina-tool-flow]').evaluateAll(nodes=>nodes.map(n=>n.closest('[data-chat-node-key]').dataset.chatNodeKey))
 assert.equal(active.length,2)
 await page.evaluate(id=>document.querySelector('[data-chat-node-key="'+id+'"] [data-state]').dataset.state='ok',active[0])
 await page.waitForTimeout(300)
 assert.equal(await page.locator('[data-lumina-tool-flow]').count(),2,'freed slot is not reused')
 await page.locator('[data-chat-node-key="two"] [aria-expanded]').click()
 assert.equal(await page.locator('[data-chat-node-key="two"] [aria-expanded]').getAttribute('aria-expanded'),'true')
 assert.ok(await page.locator('[data-chat-node-key="two"] pre').evaluate(n=>n.getAnimations().length)>0,'native result did not get its one-shot expansion feedback')
 await page.waitForTimeout(220)
 assert.equal(await page.locator('[data-chat-node-key="two"] pre').evaluate(n=>n.getAnimations().length),0)
 await page.screenshot({path:out+'/expanded.png'})
 await page.evaluate(()=>{document.querySelector('[data-conversation-content]').replaceChildren();addTool('history','ok')})
 await page.waitForTimeout(250);assert.equal(await page.locator('[data-lumina-tool-flow]').count(),0)
 await page.locator('[aria-expanded]').click()
 assert.ok(await page.locator('pre').evaluate(n=>n.getAnimations().length)>0,'completed history cannot expand smoothly')
 await page.waitForTimeout(220)
 await page.evaluate(()=>{const pre=document.querySelector('pre');for(let i=0;i<100;i++)pre.append(document.createTextNode('\nlog chunk'))})
 assert.equal(await page.locator('pre').evaluate(n=>n.getAnimations().length),0,'streamed text restarted expansion')
 await page.evaluate(()=>{document.querySelector('[data-conversation-content]').replaceChildren();const fast=addTool('fast');setTimeout(()=>fast.dataset.state='ok',60)})
 await page.waitForTimeout(100);assert.equal(await page.locator('[data-lumina-tool-flow]').count(),0)
 await page.waitForTimeout(200);assert.equal(await page.locator('[data-lumina-tool-flow]').count(),0)
 await page.evaluate(()=>addTool('return'));await page.waitForFunction(()=>!!document.querySelector('[data-lumina-tool-flow]'))
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);assert.equal(await page.locator('[data-lumina-tool-flow]').count(),0)
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForFunction(()=>!!document.querySelector('[data-lumina-tool-flow]'))
 assert.equal(await page.locator('[data-disclosure-header]').first().evaluate(n=>n.getBoundingClientRect().height),headerHeight,'decoration changes native row height')
 const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable')
 const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]))
 const performance=[]
 for(const count of [1,3,8])for(const enabled of [false,true]){
  await page.evaluate(({count,enabled})=>{
   document.querySelector('[data-conversation-content]').replaceChildren()
   for(let i=0;i<count;i++)addTool('perf-'+i)
   const saved=settingsStore.getSnapshot();settingsStore.commit({...saved,effects:{...saved.effects,toolMotion:enabled}})
   const pre=document.createElement('pre');pre.style.cssText='height:120px;overflow:auto';document.querySelector('[data-conversation-content]').append(pre)
   window.logTimer=setInterval(()=>pre.append(document.createTextNode('log output chunk\\n')),60)
  },{count,enabled})
  await page.waitForTimeout(350)
  const start=await metrics();await page.waitForTimeout(2000);const end=await metrics()
  const result={count,enabled,mainMs:(end.TaskDuration-start.TaskDuration)*1000,scriptMs:(end.ScriptDuration-start.ScriptDuration)*1000,styleRecalculations:end.RecalcStyleCount-start.RecalcStyleCount,layouts:end.LayoutCount-start.LayoutCount,active:await page.locator('[data-lumina-tool-flow]').count()}
  assert.ok(result.active<=2);performance.push(result)
  await page.evaluate(()=>clearInterval(logTimer))
 }
 fs.writeFileSync(out+'/performance.json',JSON.stringify({scope:'headless Chrome main-thread smoke comparison; not native-client CPU or GPU utilisation',viewport:'1100x850',dpr:2,sampleMs:2000,logIntervalMs:60,performance},null,2))
 await page.evaluate(()=>cleanups.forEach(fn=>fn?.()))
 assert.equal(await page.locator('[data-lumina-tool-flow]').count(),0)
 assert.equal(await page.locator('[data-disclosure-header]').evaluateAll(nodes=>nodes.filter(n=>n.style.position!=='').length),0)
 assert.deepEqual(errors,[])
 fs.writeFileSync(out+'/evidence.json',JSON.stringify({scope:'production bundle on source-verified tool markup',active,moving:true,historyNoReplay:true,quickCompletion:true,disclosure:true,logsNotReanimated:true,reducedMotion:true,noLayoutChange:true,cleanup:true,errors},null,2));console.log('tool-motion bundle verification passed')
}finally{await browser.close()}
