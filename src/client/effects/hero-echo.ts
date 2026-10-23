/** Echo Text visual reference: two noninteractive text trails settle into the real control. */
import { heroAccessoryGateSelector } from '../adapter/targets.ts'
import { prefersReducedMotion } from '../core/motion.ts'

export const ECHO_CSS = `
${heroAccessoryGateSelector()} { opacity: 0 !important; }
[data-lumina="on"] [data-lumina-echo="waiting"] { opacity: 0 !important; }
[data-lumina="on"] [data-lumina-echo="playing"] {
  animation: lumina-echo-main var(--lumina-echo-time) ease-out both;
}
.lumina-echo-trail {
  position: absolute; pointer-events: none; user-select: none; white-space: pre;
  animation: lumina-echo-trail var(--lumina-echo-time) ease-out both;
}
@keyframes lumina-echo-main {
  from { opacity: 0; transform: translateX(14px); }
  55% { opacity: 1; }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes lumina-echo-trail {
  0% { opacity: 0; transform: translateX(var(--lumina-echo-offset)); }
  25% { opacity: .32; }
  100% { opacity: 0; transform: translateX(0); }
}
@media (prefers-reduced-motion: reduce) {
  ${heroAccessoryGateSelector()} { opacity: 1 !important; }
  [data-lumina="on"] [data-lumina-echo] { opacity: 1 !important; animation: none !important; }
  .lumina-echo-trail { display: none; animation: none; }
}`

/** Keep layout and original handlers, with bounded, local decorative copies. */
export function prepareHeroEcho(targets: HTMLElement[], duration: number, dynamic?: {
  root: HTMLElement
  targets: () => HTMLElement[]
  onComplete?: () => void
}): { play: () => void; dispose: () => void } {
  const entries: Array<{ element: HTMLElement; position: string; time: string }> = []
  const known = new Set<HTMLElement>()
  const capture = () => {
    for (const element of dynamic?.targets() ?? targets) {
      if (known.has(element)) continue
      const r = element.getBoundingClientRect()
      if (!r.width || !r.height) continue
      known.add(element)
      entries.push({ element, position: element.style.position, time: element.style.getPropertyValue('--lumina-echo-time') })
      element.setAttribute('data-lumina-echo', 'waiting')
    }
  }
  const trails = new Set<HTMLElement>()
  let done = false, playing = false
  let observer: MutationObserver | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  const dispose = () => {
    if (done) return
    done = true
    clearTimeout(timer)
    observer?.disconnect()
    dynamic?.root.removeAttribute('data-lumina-echo-gate')
    for (const trail of trails) trail.remove()
    trails.clear()
    for (const { element, position, time } of entries) {
      element.removeAttribute('data-lumina-echo')
      element.style.position = position
      if (time) element.style.setProperty('--lumina-echo-time', time)
      else element.style.removeProperty('--lumina-echo-time')
    }
  }
  if (prefersReducedMotion()) return { play: () => {}, dispose }
  dynamic?.root.setAttribute('data-lumina-echo-gate', 'waiting')
  capture()
  if (dynamic) {
    observer = new MutationObserver(capture)
    observer.observe(dynamic.root, { childList: true, subtree: true })
  }
  const play = () => {
    if (done || playing) return
    if (prefersReducedMotion()) { dispose(); return }
    capture()
    observer?.disconnect()
    playing = true
    for (const { element } of entries) {
      if (!element.isConnected) continue
      const box = element.getBoundingClientRect()
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
      const copies: HTMLElement[] = []
      let count = 0
      for (let node = walker.nextNode(); node && count < 4; node = walker.nextNode()) {
        if (!node.textContent?.trim() || node.parentElement?.closest('[aria-hidden="true"]')) continue
        const range = document.createRange()
        range.selectNodeContents(node)
        const rect = range.getBoundingClientRect()
        if (!rect.width || !rect.height) continue
        const style = getComputedStyle(node.parentElement!)
        for (const offset of [10, 20]) {
          const trail = document.createElement('span')
          trail.className = 'lumina-echo-trail'
          trail.textContent = node.textContent
          trail.setAttribute('aria-hidden', 'true')
          Object.assign(trail.style, {
            left: `${rect.left - box.left - element.clientLeft}px`, top: `${rect.top - box.top - element.clientTop}px`,
            font: style.font, color: style.color, lineHeight: `${rect.height}px`, letterSpacing: style.letterSpacing,
          })
          trail.style.setProperty('--lumina-echo-offset', `${offset}px`)
          copies.push(trail)
        }
        count++
      }
      if (getComputedStyle(element).position === 'static') element.style.position = 'relative'
      element.style.setProperty('--lumina-echo-time', `${duration}ms`)
      for (const trail of copies) { element.append(trail); trails.add(trail) }
      element.setAttribute('data-lumina-echo', 'playing')
    }
    dynamic?.root.removeAttribute('data-lumina-echo-gate')
    timer = setTimeout(() => { dispose(); dynamic?.onComplete?.() }, duration + 80)
  }
  return { play, dispose }
}
