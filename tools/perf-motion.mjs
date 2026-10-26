/** Isolated real-module canvas A/B; not a measurement of the installed client's GPU.
 * LUMINA_PLAYWRIGHT_PATH points to an optional external Playwright installation.
 * LUMINA_BASELINE_REF defaults to the published v0.7.0 tag; output stays local.
 */
import { createRequire } from 'node:module'
import { createServer } from 'node:http'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import ts from 'typescript'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.LUMINA_PLAYWRIGHT_PATH || 'playwright')
const out = resolve(process.env.LUMINA_EVIDENCE_DIR || '.local/diagnostics/2026-10-26-performance')
mkdirSync(out, { recursive: true })
const baseline = process.env.LUMINA_BASELINE_REF || 'v0.7.0', cache = new Map()
const html = `<!doctype html><html data-lumina="on"><style>
html{font:14px system-ui;background:#fff;color:#242933}body{margin:24px}aside{width:300px;background:#e4e6ec;padding:12px;border-radius:16px}.row{position:relative;height:52px;margin:8px 0;background:#d8deeb;border-radius:12px;display:flex;align-items:center;padding:0 14px;box-sizing:border-box}.lumina-session-galaxy{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;border-radius:inherit}span{position:relative;z-index:1}
</style><aside></aside><script>
for(let i=0;i<3;i++){const row=document.createElement('div');row.className='row';row.setAttribute('data-row-key','session:'+i);row.innerHTML='<span>Running session '+(i+1)+'</span><svg data-state="ongoing"></svg>';document.querySelector('aside').append(row)}
window.counts={draws:0,gradients:0,styleReads:0};
const clear=CanvasRenderingContext2D.prototype.clearRect,gradient=CanvasRenderingContext2D.prototype.createLinearGradient,style=getComputedStyle;
CanvasRenderingContext2D.prototype.clearRect=function(...args){counts.draws++;return clear.apply(this,args)};
CanvasRenderingContext2D.prototype.createLinearGradient=function(...args){counts.gradients++;return gradient.apply(this,args)};
window.getComputedStyle=function(node,...args){if(node.matches?.('.row'))counts.styleReads++;return style.call(window,node,...args)};
</script>`
const server = createServer((req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost')
    if(url.pathname === '/') {res.writeHead(200,{'Content-Type':'text/html'}).end(html);return}
    const match = url.pathname.match(/^\/(baseline|current)\/(src\/client\/[\w./-]+\.ts)$/)
    if(!match || match[2].includes('..')) {res.writeHead(404).end();return}
    const [, mode, file] = match, key = `${mode}:${file}`
    if(!cache.has(key)) {
      const source = mode === 'baseline' ? execFileSync('git',['show',`${baseline}:${file}`],{encoding:'utf8'}) : readFileSync(file,'utf8')
      cache.set(key,ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2024,module:ts.ModuleKind.ESNext}}).outputText)
    }
    res.writeHead(200,{'Content-Type':'text/javascript'}).end(cache.get(key))
  } catch(error) {res.writeHead(500).end(String(error))}
})
await new Promise(done=>server.listen(0,'127.0.0.1',done))
const origin=`http://127.0.0.1:${server.address().port}`
let browser
try {
  browser=await chromium.launch({headless:true,channel:'chrome'})
  const results=[]
  for(let round=0;round<2;round++)for(const profile of ['baseline','balanced','performance','quality','ultra']) {
    const page=await browser.newPage({viewport:{width:1040,height:680},deviceScaleFactor:2})
    const errors=[];page.on('pageerror',error=>errors.push(String(error)))
    await page.goto(origin);await page.bringToFront()
    const mode=profile==='baseline'?'baseline':'current'
    await page.evaluate(async({mode,profile})=>{
      if(mode==='current'){const {setRenderBudget}=await import(`/${mode}/src/client/core/performance.ts`);setRenderBudget(profile)}
      const {installSessionGalaxy}=await import(`/${mode}/src/client/effects/session-galaxy.ts`)
      window.dispose=installSessionGalaxy()
    },{mode,profile})
    await page.waitForFunction(()=>document.querySelectorAll('canvas').length===3)
    await page.waitForTimeout(350)
    const cdp=await page.context().newCDPSession(page);await cdp.send('Performance.enable')
    const metrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]))
    const before=await metrics()
    const started=await page.evaluate(()=>{counts={draws:0,gradients:0,styleReads:0};return performance.now()})
    await page.waitForTimeout(2000)
    const sample=await page.evaluate(()=>({...counts,time:performance.now()})),after=await metrics()
    const seconds=(sample.time-started)/1000
    const result={round,profile,seconds,perRowFps:sample.draws/3/seconds,...sample,taskMs:(after.TaskDuration-before.TaskDuration)*1000,scriptMs:(after.ScriptDuration-before.ScriptDuration)*1000,styleRecalcs:after.RecalcStyleCount-before.RecalcStyleCount,layouts:after.LayoutCount-before.LayoutCount}
    if(mode==='current'){
      assert.equal(sample.styleReads,0,'per-frame row style reads returned')
      assert.ok(sample.gradients<=sample.draws*3+10,'static gradients were rebuilt')
      await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.waitForTimeout(60)
      const stopped=await page.evaluate(()=>counts.draws);await page.waitForTimeout(180)
      assert.equal(await page.evaluate(()=>counts.draws),stopped,'unfocused drawing continues')
      await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(100)
      assert.ok(await page.evaluate(()=>counts.draws)>stopped,'focus did not resume')
      await page.evaluate(()=>window.dispose());await page.waitForTimeout(60)
      assert.equal(await page.locator('canvas').count(),0)
    }else await page.evaluate(()=>window.dispose())
    assert.deepEqual(errors,[])
    results.push(result);console.log(JSON.stringify(result));await page.close()
  }
  writeFileSync(`${out}/canvas-ab.json`,JSON.stringify({baseline,viewport:[1040,680],dpr:2,sampleMs:2000,results},null,2))
}finally{await browser?.close();server.close()}
