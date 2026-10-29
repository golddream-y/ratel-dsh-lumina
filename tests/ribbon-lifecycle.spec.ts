// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { installComposerRibbon } from '../src/client/effects/composer-ribbon.ts'

const fixture = vi.hoisted(() => ({ scene: null as any, create: vi.fn(), pending: new Map<number, FrameRequestCallback>(), serial: 0 }))
vi.mock('../src/client/effects/composer-ribbon-renderer.ts', () => ({ createRibbonRenderer: fixture.create }))
vi.mock('../src/client/adapter/targets.ts', () => ({ composerRibbonScene: () => fixture.scene, composerRibbonReady: () => true, currentHeroSession: () => 'one' }))
vi.mock('../src/client/core/frame-scheduler.ts', () => ({
  requestMotionFrame: (fn: FrameRequestCallback) => { const id = ++fixture.serial; fixture.pending.set(id, fn); return id },
  cancelMotionFrame: (id: number) => fixture.pending.delete(id),
}))
vi.mock('../src/client/core/viewport.ts', () => ({ placeViewportOverlay: () => true, watchViewportScale: () => () => {} }))
let frames: Map<number, FrameRequestCallback>, hidden: boolean, dispose = () => {}
const settle = async () => { for (let i=0; i<8; i++) { await Promise.resolve(); const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(0)) } }
const renderer = () => ({ render: vi.fn(), dispose: vi.fn() })
beforeEach(() => {
  frames=new Map();hidden=false;fixture.serial=0;fixture.pending.clear();fixture.create.mockReset()
  Object.defineProperty(document,'hidden',{configurable:true,get:()=>hidden})
  vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{const id=++fixture.serial;frames.set(id,fn);return id})
  vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id))
  vi.stubGlobal('ResizeObserver',class {observe(){} disconnect(){}})
  vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}))
  document.body.innerHTML='<div id="area"><div id="card"><input></div><div id="mark"></div></div>'
  fixture.scene={area:document.querySelector('#area'),card:document.querySelector('#card'),mark:document.querySelector('#mark')}
  fixture.scene.card.getBoundingClientRect=()=>({x:300,y:300,left:300,top:300,width:500,height:150,right:800,bottom:450})
  document.querySelector('input')!.focus()
})
afterEach(()=>{dispose();dispose=()=>{};vi.restoreAllMocks();vi.unstubAllGlobals();document.body.innerHTML='';Object.defineProperty(document,'hidden',{configurable:true,value:false})})

it('pauses and resumes a focused ribbon without replacing its healthy GPU device',async()=>{
  const gpu=renderer();fixture.create.mockResolvedValue(gpu);dispose=installComposerRibbon();await settle()
  expect(fixture.pending.size).toBe(1)
  hidden=true;document.dispatchEvent(new Event('visibilitychange'));await settle()
  expect(fixture.pending.size).toBe(0)
  expect(gpu.dispose).not.toHaveBeenCalled()
  hidden=false;document.dispatchEvent(new Event('visibilitychange'));await settle()
  expect(fixture.pending.size).toBe(1);expect(fixture.create).toHaveBeenCalledTimes(1)
})
it('retries a failed renderer once on returning focus, and does not queue empty drawing',async()=>{
  const first=renderer(),second=renderer();let fail=()=>{}
  fixture.create.mockImplementationOnce((_canvas,failed)=>{fail=failed;return Promise.resolve(first)}).mockResolvedValue(second)
  dispose=installComposerRibbon();await settle()
  first.render.mockImplementationOnce(()=>fail())
  const tick=[...fixture.pending.values()];fixture.pending.clear();tick.forEach(fn=>fn(100))
  expect(fixture.pending.size).toBe(0)
  window.dispatchEvent(new Event('focus'));await settle()
  expect(fixture.create).toHaveBeenCalledTimes(2);expect(fixture.pending.size).toBe(1)
  expect(document.querySelector<HTMLCanvasElement>('.lumina-composer-ribbon')?.style.opacity).toBe('1')
})
it('disposes an async renderer that belongs to a scene already removed',async()=>{
  const stale=renderer(),fresh=renderer();let finish!:(value:ReturnType<typeof renderer>)=>void
  fixture.create.mockImplementationOnce(()=>new Promise(resolve=>finish=resolve)).mockResolvedValue(fresh)
  dispose=installComposerRibbon();await settle()
  const original=fixture.scene;fixture.scene=null;window.dispatchEvent(new Event('resize'));await settle()
  fixture.scene=original;window.dispatchEvent(new Event('resize'));await settle()
  // Never let two async pipelines configure the same canvas concurrently.
  expect(fixture.create).toHaveBeenCalledTimes(1)
  finish(stale);await settle();expect(stale.dispose).toHaveBeenCalledTimes(1)
  expect(fixture.create).toHaveBeenCalledTimes(2);expect(fixture.pending.size).toBe(1)
})
it('never resurrects a renderer or drawing task after uninstall',async()=>{
  let finish!:(value:ReturnType<typeof renderer>)=>void
  fixture.create.mockImplementation(()=>new Promise(resolve=>finish=resolve))
  dispose=installComposerRibbon();await settle();dispose();dispose=()=>{}
  const gpu=renderer();finish(gpu);await settle()
  window.dispatchEvent(new Event('focus'));await settle()
  expect(gpu.dispose).toHaveBeenCalledTimes(1);expect(fixture.pending.size).toBe(0)
  expect(document.querySelector('.lumina-composer-ribbon')).toBeNull()
})
