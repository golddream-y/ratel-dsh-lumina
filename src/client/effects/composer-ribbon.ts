import { requestMotionFrame, cancelMotionFrame } from '../core/frame-scheduler.ts'
import { renderBudget } from '../core/performance.ts'
/** One bounded canvas for a focused, idle new-conversation composer. */
import { composerRibbonScene, composerRibbonReady, currentHeroSession } from '../adapter/targets.ts'
import { placeViewportOverlay, watchViewportScale } from '../core/viewport.ts'
import { prefersReducedMotion, watchReducedMotion } from '../core/motion.ts'
import type { RibbonBox } from './composer-ribbon-bounds.ts'
import { ribbonViewport, type RibbonViewport } from './composer-ribbon-bounds.ts'
import { createRibbonRenderer, type RibbonRenderer } from './composer-ribbon-renderer.ts'

export function installComposerRibbon(): () => void {
  if(typeof ResizeObserver === 'undefined') return ()=>{}
  const canvas=document.createElement('canvas')
  canvas.className='lumina-composer-ribbon'
  canvas.setAttribute('aria-hidden','true')
  canvas.draggable=false
  canvas.style.cssText='position:fixed;pointer-events:none;z-index:1;opacity:0;transition:opacity 450ms ease;contain:strict;-webkit-app-region:no-drag;app-region:no-drag;'
  canvas.style.setProperty('pointer-events','none','important')
  let scene: ReturnType<typeof composerRibbonScene>=null
  let box: RibbonBox={x:0,y:0,width:0,height:0}
  let bounds:RibbonViewport|null=null
  let width=0,height=0,raf=0,updateFrame=0,last=0,stopTimer: ReturnType<typeof setTimeout>|undefined
  let disposed=false,visible=false,phase=0,sessionKey: string|undefined
  let renderer: RibbonRenderer | null=null, initializing=false, unavailable=false
  let generation=0
  const releaseRenderer=()=>{
    generation++;stop();clearTimeout(stopTimer)
    visible=false;last=0;canvas.style.opacity='0'
    renderer?.dispose();renderer=null;canvas.remove()
  }
  const initialize=()=>{
    if(renderer||initializing||unavailable||disposed) return
    initializing=true
    const attempt=++generation
    const fail=()=>{
      if(disposed||attempt!==generation) return
      unavailable=true;releaseRenderer()
    }
    void createRibbonRenderer(canvas,fail).then(value=>{
      initializing=false
      if(disposed||attempt!==generation) {value?.dispose();schedule();return}
      if(!value) {fail();return}
      renderer=value
      schedule()
    }).catch(()=>{initializing=false;if(attempt===generation) fail();else schedule()})
  }
  const stop=()=>{cancelMotionFrame(raf);raf=0}
  const draw=(now:number)=>{
    if(disposed || document.hidden || prefersReducedMotion()) { stop();return }
    {
      const elapsed=last?Math.min(60,now-last):0
      phase+=elapsed/1000;last=now
      if(bounds) renderer?.render(width,height,box,phase,true,bounds)
    }
    if(!disposed && !unavailable && renderer) raf=requestMotionFrame(draw, 'background')
  }
  const resize=new ResizeObserver(()=>schedule())
  const setVisible=(next:boolean)=>{
    if(next&&!renderer) {initialize();return}
    if(visible===next) return
    visible=next;clearTimeout(stopTimer)
    canvas.style.opacity=next?'1':'0'
    if(next) { if(!raf){last=0;raf=requestMotionFrame(draw, 'background')} }
    else stopTimer=setTimeout(stop,460)
  }
  function update() {
    updateFrame=0
    if(disposed||unavailable) return
    if(document.hidden) {setVisible(false);stop();last=0;return}
    const next=composerRibbonScene()
    if(!next || prefersReducedMotion()) {
      releaseRenderer();scene=null;resize.disconnect();return
    }
    const key=currentHeroSession()
    if(key!==sessionKey || next.card!==scene?.card || next.mark!==scene?.mark) {
      phase=0;last=0;sessionKey=key
    }
    if(next.card!==scene?.card || next.area!==scene?.area) {
      resize.disconnect();resize.observe(next.card);resize.observe(next.area)
    }
    scene=next
    const card=next.card.getBoundingClientRect()
    width=innerWidth
    height=innerHeight
    if(width<10 || height<10 || card.width<10 || card.height<10) {setVisible(false);stop();canvas.remove();return}
    box={x:card.left,y:card.top,width:card.width,height:card.height}
    bounds=ribbonViewport(width,height,box)
    if(!bounds) {setVisible(false);stop();canvas.remove();return}
    const dpr=Math.min(devicePixelRatio||1,renderBudget().ribbonDpr,Math.sqrt(renderBudget().ribbonPixels/(bounds.width*bounds.height)))
    const bw=Math.round(bounds.width*dpr),bh=Math.round(bounds.height*dpr)
    if(canvas.width!==bw || canvas.height!==bh) {canvas.width=bw;canvas.height=bh}
    if(!canvas.isConnected) document.body.append(canvas)
    if(!placeViewportOverlay(canvas,bounds)) {setVisible(false);stop();canvas.remove();return}
    setVisible(next.card.contains(document.activeElement) && composerRibbonReady(next))
  }
  function schedule() {if(!disposed && !updateFrame) updateFrame=requestAnimationFrame(update)}
  const observer=new MutationObserver(records=>{
    if(records.every(record=>record.target===canvas)) return
    schedule()
  })
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-lumina-assembling','data-lumina-echo','data-lumina-echo-gate','data-phase','data-content-phase','data-conversation-session','data-sidebar-collapsed','data-rightbar-collapsed']})
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-lumina-echo-gate']})
  const unwatchViewport=watchViewportScale(schedule)
  const onBlur=()=>{last=0}
  const onResume=()=>{
    if(disposed) return
    last=0
    if(document.hidden) {setVisible(false);stop();return}
    unavailable=false
    schedule()
  }
  window.addEventListener('blur',onBlur)
  window.addEventListener('focus',onResume)
  window.addEventListener('pageshow',onResume)
  document.addEventListener('visibilitychange',onResume)
  const events=['focusin','focusout','animationend','animationcancel','scroll']
  events.forEach(event=>document.addEventListener(event,schedule,true));window.addEventListener('resize',schedule)
  const unwatch=watchReducedMotion(schedule)
  schedule()
  return ()=>{disposed=true;releaseRenderer();window.removeEventListener('blur',onBlur);window.removeEventListener('focus',onResume);window.removeEventListener('pageshow',onResume);document.removeEventListener('visibilitychange',onResume);stop();cancelAnimationFrame(updateFrame);clearTimeout(stopTimer);observer.disconnect();unwatchViewport();resize.disconnect();unwatch();events.forEach(event=>document.removeEventListener(event,schedule,true));window.removeEventListener('resize',schedule);renderer?.dispose();renderer=null;canvas.remove()}
}
