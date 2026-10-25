/** Flow production-bundle fixture, not a real-client acceptance test.
 * Optional verification runtime: LUMINA_PLAYWRIGHT_PATH. Output: LUMINA_EVIDENCE_DIR.
 */
import fs from 'node:fs'
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
const require = createRequire(import.meta.url)
const { chromium } = require(process.env.LUMINA_PLAYWRIGHT_PATH || 'playwright')
const out = process.env.LUMINA_EVIDENCE_DIR || '/tmp/lumina-flow-evidence'
fs.mkdirSync(out, { recursive: true })
const html = `<!doctype html><html lang="zh"><meta charset="utf-8"><style>
html{font:17px system-ui;color:#263349;background:#f7f8fc;--dsw-alias-label-primary:#263349;--dsw-alias-label-tertiary:#778398;--dsw-alias-brand-primary-new-colorprimary-new-color:#4176e6;--dsw-alias-bg-layer-1:white}body{width:840px;margin:44px auto}h1{font-size:22px}small{color:#778398}#chat{height:260px;padding-top:125px;box-sizing:border-box}.row{display:flex;justify-content:flex-end}.bubble{max-width:500px;border-radius:18px;background:#eaf0fe;padding:17px 20px;line-height:1.8}.bubble span{white-space:pre-wrap}[data-composer-card]{position:relative;border:1px solid #ddd;border-radius:24px;padding:22px;background:white}[data-composer-input]{min-height:65px;outline:0;line-height:1.8}footer{display:flex;justify-content:space-between}button{border:0;width:40px;height:40px;border-radius:50%;font:23px system-ui}#send{background:#b6c9fa;color:white}p{font-size:13px;color:#778398}
</style><body><h1>流光发送转场 · 渲染核对</h1><small>实际插件构建 / 受控页面，非真实客户端录屏</small><div id="chat" data-conversation-content data-conversation-region="chat" data-conversation-session="one"></div><div data-composer-card><div data-composer-input contenteditable="true">整段文字交给流光，抵达后保持排版完整展开。</div><footer><button>＋</button><button id="send">↑</button></footer></div><p>文字收束 → 光绸牵出与流动 → 收进消息 → 整段展开</p><script>
localStorage.setItem('ratel-lumina/settings/v1',JSON.stringify({version:1,effects:{}}));
window.clock=0;window.tasks=new Map();window.rid=0;performance.now=()=>clock;
// Screenshot time must not expire the production watchdog while the animation clock is paused.
window.longTimers=new Map();window.timerId=0;const nativeTimeout=setTimeout,nativeClear=clearTimeout;
window.setTimeout=(fn,ms,...args)=>{if(ms<1500)return nativeTimeout(fn,ms,...args);const id=--timerId;longTimers.set(id,{at:clock+ms,fn:()=>fn(...args)});return id};window.clearTimeout=id=>{if(id<0)longTimers.delete(id);else nativeClear(id)};
requestAnimationFrame=fn=>{tasks.set(++rid,fn);return rid};cancelAnimationFrame=id=>tasks.delete(id);window.advance=t=>{clock=t;for(const [id,timer] of longTimers){if(timer.at<=clock){longTimers.delete(id);timer.fn()}}const q=[...tasks.values()];tasks.clear();q.forEach(fn=>fn(clock))};
window.face=value=>{const ls=new Set();return{getSnapshot:()=>value,subscribe:fn=>{ls.add(fn);return()=>ls.delete(fn)},set:next=>{value=next;ls.forEach(fn=>fn())}}};window.current=face({key:'one'});window.session=face({pendingSubmissions:[]});window.chat=face({order:['existing-assistant'],nodes:new Map([['existing-assistant',{data:{source:{kind:'assistant'}}}]])});window.cleanups=[];window.__ModuleLoader__={load:r=>window.registration=r};
document.querySelector('#send').onclick=()=>{const input=document.querySelector('[contenteditable]'),text=input.innerText;session.set({pendingSubmissions:[{requestId:'request-one',placement:'transcript',text,time:Date.now()}]});input.textContent='';const row=document.createElement('div');row.className='row';row.dataset.chatNodeKey='node-one';const bubble=document.createElement('div');bubble.className='bubble';const span=document.createElement('span');span.textContent=text;bubble.append(span);row.append(bubble);document.querySelector('#chat').append(row);chat.set({order:['node-one'],nodes:new Map([['node-one',{data:{source:{kind:'user',rpcId:'request-one'}}}]])})};
</script></body></html>`
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
try {
  const page = await browser.newPage({ viewport: { width: 1040, height: 680 }, deviceScaleFactor: 2 })
  const errors = []
  page.on('pageerror', e => errors.push(String(e)))
  await page.route('http://lumina.test/**', r => r.fulfill({ contentType: 'text/html', body: html }))
  const boot = async () => {
  await page.goto('http://lumina.test')
  await page.addScriptTag({ content: fs.readFileSync('node_modules/react/umd/react.production.min.js', 'utf8') })
  await page.addScriptTag({ content: fs.readFileSync('lib/client.js', 'utf8') })
  await page.evaluate(() => {
    const plugin = registration.factory(s => s === 'react' ? React : { jsx: (t, p) => React.createElement(t, p), jsxs: (t, p) => React.createElement(t, p), Fragment: React.Fragment })
    plugin.apply({ slots: { register: () => () => {}, inject: () => () => {} }, locale: { register: () => () => {}, bind: () => k => k }, effect: fn => cleanups.push(fn()), sessions: { binding: () => ({ session }) }, uiSession: { current }, uiConversation: { binding: () => ({ target: () => chat }) } })
  })
  }
  await boot()
  await page.locator('#send').click()
  const samples = []
  for (const t of [0, 40, 80, 100, 160, 240, 280, 360, 420, 480, 510, 540, 580, 600]) {
    await page.evaluate(t => advance(t), t)
    samples.push(await page.evaluate(t => {
      const root = document.querySelector('.lumina-transfer')
      const layers = root?.querySelectorAll('.lumina-transfer-layer')
      const source = layers?.[0], target = layers?.[1]
      return { t, mode: root?.dataset.mode, phase: root?.dataset.phase,
        sourceFilter: source?.style.filter, targetFilter: target?.style.filter,
        sourceBlock: source?.style.transform, targetBlock: target?.style.transform,
        targetOpacity: target?.style.opacity,
        sourceGlyphs: [...(source?.children ?? [])].map(n => n.style.transform),
        targetGlyphs: [...(target?.children ?? [])].map(n => n.style.transform),
        targetGlyphOpacity: [...(target?.children ?? [])].map(n => n.style.opacity),
        materialPath: root?.querySelector('[data-flow-part] path')?.getAttribute('d'),
        revealWidth: root?.querySelector('mask rect')?.getAttribute('width'), head: root?.dataset.flowHead, tail: root?.dataset.flowTail, connected: root?.dataset.liquidConnected,
        messageOpacity: document.querySelector('.row')?getComputedStyle(document.querySelector('.row')).opacity:null,
        messageBackground: document.querySelector('.bubble')?getComputedStyle(document.querySelector('.bubble')).backgroundColor:null,
        targetCopies: target?.childElementCount,
        bands: root?.querySelectorAll('[data-flow-part]').length ?? 0 }
    }, t))
    if ([80, 160, 280, 420, 510, 580, 600].includes(t)) await page.screenshot({ path: `${out}/${t}.png` })
  }
  const at = t => samples.find(s => s.t === t)
  assert.equal(at(0).mode, 'flow')
  assert.deepEqual(at(0).sourceGlyphs, at(80).sourceGlyphs)
  assert.notEqual(at(0).sourceBlock, at(80).sourceBlock)
  assert.equal(at(420).targetOpacity, '0')
  assert(Number(at(480).messageOpacity)>0 && Number(at(480).messageOpacity)<1)
  assert.equal(at(480).targetCopies,0)
  assert.equal(at(510).targetOpacity,'0')
  assert.notEqual(at(480).messageBackground,'rgba(0, 0, 0, 0)')
  assert.deepEqual(at(510).targetGlyphs, at(580).targetGlyphs)
  assert(Number(at(160).head)>Number(at(160).tail))
  assert(Number(at(420).tail)>0)
  assert.notEqual(at(160).materialPath,at(280).materialPath)
  assert.notEqual(at(280).revealWidth,at(420).revealWidth)
  assert.equal(at(600).mode, undefined)
  assert(samples.filter(s=>s.mode).every(s=>s.bands===1&&!s.sourceFilter&&!s.targetFilter))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const reduced = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  assert(reduced)
  await page.evaluate(() => cleanups.forEach(fn => fn?.()))
  const cleanup = await page.evaluate(() => ({ overlays: document.querySelectorAll('.lumina-transfer').length, masks: document.querySelectorAll('[data-lumina-transfer-mask]').length, styles: document.querySelectorAll('style[data-plugin="ratel-lumina"]').length }))
  assert.deepEqual(cleanup, { overlays: 0, masks: 0, styles: 0 })
  assert.equal(errors.length, 0)
  const boundaries = []
  for (const kind of ['resize', 'zoom', 'reduced', 'missing', 'replace-message']) {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await boot()
    await page.locator('#send').click()
    if (kind === 'missing') {
      await page.evaluate(() => { document.querySelector('#chat').replaceChildren(); chat.set({order:[],nodes:new Map()}); advance(0); advance(130) })
    } else {
      await page.evaluate(() => { advance(0); advance(480) })
      assert.equal(await page.locator('.lumina-transfer[data-mode="flow"]').count(), 1)
      if(kind==='replace-message'){
        await page.evaluate(()=>{
          const previous=document.querySelector('.row'),next=previous.cloneNode(true)
          next.removeAttribute('data-lumina-transfer-mask');next.removeAttribute('data-lumina-flow-reveal');next.removeAttribute('data-lumina-transfer-pending');next.style.removeProperty('--lumina-flow-progress')
          previous.replaceWith(next);advance(510)
        })
        assert(Number(await page.locator('.row').evaluate(node=>getComputedStyle(node).opacity))>0)
        assert.equal(await page.locator('.lumina-transfer-layer').nth(1).locator('span').count(),0)
        await page.evaluate(()=>cleanups.forEach(fn=>fn?.()))
      }
      if (kind === 'resize') await page.setViewportSize({width:1000,height:700})
      if (kind === 'zoom') await page.evaluate(() => document.documentElement.style.zoom='1.2')
      if (kind === 'reduced') await page.emulateMedia({reducedMotion:'reduce'})
      await page.waitForTimeout(80)
    }
    const remaining=await page.evaluate(()=>({overlays:document.querySelectorAll('.lumina-transfer').length,masks:document.querySelectorAll('[data-lumina-transfer-mask]').length,reveals:document.querySelectorAll('[data-lumina-flow-reveal]').length,variables:[...document.querySelectorAll('.row')].filter(node=>node.style.getPropertyValue('--lumina-flow-progress')).length}))
    assert.deepEqual(remaining,{overlays:0,masks:0,reveals:0,variables:0})
    await page.evaluate(()=>cleanups.forEach(fn=>fn?.()))
    boundaries.push({kind,...remaining})
  }
  fs.writeFileSync(`${out}/evidence.json`, JSON.stringify({ samples, reduced, cleanup, boundaries, errors }, null, 2))
  console.log(JSON.stringify({ frames: samples.length, mode: at(0).mode, coherentSource: true, coherentTarget: true, noTextBlur: true, reduced, cleanup, boundaries, errors, out }, null, 2))
} finally { await browser.close() }
