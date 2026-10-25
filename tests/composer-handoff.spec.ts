/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest'
import { composerHandoff } from '../src/client/effects/transfer/composer-handoff.ts'
const rect=(top:number)=>({left:100,top,width:600,height:140,right:700,bottom:top+140,x:100,y:top,toJSON(){}})
function card(top:number){document.documentElement.dataset.lumina='on';const node=document.createElement('div');node.setAttribute('data-composer-card','');node.getBoundingClientRect=()=>rect(top);document.body.append(node);return node}
afterEach(()=>document.body.replaceChildren())
describe('first-send layout handoff',()=>{
  it('carries text with the real composer, then restores its visual translation',()=>{
    const node=card(600),samples:number[]=[]
    const h=composerHandoff({firstSend:true,box:rect(280)},node,0,(_x,y)=>samples.push(y))
    h.update(0);expect(node.style.translate).toBe('0px -320px');expect(h.waiting).toBe(true)
    h.update(90);expect(samples.at(-1)).toBeCloseTo(160)
    h.update(180);expect(samples.at(-1)).toBe(320);expect(h.waiting).toBe(false)
    expect(node.style.translate).toBe('');expect(h.paused).toBe(180)
  })
  it('rebinds a replaced composer and cancels only its own translate',()=>{
    const old=card(280);old.remove();const next=card(600)
    const h=composerHandoff({firstSend:true,box:rect(280)},old,0,()=>{})
    h.update(0);expect(h.card).toBe(next);expect(next.style.translate).not.toBe('')
    h.dispose();expect(next.style.translate).toBe('');expect(next.hasAttribute('data-lumina-layout-handoff')).toBe(false)
  })
  it('bounds layout detection and never rewrites an existing host translate',()=>{
    const node=card(280);const h=composerHandoff({firstSend:true,box:rect(280)},node,0,()=>{})
    h.update(0);h.update(100);expect(h.waiting).toBe(false);expect(node.style.translate).toBe('')
    node.getBoundingClientRect=()=>rect(600);node.style.translate='12px 0px'
    const second=composerHandoff({firstSend:true,box:rect(280)},node,0,()=>{})
    expect(()=>second.update(0)).toThrow();second.dispose();expect(node.style.translate).toBe('12px 0px')
  })
})
