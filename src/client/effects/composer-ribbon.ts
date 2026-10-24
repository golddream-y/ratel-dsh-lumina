/** One bounded canvas for a focused, idle new-conversation composer. */
import { composerRibbonScene, composerRibbonReady, currentHeroSession } from '../adapter/targets.ts'
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
  const fail=()=>{unavailable=true;stop();renderer?.dispose();renderer=null;canvas.remove()}
  const initialize=()=>{
    if(renderer||initializing||unavailable||disposed) return
    initializing=true
    void createRibbonRenderer(canvas,fail).then(value=>{
      initializing=false
      if(disposed||unavailable) {value?.dispose();return}
      if(!value) {fail();return}
      renderer=value
      schedule()
    }).catch(()=>{initializing=false;fail()})
  }
  const stop=()=>{cancelAnimationFrame(raf);raf=0}
  const draw=(now:number)=>{
    if(disposed || document.hidden || prefersReducedMotion()) { stop();return }
    if(now-last>=12) {
      const elapsed=last?Math.min(60,now-last):0
      phase+=elapsed/1000;last=now
      if(bounds) renderer?.render(width,height,box,phase,true,bounds)
    }
    raf=requestAnimationFrame(draw)
  }
  const resize=new ResizeObserver(()=>schedule())
  const setVisible=(next:boolean)=>{
    if(next&&!renderer) {initialize();return}
    if(visible===next) return
    visible=next;clearTimeout(stopTimer)
    canvas.style.opacity=next?'1':'0'
    if(next) { if(!raf){last=0;raf=requestAnimationFrame(draw)} }
    else stopTimer=setTimeout(stop,460)
  }
  function update() {
    updateFrame=0
    if(disposed||unavailable) return
    const next=composerRibbonScene()
    if(!next || prefersReducedMotion() || document.hidden) {
      setVisible(false);stop();renderer?.dispose();renderer=null;canvas.remove();scene=null;resize.disconnect();return
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
    const dpr=Math.min(devicePixelRatio||1,2,Math.sqrt(2400000/(bounds.width*bounds.height)))
    const bw=Math.round(bounds.width*dpr),bh=Math.round(bounds.height*dpr)
    if(canvas.width!==bw || canvas.height!==bh) {canvas.width=bw;canvas.height=bh}
    Object.assign(canvas.style,{left:`${bounds.x}px`,top:`${bounds.y}px`,width:`${bounds.width}px`,height:`${bounds.height}px`})
    if(!canvas.isConnected) document.body.append(canvas)
    setVisible(next.card.contains(document.activeElement) && composerRibbonReady(next))
  }
  function schedule() {if(!disposed && !updateFrame) updateFrame=requestAnimationFrame(update)}
  const observer=new MutationObserver(records=>{
    if(records.every(record=>record.target===canvas)) return
    schedule()
  })
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-lumina-assembling','data-lumina-echo','data-lumina-echo-gate','data-phase','data-content-phase','data-conversation-session','data-sidebar-collapsed','data-rightbar-collapsed']})
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-lumina-echo-gate']})
  const events=['focusin','focusout','animationend','animationcancel','visibilitychange','scroll']
  events.forEach(event=>document.addEventListener(event,schedule,true));window.addEventListener('resize',schedule)
  const unwatch=watchReducedMotion(schedule)
  schedule()
  return ()=>{disposed=true;stop();cancelAnimationFrame(updateFrame);clearTimeout(stopTimer);observer.disconnect();resize.disconnect();unwatch();events.forEach(event=>document.removeEventListener(event,schedule,true));window.removeEventListener('resize',schedule);renderer?.dispose();renderer=null;canvas.remove()}
}
