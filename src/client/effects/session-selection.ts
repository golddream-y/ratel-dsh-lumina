import { SURFACE_MOTION_DURATIONS } from '../style/tokens.ts'
import { selectedSessionSelector, sessionTree } from '../adapter/surface-motion.ts'
import type { Intensity } from '../core/config.ts'
import { prefersReducedMotion, watchReducedMotion } from '../core/motion.ts'
import { installStyle } from '../core/styles.ts'
import { watchViewportScale } from '../core/viewport.ts'

/** One passive background follows selection; labels, focus and navigation stay native. */
export function installSessionSelection(intensity: Intensity): () => void {
  const mask = 'data-lumina-selection-arriving'
  const disposeStyle = installStyle('sessionSelection', `
[data-lumina="on"] [${mask}] { background: transparent !important; }
[data-lumina="on"] [data-lumina-selection-pill] { position: absolute; pointer-events: none; z-index: -1; box-sizing: border-box; }
`)
  const duration = SURFACE_MOTION_DURATIONS[intensity].selection
  let selected = document.querySelector<HTMLElement>(selectedSessionSelector)
  let previousBox = selected?.getBoundingClientRect()
  let previousTree = selected ? sessionTree(selected) : null
  let active: { pill: HTMLElement; row: HTMLElement; root: HTMLElement; animation: Animation; position: string; isolation: string; timer: ReturnType<typeof setTimeout> } | undefined
  const clear = () => {
    const current = active
    if (!current) return
    active = undefined; clearTimeout(current.timer); current.animation.cancel(); current.pill.remove(); current.row.removeAttribute(mask)
    current.root.style.position = current.position; current.root.style.isolation = current.isolation
  }
  const capture = () => { if (selected?.isConnected) previousBox = selected.getBoundingClientRect() }
  const update = () => {
    const next = document.querySelector<HTMLElement>(selectedSessionSelector)
    if (next === selected) return
    const from = active?.pill.getBoundingClientRect() ?? previousBox
    clear()
    const tree = next ? sessionTree(next) : null
    const sameTree = tree === previousTree
    selected = next; previousTree = tree; previousBox = next?.getBoundingClientRect()
    if (!next || !tree || !previousBox || !from || document.hidden || !document.hasFocus() || prefersReducedMotion() || typeof next.animate !== 'function') return
    const to = previousBox
    const rootBox = tree.getBoundingClientRect()
    const sx = tree.offsetWidth ? rootBox.width / tree.offsetWidth : 1
    const sy = tree.offsetHeight ? rootBox.height / tree.offsetHeight : 1
    if (sx <= 0 || sy <= 0 || to.width <= 0 || to.height <= 0) return
    const style = getComputedStyle(next)
    const pill = document.createElement('span')
    pill.setAttribute('data-lumina-selection-pill', ''); pill.setAttribute('aria-hidden', 'true')
    Object.assign(pill.style, {
      left: `${(to.left-rootBox.left)/sx+tree.scrollLeft-tree.clientLeft}px`,
      top: `${(to.top-rootBox.top)/sy+tree.scrollTop-tree.clientTop}px`,
      width: `${to.width/sx}px`, height: `${to.height/sy}px`,
      background: style.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'var(--dsw-alias-interactive-bg-hover)' : style.backgroundColor,
      borderRadius: style.borderRadius,
    })
    const position = tree.style.position, isolation = tree.style.isolation
    if (getComputedStyle(tree).position === 'static') tree.style.position = 'relative'
    tree.style.isolation = 'isolate'
    next.setAttribute(mask, ''); tree.append(pill)
    const nearby = sameTree && Math.abs(from.top-to.top) <= Math.max(to.height*3, 160) && Math.abs(from.left-to.left) < to.width / 2
    const frames: Keyframe[] = nearby
      ? [{ transform: `translate(${(from.left-to.left)/sx}px, ${(from.top-to.top)/sy}px) scale(${from.width/to.width}, ${from.height/to.height})` }, { transform: 'translate(0,0) scale(1)' }]
      : [{ opacity: 0 }, { opacity: 1 }]
    pill.style.transformOrigin = 'top left'
    let animation: Animation
    try { animation = pill.animate(frames, { duration, easing: 'cubic-bezier(.22,1,.36,1)' }) }
    catch {
      pill.remove(); next.removeAttribute(mask); tree.style.position = position; tree.style.isolation = isolation
      return
    }
    active = { pill, row: next, root: tree, animation, position, isolation, timer: setTimeout(clear, duration+80) }
    animation.onfinish = () => { if (active?.animation === animation) clear() }
  }
  const observer = new MutationObserver(records => {
    if (active && (!active.row.isConnected || !active.root.isConnected || !active.pill.isConnected)) clear()
    if (records.some(record => record.attributeName === 'aria-selected' || (record.type === 'childList' && [...record.removedNodes, ...record.addedNodes].some(node => node === selected || (selected && node.contains(selected)) || (node instanceof Element && (node.matches(selectedSessionSelector) || node.querySelector(selectedSessionSelector))))))) update()
  })
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-selected'] })
  const reset = () => { clear(); capture() }
  const unreduce = watchReducedMotion(clear), unscale = watchViewportScale(reset)
  document.addEventListener('pointerdown', capture, true); document.addEventListener('keydown', capture, true)
  document.addEventListener('scroll', reset, true); document.addEventListener('visibilitychange', clear)
  window.addEventListener('resize', reset); window.addEventListener('blur', clear)
  return () => {
    observer.disconnect(); clear(); unreduce(); unscale(); disposeStyle()
    document.removeEventListener('pointerdown', capture, true); document.removeEventListener('keydown', capture, true)
    document.removeEventListener('scroll', reset, true); document.removeEventListener('visibilitychange', clear)
    window.removeEventListener('resize', reset); window.removeEventListener('blur', clear)
  }
}
