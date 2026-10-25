/** @vitest-environment jsdom */
import { describe,it,expect } from 'vitest'
import { placeViewportOverlay } from '../src/client/core/viewport.ts'

describe('viewport decoration positioning',()=>{
  it('keeps viewport geometry stable across repeated ancestor scale changes',()=>{
    const element=document.createElement('div');document.body.append(element)
    let zoom=.8
    element.getBoundingClientRect=()=>new DOMRect(13+parseFloat(element.style.left)*zoom,27+parseFloat(element.style.top)*zoom,parseFloat(element.style.width)*zoom,parseFloat(element.style.height)*zoom)
    const target={x:129,y:541,width:1311,height:459}
    for(zoom of [.8,1.2,.67,1.5,1]) {
      expect(placeViewportOverlay(element,target)).toBe(true)
      const rect=element.getBoundingClientRect()
      expect(rect.left).toBeCloseTo(target.x)
      expect(rect.top).toBeCloseTo(target.y)
      expect(rect.width).toBeCloseTo(target.width)
      expect(rect.height).toBeCloseTo(target.height)
    }
    element.remove()
  })
  it('keeps a square circular ripple centered despite unequal ancestor axes',()=>{
    const element=document.createElement('div');document.body.append(element)
    element.getBoundingClientRect=()=>new DOMRect(parseFloat(element.style.left)*.8,parseFloat(element.style.top)*1.2,parseFloat(element.style.width)*.8,parseFloat(element.style.height)*1.2)
    const target={x:600,y:400,width:40,height:40}
    placeViewportOverlay(element,target)
    const rect=element.getBoundingClientRect()
    expect(rect.width).toBeCloseTo(rect.height)
    expect(rect.left+rect.width/2).toBeCloseTo(620)
    expect(rect.top+rect.height/2).toBeCloseTo(420)
    element.remove()
  })
  it('skips detached or unmeasurable decorations',()=>{
    const element=document.createElement('div')
    expect(placeViewportOverlay(element,{x:0,y:0,width:40,height:40})).toBe(false)
    document.body.append(element)
    expect(placeViewportOverlay(element,{x:0,y:0,width:40,height:40})).toBe(false)
    expect(placeViewportOverlay(element,{x:0,y:0,width:0,height:40})).toBe(false)
    element.remove()
  })
})
