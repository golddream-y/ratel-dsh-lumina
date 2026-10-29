// @vitest-environment jsdom
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {installToolMotion} from '../src/client/effects/tool-motion.ts'
import {toolTarget,toolIconPlacement} from '../src/client/adapter/tool-targets.ts'
import {parseConfig} from '../src/client/core/config.ts'
let dispose=()=>{},hidden=false,reduced=false
let entries:IntersectionObserverCallback[]=[]
const settle=async()=>{for(let i=0;i<6;i++)await Promise.resolve()}
const tick=async(n=220)=>{vi.advanceTimersByTime(n);await settle()}
const row=(id:string,state='running',variant='read',extra='')=>`<div data-chat-flow-kind="tool-call" data-chat-node-key="${id}"><div data-tool="read_file" data-variant="${variant}" data-state="${state}" ${extra}><div data-open><div data-disclosure-header><div data-disclosure-row role="button" tabindex="0" aria-expanded="false"><span data-test-leading><svg viewBox="0 0 16 16"></svg></span>读取文件</div></div></div></div></div>`
const roots=()=>[...document.querySelectorAll<HTMLElement>('[data-tool]')]
const flows=()=>document.querySelectorAll('[data-lumina-tool-flow]')
beforeEach(()=>{
 vi.useFakeTimers();hidden=false;reduced=false;entries=[]
 Object.defineProperty(document,'hidden',{configurable:true,get:()=>hidden})
 vi.stubGlobal('matchMedia',()=>({matches:reduced,addEventListener(){},removeEventListener(){}}))
 vi.stubGlobal('IntersectionObserver',class{constructor(callback:IntersectionObserverCallback){entries.push(callback)}observe(){}unobserve(){}disconnect(){}})
 vi.stubGlobal('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}})
 vi.spyOn(Element.prototype,'getBoundingClientRect').mockImplementation(function(this:Element){
  return this.hasAttribute('data-test-leading')?{x:20,y:106,left:20,top:106,width:16,height:16,right:36,bottom:122,toJSON(){}}:{x:20,y:100,left:20,top:100,width:300,height:28,right:320,bottom:128,toJSON(){}}
 })
 document.documentElement.dataset.lumina='on'
 document.body.innerHTML='<div data-conversation-content data-conversation-region="chat" data-conversation-session="one"></div>'
})
afterEach(()=>{dispose();dispose=()=>{};vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';document.head.innerHTML='';delete document.documentElement.dataset.lumina;Object.defineProperty(document,'hidden',{configurable:true,value:false})})
const fill=(html:string)=>document.querySelector('[data-conversation-content]')!.innerHTML=html
it('defaults new preferences without resetting existing settings',()=>{
 expect(parseConfig(JSON.stringify({version:1,brand:'ratel',effects:{sendTransition:'ghost'}}))).toMatchObject({brand:'ratel',effects:{toolMotion:true,sendTransition:'ghost'}})
 expect(parseConfig(JSON.stringify({version:1,effects:{toolMotion:false}})).effects.toolMotion).toBe(false)
})
it('caps continuous decoration, preserves content and releases all style changes',async()=>{
 fill(row('a')+row('b')+row('c'));dispose=installToolMotion();await tick()
 expect(flows()).toHaveLength(2)
 expect(document.querySelectorAll('[data-disclosure-row]')).toHaveLength(3)
 roots()[2]!.dataset.state='ok';await settle();await tick(300)
 expect(flows()).toHaveLength(2) // The next native running tool receives the freed slot.
 dispose();expect(flows()).toHaveLength(0)
 expect([...document.querySelectorAll<HTMLElement>('[data-disclosure-header]')].every(n=>n.style.position==='')).toBe(true)
 expect(vi.getTimerCount()).toBe(0)
})
it('does not flash on fast completion or animate completed history',async()=>{
 fill(row('done','ok')+row('fast'));dispose=installToolMotion();await tick(80)
 roots()[1]!.dataset.state='ok';await settle();await tick(400)
 expect(flows()).toHaveLength(0)
 expect(vi.getTimerCount()).toBe(0)
})
it('withdraws on failure and resumes only still-running tools after visibility returns',async()=>{
 fill(row('one'));dispose=installToolMotion();await tick();expect(flows()).toHaveLength(1)
 hidden=true;document.dispatchEvent(new Event('visibilitychange'));await settle();expect(flows()).toHaveLength(0)
 roots()[0]!.dataset.state='ok';await settle()
 hidden=false;window.dispatchEvent(new Event('focus'));await tick();expect(flows()).toHaveLength(0)
 roots()[0]!.dataset.state='running';await tick();await tick();expect(flows()).toHaveLength(1)
 roots()[0]!.dataset.state='error';await settle();await tick(150);expect(flows()).toHaveLength(0)
})
it('skips unknown, question and multi-row nested cards',async()=>{
 fill(row('unknown','running','others')+row('ask','running','read','data-ignore=""')+`<div data-chat-flow-kind="tool-call" data-chat-node-key="nested"><div data-tool="a" data-variant="read" data-state="running"></div><div data-tool="b" data-variant="read" data-state="running"></div></div>`)
 roots()[1]!.dataset.tool='ask_user_question';dispose=installToolMotion();await tick()
 expect(flows()).toHaveLength(0);expect(toolTarget(roots()[2]!)).toBeNull()
})
it('stays static for reduced motion and ignores streamed log additions',async()=>{
 reduced=true;fill(row('one'));dispose=installToolMotion();await tick();expect(flows()).toHaveLength(0)
 const output=document.createElement('pre');roots()[0]!.append(output);output.textContent='log chunk';await settle()
 expect(flows()).toHaveLength(0);expect(vi.getTimerCount()).toBe(0)
})
it('handles the native Bash title and cleans up a detached running card',async()=>{
 fill('<div data-chat-flow-kind="tool-call" data-chat-node-key="bash"><div data-sample="bash" data-variant="bash" data-state="running" role="button" aria-expanded="false"><span data-test-leading><svg viewBox="0 0 16 16"></svg></span>执行命令</div></div>')
 dispose=installToolMotion();await tick();expect(flows()).toHaveLength(1)
 document.querySelector('[data-chat-node-key]')!.remove();await settle();expect(flows()).toHaveLength(0);expect(vi.getTimerCount()).toBe(0)
})
it('removes active decoration when its visible ancestor becomes hidden',async()=>{
 fill(row('one'));dispose=installToolMotion();await tick();expect(flows()).toHaveLength(1)
 document.querySelector('[data-chat-node-key]')!.setAttribute('hidden','');await settle();expect(flows()).toHaveLength(0)
})

it('anchors light on the native icon and skips cards without a valid leading slot',async()=>{
 fill(row('one'));dispose=installToolMotion();await tick()
 const flow=flows()[0] as HTMLElement
 expect(flow.style.getPropertyValue('--lumina-tool-x')).toBe('8px')
 expect(flow.style.getPropertyValue('--lumina-tool-y')).toBe('14px')
 expect(parseFloat(flow.style.getPropertyValue('--lumina-tool-size'))).toBeLessThanOrEqual(30)
 expect(flow.querySelector('svg')).toBeNull()
 const target=toolTarget(roots()[0]!)!
 target.header.querySelector('[data-test-leading]')!.remove()
 expect(toolIconPlacement(target)).toBeNull()
 window.dispatchEvent(new Event('resize'));await settle();expect(flows()).toHaveLength(0)
})
