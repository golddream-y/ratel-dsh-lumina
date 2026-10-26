/** Shared script-drawing clock. CSS animations remain browser-owned. */
import { renderBudget } from './performance.ts'
import { prefersReducedMotion, watchReducedMotion } from './motion.ts'
import { panelMotionBusy } from './render-activity.ts'

type Kind = 'background' | 'interaction'
type Pending = { callback: FrameRequestCallback; kind: Kind }
const pending = new Map<number, Pending>()
let serial = 0, frame = 0, listening = false, focused = true
let last = new WeakMap<FrameRequestCallback, number>()
let unwatch = () => {}
export interface MotionStatus { readonly state: 'idle' | 'paused' | 'running'; readonly backgroundFps: number; readonly interactionFps: number; readonly yielding: boolean }
let status: MotionStatus = {state:'idle',backgroundFps:renderBudget().backgroundFps,interactionFps:renderBudget().interactionFps,yielding:false}
const subscribers = new Set<() => void>()
export const getMotionStatus = () => status
export const subscribeMotionStatus = (callback: () => void) => { subscribers.add(callback); return () => {subscribers.delete(callback)} }
function publish(now = performance.now()) {
  const budget = renderBudget(), yielding = panelMotionBusy(now)
  const next: MotionStatus = { state: pending.size ? allowed() ? 'running' : 'paused' : 'idle', backgroundFps: Math.min(budget.backgroundFps, yielding ? 30 : Infinity), interactionFps: budget.interactionFps, yielding }
  if (next.state === status.state && next.backgroundFps === status.backgroundFps && next.interactionFps === status.interactionFps && next.yielding === status.yielding) return
  status = next; subscribers.forEach(callback => callback())
}
const allowed = () => focused && !document.hidden && !prefersReducedMotion()
const wake = () => { publish(); if (pending.size && !frame && allowed()) frame = requestAnimationFrame(flush) }
const stateChanged = () => {
  document.documentElement.toggleAttribute('data-lumina-motion-paused', !allowed())
  publish()
  if (!allowed()) { cancelAnimationFrame(frame); frame = 0; last = new WeakMap() }
  else wake()
}
const focus = () => { focused = true; stateChanged() }
const blur = () => { focused = false; stateChanged() }
function listen() {
  if (listening) return
  listening = true
  focused = document.hasFocus()
  window.addEventListener('focus', focus)
  window.addEventListener('blur', blur)
  document.addEventListener('visibilitychange', stateChanged)
  unwatch = watchReducedMotion(stateChanged)
  stateChanged()
}
function flush(now: number) {
  frame = 0
  if (!allowed()) return
  for (const [id, task] of [...pending]) {
    if (!pending.has(id)) continue
    const budget = renderBudget()
    const fps = task.kind === 'interaction' ? budget.interactionFps : Math.min(budget.backgroundFps, panelMotionBusy(now) ? 30 : Infinity)
    const interval = 1000 / fps, previous = last.get(task.callback)
    if (previous !== undefined && now - previous < interval - .1) continue
    pending.delete(id)
    // Keep the remainder: 40 fps on a 60 Hz display must not round down to 30.
    last.set(task.callback, previous === undefined ? now : previous + Math.floor((now - previous + .1) / interval) * interval)
    try { task.callback(now) } catch (error) { console.warn('[ratel-lumina] drawing task failed', error) }
  }
  wake()
}
export function requestMotionFrame(callback: FrameRequestCallback, kind: Kind = 'interaction'): number {
  listen()
  const id = ++serial
  pending.set(id, { callback, kind }); wake()
  return id
}
export function cancelMotionFrame(id: number) {
  pending.delete(id)
  if (!pending.size) { cancelAnimationFrame(frame); frame = 0 }
  publish()
}
export function installFrameScheduler() { listen(); publish() }

/** Called after effect teardown, never while another installer still owns tasks. */
export function disposeFrameScheduler() {
  cancelAnimationFrame(frame); frame = 0; pending.clear(); last = new WeakMap()
  publish()
  document.documentElement.removeAttribute('data-lumina-motion-paused')
  if (!listening) return
  listening = false; unwatch()
  window.removeEventListener('focus', focus); window.removeEventListener('blur', blur)
  document.removeEventListener('visibilitychange', stateChanged)
}
