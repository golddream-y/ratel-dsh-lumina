import {toolRows, toolTarget, toolHeaderVisible, toolMutationRelevant, toolRowOwner, toolIconPlacement, type ToolTarget} from '../adapter/tool-targets.ts'
import {prefersReducedMotion, watchReducedMotion} from '../core/motion.ts'
import {TOOL_MOTION_BUDGET} from '../core/performance.ts'
import {installStyle} from '../core/styles.ts'
import {TOOL_MOTION} from '../style/tokens.ts'

const FLOW='data-lumina-tool-flow'
const active=(target:ToolTarget)=>target.state==='preparing'||target.state==='running'
type Entry={target:ToolTarget;visible:boolean;since:number;order:number;flow:HTMLElement|null;position:string;timer:ReturnType<typeof setTimeout>|undefined;animations:Set<Animation>}
export function toolMotionCss():string {
  return `[${FLOW}]{display:none;position:absolute;pointer-events:none!important;width:var(--lumina-tool-size,26px);height:var(--lumina-tool-size,26px);left:calc(var(--lumina-tool-x) - var(--lumina-tool-size)/2);top:calc(var(--lumina-tool-y) - var(--lumina-tool-size)/2);transform-origin:center;contain:layout style;}
html[data-lumina="on"] [${FLOW}]{display:block;opacity:.9;animation:lumina-tool-enter ${TOOL_MOTION.enter}ms ease-out;}
[${FLOW}][data-phase="preparing"]{opacity:.3!important;}
[${FLOW}] .lumina-tool-a,[${FLOW}] .lumina-tool-b{position:absolute;inset:0;border-radius:50%;pointer-events:none;}
[${FLOW}] .lumina-tool-a{background:radial-gradient(ellipse at 32% 44%,color-mix(in srgb,var(--lumina-brand-ratel) 40%,transparent),color-mix(in srgb,var(--lumina-brand-ratel) 18%,transparent) 35%,transparent 72%);animation:lumina-tool-a ${TOOL_MOTION.cycle}ms ease-in-out infinite;}
[${FLOW}] .lumina-tool-b{background:radial-gradient(ellipse at 66% 56%,color-mix(in srgb,var(--lumina-brand-deepseek) 32%,transparent),color-mix(in srgb,var(--lumina-brand-soft) 20%,transparent) 35%,transparent 72%);animation:lumina-tool-b ${TOOL_MOTION.cycle}ms ease-in-out infinite;}
@keyframes lumina-tool-enter{from{opacity:0}to{opacity:.9}}
@keyframes lumina-tool-a{0%,100%{transform:translate(-.6px,.3px) scale(.92);opacity:.6}50%{transform:translate(.6px,-.3px) scale(1.08);opacity:1}}
@keyframes lumina-tool-b{0%,100%{transform:translate(.5px,-.3px) scale(1.06);opacity:1}50%{transform:translate(-.5px,.3px) scale(.9);opacity:.55}}
html[data-lumina-motion-paused] [${FLOW}]{visibility:hidden;}
html[data-lumina-motion-paused] [${FLOW}],html[data-lumina-motion-paused] [${FLOW}] *{animation-play-state:paused!important;}
@media(prefers-reduced-motion:reduce){[${FLOW}]{display:none!important;}[${FLOW}],[${FLOW}] *{animation:none!important;}}
`
}
function makeFlow():HTMLElement {
  const span=document.createElement('span');span.setAttribute(FLOW,'');span.setAttribute('aria-hidden','true')
  // Two composited light fields; the native icon remains intact underneath.
  span.innerHTML='<span class="lumina-tool-a"></span><span class="lumina-tool-b"></span>'
  return span
}
export function installToolMotion():()=>void {
  const releaseStyle=installStyle('toolMotion',toolMotionCss())
  const entries=new Map<HTMLElement,Entry>()
  let disposed=false,queued=false,serial=0
  const cancelAnimations=(entry:Entry)=>{for(const animation of entry.animations)animation.cancel();entry.animations.clear()}
  const clearFlow=(entry:Entry)=>{
    if(!entry.flow)return
    entry.flow.remove();entry.flow=null
    if(entry.target.header.style.position==='relative')entry.target.header.style.position=entry.position
  }
  const clearTimer=(entry:Entry)=>{clearTimeout(entry.timer);entry.timer=undefined}
  const animate=(entry:Entry,node:HTMLElement,keyframes:Keyframe[],duration:number)=>{
    if(document.hidden||prefersReducedMotion()||typeof node.animate!=='function')return
    let animation:Animation
    try {animation=node.animate(keyframes,{duration,easing:'cubic-bezier(.22,.75,.25,1)'})} catch {return}
    entry.animations.add(animation)
    animation.onfinish=()=>{entry.animations.delete(animation);animation.cancel();schedule()}
  }
  const remove=(row:HTMLElement,entry:Entry)=>{
    clearTimer(entry);cancelAnimations(entry);clearFlow(entry)
    intersection?.unobserve(entry.target.header);resize?.unobserve(entry.target.header);entries.delete(row)
  }
  const finish=(entry:Entry,success:boolean)=>{
    clearTimer(entry)
    if(!entry.flow)return
    animate(entry,entry.flow,[{opacity:.9,transform:'scale(1)'},{opacity:0,transform:success?'scale(.65)':'none'}],success?TOOL_MOTION.settle:TOOL_MOTION.exit)
    entry.timer=setTimeout(()=>{entry.timer=undefined;clearFlow(entry);schedule()},success?TOOL_MOTION.settle:TOOL_MOTION.exit)
  }
  function refresh() {
    queued=false;if(disposed)return
    const now=performance.now(), candidates:Entry[]=[], placements=new Map<Entry,{x:number;y:number;size:number}>()
    for(const [row,entry] of entries) {
      const target=toolTarget(row)
      if(!target||target.key!==entry.target.key||target.header!==entry.target.header) {
        remove(row,entry)
        if(target&&active(target))add(row)
        continue
      }
      if(entry.flow&&!entry.flow.isConnected)clearFlow(entry)
      const previous=entry.target;entry.target=target
      const rect=entry.visible?toolHeaderVisible(target):null
      if(!rect||prefersReducedMotion()) {clearTimer(entry);cancelAnimations(entry);clearFlow(entry);continue}
      if(previous.state!==target.state) {
        cancelAnimations(entry)
        if(!active(target))finish(entry,target.state==='ok')
        else {
          clearTimer(entry);entry.since=now;entry.order=++serial
          if(previous.state==='preparing'&&target.state==='running')animate(entry,target.header,[{opacity:.7},{opacity:1}],TOOL_MOTION.enter)
        }
      }
      if(!previous.open&&target.open&&target.body)animate(entry,target.body,[{opacity:.5,transform:'translateY(-3px)'},{opacity:1,transform:'none'}],TOOL_MOTION.open)
      if(!active(target)) {if(!entry.flow && !entry.animations.size)remove(row,entry);continue}
      const remaining=TOOL_MOTION.delay-(now-entry.since)
      if(remaining>0) {if(!entry.timer)entry.timer=setTimeout(()=>{entry.timer=undefined;schedule()},remaining);continue}
      const placement=toolIconPlacement(target)
      if(!placement){clearFlow(entry);continue}
      placements.set(entry,placement);candidates.push(entry)
    }
    candidates.sort((a,b)=>b.order-a.order)
    const selected=new Set(candidates.slice(0,TOOL_MOTION_BUDGET.visible))
    for(const entry of candidates) {
      if(!selected.has(entry)) {clearFlow(entry);continue}
      if(!entry.flow) {
        entry.position=entry.target.header.style.position
        if(getComputedStyle(entry.target.header).position==='static')entry.target.header.style.position='relative'
        entry.flow=makeFlow();entry.target.header.append(entry.flow)
      }
      const placement=placements.get(entry)
      if(!placement){clearFlow(entry);continue}
      entry.flow.style.setProperty('--lumina-tool-x',`${placement.x}px`)
      entry.flow.style.setProperty('--lumina-tool-y',`${placement.y}px`)
      entry.flow.style.setProperty('--lumina-tool-size',`${placement.size}px`)
      entry.flow.dataset.phase=entry.target.state
    }
  }
  function schedule() {if(!disposed&&!queued){queued=true;queueMicrotask(refresh)}}
  const intersection=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(changes=>{
    for(const change of changes)for(const entry of entries.values())if(entry.target.header===change.target)entry.visible=change.isIntersecting
    schedule()
  })
  const resize=typeof ResizeObserver==='undefined'?null:new ResizeObserver(schedule)
  const add=(row:HTMLElement,opening=false)=>{
    if(entries.has(row)||entries.size>=TOOL_MOTION_BUDGET.tracked)return
    const target=toolTarget(row);if(!target)return
    const entry:Entry={target:opening?{...target,open:false}:target,visible:!!toolHeaderVisible(target),since:performance.now(),order:++serial,flow:null,position:target.header.style.position,timer:undefined,animations:new Set()}
    entries.set(row,entry);intersection?.observe(target.header);resize?.observe(target.header)
  }
  // Initial history is a baseline. Completed rows are only tracked on later disclosure/state events.
  toolRows(document).forEach(row=>{const target=toolTarget(row);if(target&&active(target))add(row)})
  const observer=new MutationObserver(records=>{
    let changed=[...entries.values()].some(entry=>!!entry.flow&&!entry.flow.isConnected)
    for(const record of records) {
      if(!toolMutationRelevant(record))continue
      changed=true
      if(record.type==='attributes') {
        const owner=toolRowOwner(record.target)
        if(owner)add(owner, record.attributeName==='aria-expanded' && record.oldValue==='false' || record.attributeName==='data-open' && record.oldValue===null)
      } else for(const node of record.addedNodes)toolRows(node).forEach(row=>{const target=toolTarget(row);if(target&&active(target))add(row)})
    }
    if(changed)schedule()
  })
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeOldValue:true,attributeFilter:['data-state','data-open','aria-expanded','data-conversation-session','data-chat-node-key','data-chat-flow-kind','data-tool','data-variant','hidden','aria-hidden','data-turn-process-hidden']})
  const resume=()=>{if(disposed)return;for(const entry of entries.values())entry.visible=!!toolHeaderVisible(entry.target);schedule()}
  const unwatch=watchReducedMotion(resume)
  document.addEventListener('visibilitychange',resume);document.addEventListener('scroll',resume,true)
  window.addEventListener('focus',resume);window.addEventListener('pageshow',resume);window.addEventListener('resize',resume)
  schedule()
  return ()=>{
    disposed=true;observer.disconnect();intersection?.disconnect();resize?.disconnect();unwatch()
    document.removeEventListener('visibilitychange',resume);document.removeEventListener('scroll',resume,true)
    window.removeEventListener('focus',resume);window.removeEventListener('pageshow',resume);window.removeEventListener('resize',resume)
    for(const [row,entry] of entries)remove(row,entry)
    releaseStyle()
  }
}
