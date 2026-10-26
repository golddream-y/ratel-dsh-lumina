/** Controlled native-hook fixture: finite transitions, hit testing, zoom and cleanup. */
import {createRequire} from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.LUMINA_PLAYWRIGHT_PATH||'playwright')
const out=path.resolve('.local/diagnostics/2026-10-26-surface-motion/verified')
fs.mkdirSync(out,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'chrome'})
try {
  const page=await browser.newPage({viewport:{width:1000,height:740},deviceScaleFactor:2})
  const errors=[];page.on('pageerror',error=>errors.push(error.message))
  await page.route('http://127.0.0.1:8758/**',route=>{
    const file=new URL(route.request().url()).pathname.slice(1)
    if(file.startsWith('src/client/')&&file.endsWith('.ts')&&!file.includes('..'))return route.fulfill({contentType:'text/javascript',body:ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2024,module:ts.ModuleKind.ESNext}}).outputText})
    return route.fulfill({contentType:'text/html',body:`<!doctype html><html data-lumina="on"><style>
:root{--dsw-alias-interactive-bg-hover:#dce4f2}body{margin:40px;font:16px system-ui;background:#fff}button{padding:10px 20px}#tree{width:280px;position:relative;background:#f0f2f5;padding:8px;border-radius:16px}#tree>div{height:40px;line-height:40px;padding:0 12px;border-radius:10px;cursor:pointer}#tree>[aria-selected=true]{background:var(--dsw-alias-interactive-bg-hover)}.surface{background:#fff;box-shadow:0 8px 40px #18243730;border:1px solid #dce1ea;border-radius:16px;padding:24px}.dialog{position:fixed;left:380px;top:160px;width:340px}.menu{position:fixed;left:360px;top:110px;width:180px}</style><button id="trigger">Open</button><div id="tree" role="tree"><div role="treeitem" data-row-key="session:a" aria-selected="true">Alpha</div><div role="treeitem" data-row-key="session:b" aria-selected="false">Beta</div><div role="treeitem" data-row-key="session:c" aria-selected="false">Gamma</div></div><script type="module">
import {installSurfaceMotion} from '/src/client/effects/surface-motion.ts';import {installSessionSelection} from '/src/client/effects/session-selection.ts';
window.dispose=[installSurfaceMotion('dialog','normal'),installSurfaceMotion('menu','normal'),installSessionSelection('normal')];
window.openSurface=kind=>{const n=document.createElement('div');n.className='surface '+kind;if(kind==='dialog'){n.role='dialog';n.setAttribute('aria-modal','true');n.innerHTML='<h2>Dialog</h2><button id="close">Close</button>'}else{n.dataset.menuMaterial='translucent';n.role='menu';n.innerHTML='<button role="menuitem">Menu option</button>'}document.body.append(n);window.live=n};
window.select=id=>{for(const row of tree.children)if(row.hasAttribute('aria-selected'))row.setAttribute('aria-selected',String(row.dataset.rowKey==='session:'+id))};window.ready=true;
</script></html>`})
  })
  await page.goto('http://127.0.0.1:8758/');await page.waitForFunction(()=>window.ready)
  await page.bringToFront()
  const samples=[]
  for(const kind of ['dialog','menu']){
    await page.evaluate(kind=>openSurface(kind),kind)
    await page.waitForTimeout(30)
    const a=await page.evaluate(()=>({opacity:getComputedStyle(live).opacity,scale:getComputedStyle(live).scale,clip:getComputedStyle(live).clipPath}))
    await page.waitForTimeout(70)
    const b=await page.evaluate(()=>({opacity:getComputedStyle(live).opacity,scale:getComputedStyle(live).scale,clip:getComputedStyle(live).clipPath}))
    assert.notDeepEqual(a,b,kind+' must visibly progress');samples.push({kind,a,b})
    await page.waitForTimeout(200)
    await page.evaluate(()=>live.remove());await page.waitForTimeout(25)
    const exiting=await page.locator('[data-lumina-retired-surface]').evaluate(node=>({opacity:getComputedStyle(node).opacity,inert:node.inert,role:node.getAttribute('role'),pointer:getComputedStyle(node).pointerEvents,ids:node.querySelectorAll('[id]').length}))
    assert.equal(await page.locator('[data-lumina-retired-surface]').evaluate(node=>{const b=node.getBoundingClientRect();return node.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))}),false);
    assert.equal(await page.locator('[data-lumina-retired-surface]').evaluate(node=>getComputedStyle(node).padding),'24px','exit preserves native card padding');
    assert.equal(await page.locator('[data-lumina-retired-surface]').evaluate(node=>getComputedStyle(node).borderTopWidth),'1px');
    assert.equal(exiting.inert,true);assert.equal(exiting.pointer,'none');assert.equal(exiting.ids,0);assert.equal(exiting.role,null)
    await page.waitForTimeout(300);assert.equal(await page.locator('[data-lumina-retired-surface]').count(),0)
  }
  await page.evaluate(()=>select('b'));await page.waitForTimeout(25)
  const a=await page.locator('[data-lumina-selection-pill]').evaluate(node=>({y:node.getBoundingClientRect().top,transform:getComputedStyle(node).transform}))
  await page.waitForTimeout(85)
  const b=await page.locator('[data-lumina-selection-pill]').evaluate(node=>({y:node.getBoundingClientRect().top,transform:getComputedStyle(node).transform}))
  assert.ok(b.y>a.y);samples.push({kind:'selection',a,b})
  await page.screenshot({path:path.join(out,'selection.png')})
  await page.evaluate(()=>select('c'));await page.waitForTimeout(15)
  assert.equal(await page.locator('[data-lumina-selection-pill]').count(),1)
  await page.waitForTimeout(330)
  assert.equal(await page.locator('[data-lumina-selection-arriving]').count(),0)
  // CSS zoom: the exit visual remains on the exact last native card box.
  await page.evaluate(()=>document.body.style.zoom='.8')
  await page.evaluate(()=>openSurface('dialog'));await page.waitForTimeout(300)
  const before=await page.evaluate(()=>({x:live.getBoundingClientRect().x,y:live.getBoundingClientRect().y,width:live.getBoundingClientRect().width}))
  await page.evaluate(()=>live.remove());await page.waitForTimeout(15)
  const after=await page.locator('[data-lumina-retired-surface]').evaluate(node=>({x:node.getBoundingClientRect().x,y:node.getBoundingClientRect().y,width:node.getBoundingClientRect().width}))
  assert.ok(Math.abs(before.x-after.x)<4&&Math.abs(before.y-after.y)<4&&Math.abs(before.width-after.width)<6,'zoomed snapshot stays aligned')
  await page.waitForTimeout(300)
  await page.emulateMedia({reducedMotion:'reduce'})
  await page.evaluate(()=>openSurface('dialog'));await page.waitForTimeout(30)
  assert.equal(await page.evaluate(()=>live.getAnimations().length),0)
  await page.evaluate(()=>live.remove());await page.waitForTimeout(20)
  assert.equal(await page.locator('[data-lumina-retired-surface]').count(),0)
  await page.evaluate(()=>dispose.forEach(fn=>fn()))
  assert.equal(await page.locator('[data-lumina-dialog-surface],[data-lumina-menu-surface],[data-lumina-selection-pill]').count(),0)
  assert.deepEqual(errors,[])
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({samples,zoom:{before,after},errors},null,2))
  console.log(JSON.stringify({samples,zoomAligned:true,cleanup:true,reducedMotion:true,errors}))
} finally {await browser.close()}
