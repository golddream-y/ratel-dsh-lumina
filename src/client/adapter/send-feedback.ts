/** Confirm local gestures through public submission metadata, independently of transfer modes. */
import { cssSelector } from './selector.ts'
import { sendControl } from './targets.ts'
import type { TransferServices } from './send-transfer.ts'

export function observeSendFeedback(services: TransferServices, running: () => boolean,
  acknowledge: (button: HTMLButtonElement, rect: DOMRect) => void, reset: () => void): () => void {
  const ui=services.uiSession?.current, sessions=services.sessions
  if(!ui||!sessions) return ()=>{}
  let sessionId: string|undefined, bound=false, dead=false
  let release=()=>{}, retry:ReturnType<typeof setTimeout>|undefined
  let anchor: {button:HTMLButtonElement;rect:DOMRect}|null=null
  const seen=new Set<string>()
  const gestures:Array<{button:HTMLButtonElement;rect:DOMRect;time:number;wall:number}>=[]
  const prune=()=>{while(gestures[0]&&performance.now()-gestures[0].time>1500)gestures.shift()}
  const cancel=()=>{anchor=null;gestures.length=0;clearTimeout(retry);reset()}
  const bind=()=>{
    if(dead)return
    try {
      const id=ui.getSnapshot().key
      if(id===sessionId&&bound)return
      if(sessionId!==undefined&&id!==sessionId)cancel()
      release();release=()=>{};bound=false;seen.clear();sessionId=id
      if(!id)return
      const face=sessions.binding(id)?.session
      if(!face)return
      const update=()=>{
        prune()
        for(const entry of face.getSnapshot().pendingSubmissions??[]) {
          if(seen.has(entry.requestId))continue
          seen.add(entry.requestId)
          if(seen.size>200)seen.delete(seen.values().next().value!)
          if(entry.placement!=='transcript')continue
          const index=gestures.findIndex(g=>entry.time===undefined||entry.time>=g.wall)
          if(index<0)continue
          const gesture=gestures.splice(index,1)[0]!
          acknowledge(gesture.button,gesture.rect)
        }
      }
      // Existing entries on an ordinary bind are history, not new local sends.
      if(!gestures.length)for(const entry of face.getSnapshot().pendingSubmissions??[])seen.add(entry.requestId)
      release=face.subscribe(update);bound=true;update()
    } catch {bound=false}
  }
  const awaitBinding=()=>{
    clearTimeout(retry);prune();bind()
    if(!bound&&gestures.length&&!dead)retry=setTimeout(awaitBinding,40)
  }
  const capture=(event:Event)=>{
    if(document.hidden||running()||document.documentElement.dataset.lumina!=='on')return
    const target=event.target
    if(!(target instanceof Element))return
    const card=target.closest(cssSelector('composerCard'))
    if(!card)return
    const button=sendControl(card)
    if(!button)return
    if(event instanceof KeyboardEvent) {
      if(event.key!=='Enter'||event.isComposing||event.keyCode===229||event.repeat||!target.closest(cssSelector('composerInput')))return
    } else if(target.closest('button')!==button)return
    prune()
    if(gestures.length>=4)gestures.shift()
    anchor={button,rect:button.getBoundingClientRect()}
    gestures.push({...anchor,time:performance.now(),wall:Date.now()})
    awaitBinding()
  }
  const scroll=(event:Event)=>{
    if(!anchor)return
    const target=event.target
    if(target instanceof Element&&!target.contains(anchor.button))return
    const rect=anchor.button.getBoundingClientRect()
    if(!anchor.button.isConnected||Math.abs(rect.left-anchor.rect.left)>1||Math.abs(rect.top-anchor.rect.top)>1)cancel()
  }
  const hidden=()=>{if(document.hidden)cancel()}
  const releaseCurrent=ui.subscribe(bind)
  bind()
  document.addEventListener('click',capture,true);document.addEventListener('keydown',capture,true)
  document.addEventListener('visibilitychange',hidden)
  window.addEventListener('resize',cancel);window.addEventListener('scroll',scroll,true)
  return ()=>{dead=true;cancel();release();releaseCurrent();document.removeEventListener('click',capture,true);document.removeEventListener('keydown',capture,true);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('resize',cancel);window.removeEventListener('scroll',scroll,true)}
}
