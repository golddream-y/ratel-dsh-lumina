/** Production bundle + native GPU resources on a controlled page, not macOS lifecycle acceptance. */
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.LUMINA_PLAYWRIGHT_PATH || 'playwright')
const out=process.env.LUMINA_EVIDENCE_DIR || '.local/diagnostics/2026-10-29-motion-resume'
fs.mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'chrome'})
try {
  const page=await browser.newPage({viewport:{width:1200,height:900}})
  const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.route('http://127.0.0.1:8759/**',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><style>
  body{margin:0;background:white;color:#202733;font:16px system-ui}aside{position:absolute;width:250px;top:300px;left:8px}
  [data-row-key]{height:42px;display:flex;align-items:center;gap:12px;position:relative;padding:0 14px;background:#e6e9ee;border-radius:12px;box-sizing:border-box}
  svg{flex-shrink:0;width:12px;height:12px;color:#e86774}
  [data-phase=hero]{margin:260px 40px 0 360px}[data-composer-card]{height:160px;border:1px solid #ccd6eb;border-radius:24px;padding:20px;background:white;position:relative;box-sizing:border-box}
  [data-composer-input]{min-height:70px;outline:none}h2{text-align:center;margin-bottom:80px}
  </style><body><aside><div role="treeitem" data-row-key="session:one"><svg data-state="ongoing" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="none" stroke="currentColor"/></svg>运行中的会话</div></aside>
  <div data-phase="hero"><h2><span data-slot="conversation.hero.brand.mark">探索未至之境</span></h2><div data-composer-card><div contenteditable="true" data-composer-input>测试输入</div></div></div>
  <script>window.registration=null;window.cleanups=[];window.__ModuleLoader__={load:r=>registration=r};
  let hidden=false;Object.defineProperty(document,'hidden',{get:()=>hidden});window.setHidden=value=>{hidden=value;document.dispatchEvent(new Event('visibilitychange'))};
  window.glContexts=[];const originalContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args){const result=originalContext.apply(this,args);if(args[0]==='webgl2'&&result)glContexts.push(result);return result};
  window.devices=[];window.submits=[];const queues=new WeakMap();const submit=GPUQueue.prototype.submit;GPUQueue.prototype.submit=function(...args){const i=queues.get(this);if(i!==undefined)submits[i]++;return submit.apply(this,args)};
  const api=navigator.gpu,requestAdapter=api.requestAdapter.bind(api);api.requestAdapter=async(...args)=>{const adapter=await requestAdapter(...args);if(!adapter)return null;const requestDevice=adapter.requestDevice.bind(adapter);adapter.requestDevice=async(...options)=>{const device=await requestDevice(...options),i=devices.length;devices.push(device);submits.push(0);queues.set(device.queue,i);return device};return adapter};
  localStorage.setItem('ratel-lumina/settings/v1',JSON.stringify({version:1,effects:{hero:false,caret:false,sendTransition:'off',typeWave:false}}));</script></body></html>`}))
  await page.goto('http://127.0.0.1:8759/')
  await page.addScriptTag({content:fs.readFileSync('node_modules/react/umd/react.production.min.js','utf8')})
  await page.addScriptTag({content:fs.readFileSync('lib/client.js','utf8')})
  await page.evaluate(()=>{
    const plugin=registration.factory(s=>s==='react'?React:{jsx:(t,p)=>React.createElement(t,p),jsxs:(t,p)=>React.createElement(t,p),Fragment:React.Fragment})
    plugin.apply({slots:{register:()=>()=>{},inject:()=>()=>{}},locale:{register:()=>()=>{},bind:()=>key=>key},effect:fn=>cleanups.push(fn())})
    document.querySelector('[contenteditable]').focus()
  })
  const ready=async()=>{
    await page.waitForFunction(()=>document.querySelector('svg[data-lumina-session-cloud-ready]') && document.querySelector('.lumina-composer-ribbon')?.style.opacity==='1' && submits.at(-1)>2)
  }
  await ready()
  const state=()=>page.evaluate(()=>({devices:devices.length,contexts:glContexts.length,submits:[...submits],paused:document.documentElement.hasAttribute('data-lumina-motion-paused'),ready:!!document.querySelector('svg[data-lumina-session-cloud-ready]'),ribbon:document.querySelector('.lumina-composer-ribbon')?.style.opacity}))
  const samples=[]
  const before=await state();samples.push({stage:'initial',...before})
  const galaxy=()=>page.locator('.lumina-session-galaxy').evaluate(canvas=>canvas.toDataURL())
  const firstImage=await galaxy();await page.waitForTimeout(250);assert.notEqual(await galaxy(),firstImage,'running scene is static')
  for(let i=0;i<3;i++){
    await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForTimeout(60)
    await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(60)
  }
  await ready();assert.equal((await state()).devices,before.devices,'ordinary focus switches recreated the device')
  await page.evaluate(()=>setHidden(true));await page.waitForTimeout(100)
  const hidden=await state();assert.equal(hidden.paused,true);samples.push({stage:'hidden',...hidden})
  await page.waitForTimeout(200);assert.deepEqual((await state()).submits,hidden.submits,'hidden window still submits GPU work')
  await page.evaluate(()=>setHidden(false));await ready()
  await page.waitForFunction(previous=>submits.at(-1)>previous,hidden.submits.at(-1))
  const returned=await state();samples.push({stage:'visible',...returned})
  assert.equal(returned.devices,before.devices,'visibility return recreated a healthy device')
  assert.equal(returned.paused,false)
  const moving=await galaxy();await page.waitForTimeout(250);assert.notEqual(await galaxy(),moving,'scene did not resume')

  await page.evaluate(()=>{window.cloudLoss=glContexts.at(-1).getExtension('WEBGL_lose_context');cloudLoss.loseContext()})
  await page.waitForFunction(()=>!document.querySelector('svg[data-lumina-session-cloud-ready]'))
  samples.push({stage:'webgl-lost',...await state()})
  await page.evaluate(()=>cloudLoss.restoreContext())
  await page.waitForFunction(()=>!!document.querySelector('svg[data-lumina-session-cloud-ready]'))
  assert.ok((await state()).contexts>before.contexts,'restored cloud did not rebuild its program')
  samples.push({stage:'webgl-restored',...await state()})

  await page.evaluate(()=>devices.at(-1).destroy())
  await page.waitForFunction(()=>!document.querySelector('.lumina-composer-ribbon'))
  const failed=await state();await page.waitForTimeout(150)
  assert.equal((await state()).devices,failed.devices,'device failure triggers an unbounded automatic retry')
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await ready()
  assert.equal((await state()).devices,failed.devices+1,'return did not rebuild the failed device')
  samples.push({stage:'webgpu-rebuilt',...await state()})
  await page.screenshot({path:path.join(out,'resumed.png')})
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150)
  const reduced=await state();await page.waitForTimeout(150);assert.deepEqual((await state()).submits,reduced.submits)
  await page.emulateMedia({reducedMotion:'no-preference'});await ready()
  await page.evaluate(()=>{cleanups.forEach(fn=>fn?.());window.dispatchEvent(new Event('focus'))})
  await page.waitForTimeout(100)
  const cleanup=await page.evaluate(()=>({canvases:document.querySelectorAll('.lumina-session-galaxy,.lumina-composer-ribbon').length,ready:document.querySelectorAll('[data-lumina-session-cloud-ready]').length,paused:document.documentElement.hasAttribute('data-lumina-motion-paused')}))
  assert.deepEqual(cleanup,{canvases:0,ready:0,paused:false});assert.deepEqual(errors,[])
  fs.writeFileSync(path.join(out,'gpu-resume.json'),JSON.stringify({scope:'controlled events + native GPU, not OS app/minimise/lock acceptance',samples,cleanup,errors},null,2))
  console.log(JSON.stringify({samples,cleanup,errors},null,2))
} finally {await browser.close()}
