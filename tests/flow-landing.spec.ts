/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest'
import { flowLandingPoint, flowMessageReveal } from '../src/client/effects/transfer/flow-landing.ts'
import { transferCss, MASK } from '../src/client/effects/transfer/styles.ts'
afterEach(()=>document.body.replaceChildren())
const rect=(left:number,top:number,width:number,height:number)=>({left,top,width,height,right:left+width,bottom:top+height,x:left,y:top,toJSON(){}})
describe('flow message handover',()=>{
  it('lands on the near painted boundary, not the text centre',()=>{
    const bubble=document.createElement('div'),text=document.createElement('span');bubble.append(text);document.body.append(bubble)
    bubble.style.backgroundColor='rgb(220,230,250)';bubble.getBoundingClientRect=()=>rect(500,100,300,80)
    text.getBoundingClientRect=()=>rect(520,120,240,30)
    expect(flowLandingPoint(text,{x:100,y:600})).toEqual({x:518,y:179})
    expect(flowLandingPoint(text,{x:900,y:0})).toEqual({x:782,y:101})
    expect(flowLandingPoint(text,{x:100,y:140})).toEqual({x:501,y:140})
    expect(flowLandingPoint(text,{x:100,y:600},{left:500,top:100,right:800,bottom:130})).toEqual({x:518,y:129})
  })
  it('reveals a single real row including its background, then restores ownership',()=>{
    document.documentElement.dataset.lumina='on'
    const style=document.createElement('style');style.textContent=transferCss();document.body.append(style)
    const row=document.createElement('div');row.textContent='真实消息';row.style.backgroundColor='rgb(220,230,250)';row.style.transform='translateX(2px)';row.setAttribute(MASK,'one');row.setAttribute('data-lumina-transfer-pending','');document.body.append(row)
    const reveal=flowMessageReveal('one');reveal.update(row,.45)
    // jsdom does not resolve custom properties in opacity; browser fixture checks it.
    expect(row.style.getPropertyValue('--lumina-flow-progress')).toBe('0.45')
    expect(row.childElementCount).toBe(0);expect(row.textContent).toBe('真实消息')
    expect(row.style.transform).toBe('translateX(2px)')
    reveal.dispose();expect(row.hasAttribute('data-lumina-flow-reveal')).toBe(false)
    expect(row.style.getPropertyValue('--lumina-flow-progress')).toBe('')
    expect(row.style.backgroundColor).toBe('rgb(220, 230, 250)')
    expect(getComputedStyle(row).opacity).toBe('0')
  })
})
