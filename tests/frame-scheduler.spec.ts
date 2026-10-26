/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { requestMotionFrame, cancelMotionFrame, disposeFrameScheduler } from '../src/client/core/frame-scheduler.ts'
import { setRenderBudget } from '../src/client/core/performance.ts'

let native: Map<number, FrameRequestCallback>, sequence: number
const tick = (now: number) => { const callbacks = [...native.values()]; native.clear(); callbacks.forEach(fn => fn(now)) }
beforeEach(() => {
  native = new Map(); sequence = 0
  vi.spyOn(document, 'hasFocus').mockReturnValue(true)
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { native.set(++sequence, fn); return sequence })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => native.delete(id))
  vi.stubGlobal('matchMedia', () => ({matches:false,addEventListener:()=>{},removeEventListener:()=>{}}))
  setRenderBudget('balanced')
})
afterEach(() => { disposeFrameScheduler(); setRenderBudget('balanced'); vi.restoreAllMocks(); vi.unstubAllGlobals() })
describe('shared rendering scheduler', () => {
  it('uses one native callback and keeps separate 40 / 60 fps budgets', () => {
    let background = 0, interaction = 0
    const bg = () => { background++; requestMotionFrame(bg, 'background') }
    const fg = () => { interaction++; requestMotionFrame(fg) }
    requestMotionFrame(bg, 'background'); requestMotionFrame(fg)
    expect(native.size).toBe(1)
    for(let i=0;i<=120;i++) tick(i*1000/60)
    expect(background).toBeGreaterThanOrEqual(79)
    expect(background).toBeLessThanOrEqual(81)
    expect(interaction).toBe(121)
    expect(native.size).toBe(1)
  })
  it('stops native callbacks on blur, resumes on focus, and cancels the last task without an idle loop', () => {
    const draw = vi.fn()
    const id = requestMotionFrame(draw, 'background')
    window.dispatchEvent(new Event('blur'))
    expect(native.size).toBe(0)
    tick(1000); expect(draw).not.toHaveBeenCalled()
    window.dispatchEvent(new Event('focus')); expect(native.size).toBe(1)
    tick(2000); expect(draw).toHaveBeenCalledTimes(1)
    expect(native.size).toBe(0)
    cancelMotionFrame(id)
    const next = requestMotionFrame(draw); cancelMotionFrame(next)
    expect(native.size).toBe(0)
  })
  it('follows the selected profile and does not let a failing task stop the others', () => {
    setRenderBudget('performance')
    const warn = vi.spyOn(console,'warn').mockImplementation(()=>{})
    let count=0
    const draw=()=>{count++;requestMotionFrame(draw,'background')}
    requestMotionFrame(()=>{throw Error('fixture')});requestMotionFrame(draw,'background')
    for(let i=0;i<=60;i++)tick(i*1000/60)
    expect(count).toBe(31)
    expect(warn).toHaveBeenCalledTimes(1)
  })
})
