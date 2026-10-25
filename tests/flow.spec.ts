/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'
import { flowPlacement, flowWindow, createFlowRenderer } from '../src/client/effects/transfer/flow.ts'
import { parseConfig, DEFAULT_CONFIG } from '../src/client/core/config.ts'
import type { TransferStage } from '../src/client/effects/transfer/types.ts'

describe('light flow transfer', () => {
  it('defaults to flow and preserves explicit selections', () => {
    expect(DEFAULT_CONFIG.effects.sendTransition).toBe('flow')
    expect(parseConfig(JSON.stringify({version:1,effects:{sendTransition:'flow'}})).effects.sendTransition).toBe('flow')
    expect(parseConfig(JSON.stringify({version:1,effects:{sendTransition:'liquid'}})).effects.sendTransition).toBe('liquid')
    expect(parseConfig(null).effects.sendTransition).toBe('flow')
    expect(parseConfig(JSON.stringify({version:1,effects:{sendTransition:'off'}})).effects.sendTransition).toBe('off')
  })
  it('draws out the leading edge and consumes the tail independently', () => {
    expect(flowWindow(0)).toEqual({head:0,tail:0})
    expect(flowWindow(160).head).toBeGreaterThan(0)
    expect(flowWindow(160).tail).toBe(0)
    expect(flowWindow(390).tail).toBeGreaterThan(0)
    expect(flowWindow(390).head).toBeGreaterThan(flowWindow(390).tail)
    expect(flowWindow(560)).toEqual({head:1,tail:1})
    const from={x:150,y:300}
    for(const to of [{x:650,y:120},{x:48,y:340},{x:150,y:300}]) {
      const [a,b,c,d,e,f]=flowPlacement(from,to)
      expect([a,b,c,d,e,f].every(Number.isFinite)).toBe(true)
      expect(e!+c!*164).toBeCloseTo(from.x)
      expect(f!+d!*164).toBeCloseTo(from.y)
      expect(a!*1280+c!*150+e!).toBeCloseTo(to.x)
      expect(b!*1280+d!*150+f!).toBeCloseTo(to.y)
    }
  })
  it('keeps text coherent, finishes and removes every owned graphic', () => {
    const root=document.createElement('div'),ink=document.createElement('div'),sourceLayer=document.createElement('div'),targetLayer=document.createElement('div')
    const glyphs=[0,1,2].map(i=>({text:'字',x:20+i*15,y:300,width:15,height:20,font:'16px sans-serif',color:'black',letterSpacing:'normal'}))
    const sourceNodes=glyphs.map(()=>document.createElement('span')),targetNodes=glyphs.map(()=>document.createElement('span'))
    const element=document.createElement('div'),source={element,text:'字字字',glyphs,box:{left:20,top:300,right:65,bottom:320}}
    const stage:TransferStage={root,ink,sourceLayer,targetLayer,sourceNodes,targetNodes,source,target:source,copyGlyphs:glyphs,hub:{x:42,y:310},edge:{x:55,y:280},arrival:{x:500,y:100},origin:{x:0,y:0},pad:64,duration:600,intensity:'normal',mask(){}}
    const renderer=createFlowRenderer();renderer.enter?.(stage)
    renderer.render(0,stage);const positions=sourceNodes.map(n=>n.style.transform)
    renderer.render(1150*280/600,stage)
    expect(sourceNodes.map(n=>n.style.transform)).toEqual(positions)
    expect(sourceLayer.style.filter).toBe('')
    expect(ink.querySelectorAll('[data-flow-part="artwork"]')).toHaveLength(1)
    expect(ink.querySelectorAll('mask')).toHaveLength(1)
    expect(ink.querySelectorAll('path').length).toBeGreaterThan(20)
    expect(ink.querySelector('svg')?.getAttribute('fill')).toBe('none')
    expect([...ink.querySelectorAll('path')].every(p=>!/(NaN|Infinity)/.test(p.getAttribute('d')??''))).toBe(true)
    expect(targetLayer.style.opacity).toBe('0')
    expect(renderer.render(1150,stage)).toBe(true)
    expect(targetLayer.style.opacity).toBe('1')
    expect(targetLayer.style.transform).toContain('scale(1)')
    renderer.dispose?.(stage);expect(ink.childElementCount).toBe(0)
  })
})
