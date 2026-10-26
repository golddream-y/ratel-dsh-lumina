import { SURFACE_MOTION_DURATIONS, SURFACE_EXIT_FACTOR } from '../style/tokens.ts'
import { surfaceSelector, surfaceTrigger } from '../adapter/surface-motion.ts'
import type { Intensity } from '../core/config.ts'
import { prefersReducedMotion, watchReducedMotion } from '../core/motion.ts'
import { installStyle } from '../core/styles.ts'
import { placeViewportOverlay, watchViewportScale } from '../core/viewport.ts'

type Kind = keyof typeof surfaceSelector
interface Surface { box: DOMRect; visible: boolean; animation?: Animation }
const EASE = 'cubic-bezier(.22,1,.36,1)'
/** Finite, event-driven transitions. Host dismissal and focus are never delayed. */
export function installSurfaceMotion(kind: Kind, intensity: Intensity): () => void {
  const attribute = `data-lumina-${kind}-surface`
  const retiredAttribute = 'data-lumina-retired-surface'
  const disposeStyle = installStyle(`${kind}Motion`, `
[data-lumina="on"] [${attribute}] { animation: none !important; }
[data-lumina="on"] [${retiredAttribute}],
[data-lumina="on"] [${retiredAttribute}] * { pointer-events: none !important; animation: none !important; transition: none !important; }
[data-lumina="on"] [${retiredAttribute}] { position: fixed !important; margin: 0 !important; min-width: 0 !important; max-width: none !important; min-height: 0 !important; max-height: none !important; contain: layout style; }
`)
  const surfaces = new Map<HTMLElement, Surface>()
  const exits = new Map<HTMLElement, { animation: Animation; timer: ReturnType<typeof setTimeout> }>()
  const duration = SURFACE_MOTION_DURATIONS[intensity][kind]
  const allowed = () => !document.hidden && document.hasFocus() && !prefersReducedMotion()
  let disposed = false
  let origin: { box: DOMRect; time: number } | undefined
  const rememberOrigin = (event: Event) => {
    const trigger = surfaceTrigger(event.target)
    if (trigger) origin = { box: trigger.getBoundingClientRect(), time: performance.now() }
  }
  const removeExit = (node: HTMLElement) => {
    const exit = exits.get(node)
    if (!exit) return
    exits.delete(node); clearTimeout(exit.timer); exit.animation.cancel(); node.remove()
  }
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(entries => {
    for (const { target } of entries) {
      const state = surfaces.get(target as HTMLElement)
      if (state && !state.animation && target.isConnected) state.box = target.getBoundingClientRect()
    }
  }) : undefined
  const frames = (node: HTMLElement, entering: boolean): Keyframe[] => {
    if (kind === 'dialog') return entering
      ? [{ opacity: 0, scale: '.975', translate: '0 8px' }, { opacity: 1, scale: '1', translate: '0 0' }]
      : [{ opacity: 1, scale: '1', translate: '0 0' }, { opacity: 0, scale: '.985', translate: '0 4px' }]
    // clip-path leaves the root's fixed-position descendants / CSS anchors intact.
    const box = node.getBoundingClientRect()
    const opensUp = box.top + box.height / 2 > window.innerHeight * .65
    let inset = opensUp ? 'inset(0 0 10px 0)' : 'inset(10px 0 0 0)'
    if (origin && performance.now() - origin.time < 1500) {
      const anchor = origin.box
      if (box.left >= anchor.right - 6) inset = 'inset(0 0 0 10px)'
      else if (box.right <= anchor.left + 6) inset = 'inset(0 10px 0 0)'
      else inset = box.top >= anchor.bottom - 6 ? 'inset(10px 0 0 0)' : 'inset(0 0 10px 0)'
    }
    const side = node.getAttribute('data-side')
    if (side === 'top') inset = 'inset(0 0 10px 0)'
    if (side === 'bottom') inset = 'inset(10px 0 0 0)'
    if (side === 'left') inset = 'inset(0 10px 0 0)'
    if (side === 'right') inset = 'inset(0 0 0 10px)'
    return entering ? [{ opacity: 0, clipPath: inset }, { opacity: 1, clipPath: 'inset(0)' }]
      : [{ opacity: 1 }, { opacity: 0 }]
  }
  const enter = (node: HTMLElement, state: Surface) => {
    if (!allowed() || typeof node.animate !== 'function') return
    state.animation?.cancel()
    const animation = node.animate(frames(node, true), { duration, easing: EASE })
    state.animation = animation
    animation.onfinish = () => {
      if (state.animation === animation) { state.animation = undefined; if (node.isConnected) state.box = node.getBoundingClientRect() }
    }
  }
  const exit = (node: HTMLElement, state: Surface) => {
    if (!state.visible || !allowed() || state.box.width <= 0 || state.box.height <= 0 || typeof node.animate !== 'function') return
    // A bounded passive snapshot, never a live reparented React/business node.
    const snapshot = node.cloneNode(true) as HTMLElement
    const sourceElements = [node, ...node.querySelectorAll<HTMLElement>('*')]
    const copiedElements = [snapshot, ...snapshot.querySelectorAll<HTMLElement>('*')]
    snapshot.removeAttribute(attribute)
    for (const element of [snapshot, ...snapshot.querySelectorAll('*')]) {
      for (const name of element.getAttributeNames()) {
        if (name === 'id' || name === 'role' || name.startsWith('aria-') || name.startsWith('data-') || name === 'autofocus' || name === 'tabindex') element.removeAttribute(name)
      }
    }
    snapshot.setAttribute(retiredAttribute, kind)
    snapshot.setAttribute('aria-hidden', 'true'); snapshot.inert = true
    snapshot.style.setProperty('z-index', kind === 'dialog' ? '1000' : '1100')
    snapshot.style.setProperty('pointer-events', 'none', 'important')
    snapshot.style.setProperty('transform', 'none', 'important')
    document.body.append(snapshot)
    copiedElements.forEach((copy, index) => { copy.scrollTop = sourceElements[index]?.scrollTop ?? 0; copy.scrollLeft = sourceElements[index]?.scrollLeft ?? 0 })
    if (!placeViewportOverlay(snapshot, { x: state.box.x, y: state.box.y, width: state.box.width, height: state.box.height }, { preserveBoxModel: true })) { snapshot.remove(); return }
    let animation: Animation
    try { animation = snapshot.animate(frames(snapshot, false), { duration: duration * SURFACE_EXIT_FACTOR, easing: 'ease-out', fill: 'forwards' }) }
    catch { snapshot.remove(); return }
    exits.set(snapshot, { animation, timer: setTimeout(() => removeExit(snapshot), duration + 80) })
    animation.onfinish = () => removeExit(snapshot)
    // Rapid reopen never leaves several stale cards layered over each other.
    if (exits.size > 3) removeExit(exits.keys().next().value!)
  }
  const scan = (initial = false) => {
    if (disposed) return
    for (const [node, state] of surfaces) if (!node.isConnected) {
      state.animation?.cancel(); node.removeAttribute(attribute); resize?.unobserve(node)
      surfaces.delete(node); exit(node, state)
    }
    for (const node of document.querySelectorAll<HTMLElement>(surfaceSelector[kind])) {
      if (node.closest(`[${retiredAttribute}]`)) continue
      const box = node.getBoundingClientRect()
      const style = getComputedStyle(node)
      const visible = box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
      let state = surfaces.get(node)
      if (!state) {
        state = { box, visible }; surfaces.set(node, state); node.setAttribute(attribute, '')
        resize?.observe(node)
        if (!initial && visible) enter(node, state)
      } else {
        if (visible && !state.visible) enter(node, state)
        if (visible && !state.animation) state.box = box
        state.visible = visible
      }
    }
  }
  if (kind === 'menu') {
    document.addEventListener('pointerdown', rememberOrigin, true)
    document.addEventListener('pointerover', rememberOrigin, true)
    document.addEventListener('focusin', rememberOrigin, true)
  }
  scan(true)
  const observer = new MutationObserver(records => {
    // Ignore our own snapshot installation, and mutations wholly inside unrelated trees.
    if (records.some(record => {
      const target = record.target as Element
      if (target.closest?.(`[${retiredAttribute}]`)) return false
      if (record.type === 'attributes') return surfaces.has(target as HTMLElement)
      return [...record.addedNodes, ...record.removedNodes].some(node => node instanceof Element && (node.matches(surfaceSelector[kind]) || node.querySelector(surfaceSelector[kind])))
    })) scan()
  })
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] })
  const clear = () => {
    for (const state of surfaces.values()) { state.animation?.cancel(); state.animation = undefined }
    for (const node of [...exits.keys()]) removeExit(node)
  }
  const reposition = () => { clear(); for (const [node, state] of surfaces) if (node.isConnected) state.box = node.getBoundingClientRect() }
  const unwatch = watchViewportScale(reposition)
  const unreduce = watchReducedMotion(clear)
  window.addEventListener('blur', clear); window.addEventListener('resize', reposition)
  document.addEventListener('visibilitychange', clear)
  document.addEventListener('scroll', reposition, true)
  return () => {
    disposed = true; observer.disconnect(); resize?.disconnect(); unwatch(); unreduce(); clear()
    for (const node of surfaces.keys()) node.removeAttribute(attribute)
    surfaces.clear(); disposeStyle()
    document.removeEventListener('pointerdown', rememberOrigin, true)
    document.removeEventListener('pointerover', rememberOrigin, true)
    document.removeEventListener('focusin', rememberOrigin, true)
    window.removeEventListener('blur', clear); window.removeEventListener('resize', reposition)
    document.removeEventListener('visibilitychange', clear); document.removeEventListener('scroll', reposition, true)
  }
}
