/** Bounded first-send layout handoff. Only a reversible visual translate is owned. */
import type { ComposerCapture } from '../../adapter/send-transfer.ts'
import { cssSelector } from '../../adapter/selector.ts'
import { smooth } from '../liquid-geometry.ts'

export interface ComposerHandoff {
  card: HTMLElement
  paused: number
  waiting: boolean
  update(now: number): void
  dispose(): void
}

export function composerHandoff(
  capture: ComposerCapture,
  initial: HTMLElement,
  started: number,
  onPosition: (dx:number,dy:number,card:HTMLElement,final:boolean)=>void,
): ComposerHandoff {
  let motionStart:number|null=null,finished=false,dx=0,dy=0,scale=1,lastWritten=''
  let original='',priority=''
  const restore=()=>{
    state.card.removeAttribute('data-lumina-layout-handoff')
    if(lastWritten && state.card.style.getPropertyValue('translate')===lastWritten) {
      if(original)state.card.style.setProperty('translate',original,priority)
      else state.card.style.removeProperty('translate')
    }
    lastWritten=''
  }
  const state:ComposerHandoff={card:initial,paused:0,waiting:true,
    update(now) {
      if(finished)return
      if(motionStart!==null) {
        if(!state.card.isConnected)throw Error('composer replaced during handoff')
        const p=smooth((now-motionStart)/180)
        lastWritten=`${-dx*(1-p)/scale}px ${-dy*(1-p)/scale}px`
        state.card.style.setProperty('translate',lastWritten)
        lastWritten=state.card.style.getPropertyValue('translate')
        onPosition(dx*p,dy*p,state.card,p===1)
        state.paused=now-started
        if(p===1){restore();finished=true;state.waiting=false}
        return
      }
      // This read window is bounded to the first 96ms; never measure during flight.
      const visible=Array.from(document.querySelectorAll<HTMLElement>(cssSelector('composerCard'))).filter(card=>card.isConnected&&card.getBoundingClientRect().width>0&&card.getBoundingClientRect().height>0)
      if(visible.length!==1)throw Error('ambiguous first-send composer')
      const next=visible[0]!,rect=next.getBoundingClientRect()
      if(capture.box.width<=0 || Math.abs(rect.width/capture.box.width-1)>.15)throw Error('composer width changed during handoff')
      dx=rect.left-capture.box.left;dy=rect.top-capture.box.top
      if(Math.hypot(dx,dy)>4) {
        state.card=next
        original=next.style.getPropertyValue('translate');priority=next.style.getPropertyPriority('translate')
        if(original&&original!=='none')throw Error('composer already owns a translate')
        scale=rect.width/(next.offsetWidth||rect.width)
        next.setAttribute('data-lumina-layout-handoff','active')
        motionStart=now
        state.update(now)
        return
      }
      state.card=next
      state.paused=now-started
      if(now-started>=96){finished=true;state.waiting=false;onPosition(0,0,next,true)}
    },
    dispose(){restore();finished=true;state.waiting=false},
  }
  return state
}
