/** Actual bundle settings and native WebGPU budget verification on local fixtures. */
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.LUMINA_PLAYWRIGHT_PATH || 'playwright')
const out=path.resolve(process.env.LUMINA_EVIDENCE_DIR || '.local/diagnostics/2026-10-26-performance/ui-gpu')
fs.mkdirSync(out,{recursive:true})
const {zh}=await import(`data:text/javascript;base64,${Buffer.from(ts.transpileModule(fs.readFileSync('src/client/locales.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText).toString('base64')}`)
const browser=await chromium.launch({headless:true,channel:'chrome'})
try {
  const page=await browser.newPage({viewport:{width:1040,height:920},deviceScaleFactor:2})
  const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.route('http://127.0.0.1:8759/**',route=>{
    const url=new URL(route.request().url()),file=url.pathname.slice(1)
    if(file.startsWith('src/client/') && file.endsWith('.ts') && !file.includes('..')){
      route.fulfill({contentType:'text/javascript',body:ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2024,module:ts.ModuleKind.ESNext}}).outputText});return
    }
    route.fulfill({contentType:'text/html',body:`<!doctype html><html><style>
html{font:14px system-ui;color:#202733;background:#fff;--dsw-alias-label-primary:#202733;--dsw-alias-label-secondary:#576174;--dsw-alias-label-tertiary:#7c8796;--dsw-alias-bg-base:#fff;--dsw-alias-bg-layer-1:#fff;--dsw-alias-bg-layer-2:#e9edf2;--dsw-alias-border-l2:#d4dce6;--dsw-alias-state-business-primary:#477cec;--dsw-alias-brand-primary:#477cec;--dsw-alias-label-primary-foreground:#fff}body{margin:0 auto;max-width:720px}*{box-sizing:border-box}#panel{min-width:0}</style><div id="panel"></div><script>window.registrations=[];window.cleanups=[];window.__ModuleLoader__={load:r=>window.registration=r}</script></html>`})
  })
  await page.goto('http://127.0.0.1:8759/')
  await page.addScriptTag({content:fs.readFileSync('node_modules/react/umd/react.production.min.js','utf8')})
  await page.addScriptTag({content:fs.readFileSync('node_modules/react-dom/umd/react-dom.production.min.js','utf8')})
  await page.addScriptTag({content:fs.readFileSync('lib/client.js','utf8')})
  await page.evaluate(copy=>{
    const plugin=registration.factory(s=>s==='react'?React:{jsx:(t,p)=>React.createElement(t,p),jsxs:(t,p)=>React.createElement(t,p),Fragment:React.Fragment})
    plugin.apply({slots:{register:(options,Component)=>{registrations.push({options,Component});return()=>{}},inject:()=>()=>{}},locale:{register:()=>()=>{},bind:()=>key=>copy[key]??key},effect:fn=>cleanups.push(fn())})
    const {options,Component}=registrations.find(r=>r.options.name==='settings.section'),binding=options.inject(),store=binding.hooks.settings
    window.settingsStore=store
    window.panelRoot=ReactDOM.createRoot(document.querySelector('#panel'))
    panelRoot.render(React.createElement(Component,{useSettings:selector=>selector(React.useSyncExternalStore(store.subscribe,store.getSnapshot)),save:binding.save,t:key=>copy[key]??key}))
  },zh)
  await page.getByRole('radio',{name:'均衡',exact:true}).waitFor()
  const selectedStyles=await page.evaluate(()=>{
    const read=node=>{const style=getComputedStyle(node);return {background:style.backgroundColor,color:style.color,shadow:style.boxShadow,weight:style.fontWeight}}
    return {intensity:read(document.querySelector('.lumina-segment[data-active="true"]')),performance:read(document.querySelector('.lumina-performance-choice[data-active="true"]'))}
  })
  assert.deepEqual(selectedStyles.performance,selectedStyles.intensity,'performance and intensity must share the selected appearance')
  const tops=await page.locator('.lumina-performance-choice').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().top))
  assert.equal(new Set(tops).size,1,'desktop presets must remain in one row')
  const info=page.getByRole('radio',{name:'均衡',exact:true})
  await info.hover();await page.getByRole('tooltip').waitFor()
  await page.getByRole('tooltip').hover();assert.equal(await page.getByRole('tooltip').count(),1)
  assert.ok((await page.getByRole('tooltip').innerText()).includes('1.6 MP'))
  await page.screenshot({path:`${out}/settings-desktop.png`})
  await page.keyboard.press('Escape');assert.equal(await page.getByRole('tooltip').count(),0)
  await page.getByRole('radio',{name:'极致画质',exact:true}).click()
  const feedbackSample=()=>page.evaluate(()=>{
    const button=document.querySelector('.lumina-performance-choice[data-active="true"]'),card=button.closest('.lumina-section'),glint=button.querySelector('.lumina-setting-glint')
    return {card:getComputedStyle(card).transform,edge:getComputedStyle(card,'::before').opacity,glint:glint?{opacity:getComputedStyle(glint).opacity,transform:getComputedStyle(glint).transform}:null}
  })
  const feedbackStart=await feedbackSample();await page.waitForTimeout(95);const feedbackMiddle=await feedbackSample()
  assert.ok(feedbackStart.glint && feedbackMiddle.glint,'selection feedback missing')
  assert.notEqual(feedbackStart.glint.transform,feedbackMiddle.glint.transform,'selection light is static')
  assert.equal(feedbackStart.card,'none','focused card must stay in place')
  assert.equal(feedbackMiddle.card,'none','focused card must stay in place')
  assert.ok(Number(feedbackMiddle.edge)>Number(feedbackStart.edge),'edge did not fade in')
  await page.waitForTimeout(400)
  assert.equal(await page.locator('.lumina-setting-glint').count(),0,'finished light remains in DOM')

  assert.equal(await page.evaluate(()=>settingsStore.getSnapshot().performance.profile),'balanced')
  await page.getByRole('button',{name:'保存',exact:true}).click()
  assert.equal(await page.evaluate(()=>settingsStore.getSnapshot().performance.profile),'ultra')
  await page.getByRole('radio',{name:'性能优先',exact:true}).click()
  await page.getByRole('button',{name:'取消',exact:true}).click()
  assert.equal(await page.getByRole('radio',{name:'极致画质',exact:true}).getAttribute('aria-checked'),'true')
  await page.setViewportSize({width:390,height:844})
  const narrowTops=await page.locator('.lumina-performance-choice').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().top))
  assert.equal(new Set(narrowTops).size,1,'narrow presets must remain in one row')
  assert.equal(await page.getByRole('combobox').count(),0)
  await page.getByRole('radio',{name:'极致画质',exact:true}).hover()
  await page.getByRole('tooltip').waitFor()
  const overflow=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth,tooltip:document.querySelector('[role="tooltip"]').getBoundingClientRect().right}))
  assert.ok(overflow.document<=overflow.viewport && overflow.tooltip<=overflow.viewport)
  await page.screenshot({path:`${out}/settings-narrow.png`})
  await page.keyboard.press('Escape')
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.getByRole('radio',{name:'画质优先',exact:true}).click()
  assert.equal(await page.locator('.lumina-setting-glint').count(),0,'reduced motion still flashes')
  assert.equal(await page.locator('.lumina-performance').evaluate(node=>getComputedStyle(node).transform),'none')
  await page.emulateMedia({reducedMotion:'no-preference'})
  // Browser-native pipeline compilation, sample counts, texture lifetime and finite draw geometry.
  await page.evaluate(()=>{panelRoot.unmount();cleanups.forEach(fn=>fn?.());document.body.innerHTML=''})
  const gpu=process.env.LUMINA_SETTINGS_ONLY === '1' ? [] : await page.evaluate(async()=>{
    const {setRenderBudget,RENDER_BUDGETS}=await import('/src/client/core/performance.ts')
    const {createRibbonRenderer}=await import('/src/client/effects/composer-ribbon-renderer.ts')
    if(!navigator.gpu)throw Error('WebGPU unavailable in fixture')
    const original=navigator.gpu.requestAdapter.bind(navigator.gpu),rows=[]
    navigator.gpu.requestAdapter=async options=>{
      const adapter=await original(options),request=adapter.requestDevice.bind(adapter)
      adapter.requestDevice=async()=>{
        const device=await request(),texture=device.createTexture.bind(device),pipeline=device.createRenderPipelineAsync.bind(device),submit=device.queue.submit.bind(device.queue)
        device.createTexture=options=>{window.currentGpu.textures.push({size:options.size,samples:options.sampleCount??1});return texture(options)}
        device.createRenderPipelineAsync=options=>{window.currentGpu.samples=options.multisample.count;window.currentGpu.columns=options.vertex.constants.columns;return pipeline(options)}
        device.queue.submit=commands=>{window.currentGpu.submits++;return submit(commands)}
        return device
      }
      return adapter
    }
    for(const profile of ['performance','balanced','quality','ultra']){
      setRenderBudget(profile);window.currentGpu={profile,textures:[],submits:0}
      const budget=RENDER_BUDGETS[profile],canvas=document.createElement('canvas')
      canvas.width=1040;canvas.height=520;canvas.style.cssText='width:100%;height:auto';document.body.append(canvas)
      let failed=false;const renderer=await createRibbonRenderer(canvas,()=>{failed=true})
      if(!renderer)throw Error('WebGPU renderer unavailable')
      const box={x:300,y:160,width:500,height:110},bounds={x:0,y:0,width:1040,height:520}
      renderer.render(1040,520,box,1,true,bounds)
      const first=window.currentGpu.textures.length
      renderer.render(1040,520,box,1.2,true,bounds)
      await new Promise(resolve=>setTimeout(resolve,100))
      rows.push({...window.currentGpu,failed,reusedTextures:first===window.currentGpu.textures.length,expected:budget.ribbonSamples})
      renderer.dispose();canvas.remove()
    }
    navigator.gpu.requestAdapter=original
    return rows
  })
  for(const row of gpu){assert.equal(row.samples,row.expected);assert.equal(row.submits,2);assert.ok(row.reusedTextures);assert.equal(row.failed,false)}
  assert.deepEqual(errors,[])
  fs.writeFileSync(`${out}/results.json`,JSON.stringify({settings:true,feedbackStart,feedbackMiddle,reducedMotion:true,overflow,gpu,errors},null,2))
  console.log(JSON.stringify({settings:true,narrowOverflow:false,gpu,errors,out},null,2))
}finally{await browser.close()}
