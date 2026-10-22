/** M4 · restrained press, one acknowledgement per send, and menu fade-in. */

import { cssSelector, queryTarget } from '../adapter/selector.ts'
import type { StreamingState } from '../adapter/streaming.ts'
import type { Intensity } from '../core/config.ts'
import { prefersReducedMotion } from '../core/motion.ts'
import { installStyle } from '../core/styles.ts'
import { durationMs } from '../style/tokens.ts'

const PULSE_ATTRIBUTE = 'data-lumina-send-pulse'
const RIPPLE_CLASS = 'lumina-send-ripple'

/** The interaction baseline; menu positioning and native close timing stay owned by DSH. */
export function pressCss(): string {
  const button = cssSelector('composerButton')
  const menu = cssSelector('menuSurface')
  return `
${button} {
  transition: scale var(--lumina-press) cubic-bezier(.22, 1, .36, 1);
  transform-origin: center;
}
${button}:active { scale: .96; }
${button}[${PULSE_ATTRIBUTE}] {
  animation: lumina-send-button-flash var(--lumina-press) ease-out;
}
${menu} {
  animation: lumina-menu-enter var(--lumina-menu) ease-out;
}
@keyframes lumina-menu-enter {
  from { opacity: 0; }
  to { opacity: 1; }
}
[data-lumina="on"] .lumina-send-ripple {
  position: fixed;
  top: 0;
  left: 0;
  border: 1px solid color-mix(in srgb, var(--lumina-brand) 50%, transparent);
  border-radius: 50%;
  opacity: 0;
  pointer-events: none;
  z-index: 2147483647;
  transform: translate(-50%, -50%) scale(.85);
}
[data-lumina="on"] .lumina-send-ripple[data-active] {
  animation: lumina-send-ripple var(--lumina-flash) ease-out;
}
@media (prefers-reduced-motion: reduce) {
  ${button} { transition: none; }
  ${button}:active { scale: 1; }
  ${button}[${PULSE_ATTRIBUTE}], ${menu}, ${menu}::before, ${menu}::after {
    animation: none;
  }
  [data-lumina="on"] .lumina-send-ripple {
    animation: none !important;
    opacity: 0;
  }
}
`
}

/** Install visual listeners only: no submitting, cancelling or request state is changed. */
export function installPress(streaming: StreamingState, intensity: Intensity, transferOwnsGesture: () => boolean = () => false, onTransferFallback?: (listener: () => void) => () => void): () => void {
  const disposeStyle = installStyle('press', pressCss())
  const ripple = document.createElement('span')
  ripple.className = RIPPLE_CLASS
  ripple.setAttribute('aria-hidden', 'true')
  document.body.append(ripple)
  let timer: ReturnType<typeof setTimeout> | undefined
  let pulsed: Element | null = null
  let clickAcknowledged = false
  let running = document.documentElement.hasAttribute('data-lumina-streaming')

  const clear = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
    pulsed?.removeAttribute(PULSE_ATTRIBUTE)
    pulsed = null
    ripple.removeAttribute('data-active')
  }

  // The existing host exposes no semantic send-button hook. Restrict this
  // fallback to a visible enabled rightmost control while the composer is idle.
  const primaryButton = (card: Element): Element | null => {
    let primary: Element | null = null
    let right = -Infinity
    for (const button of card.querySelectorAll('button')) {
      const rect = button.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0) continue
      if (rect.right > right) {
        right = rect.right
        primary = button
      }
    }
    return primary !== null && !(primary as HTMLButtonElement).disabled ? primary : null
  }

  const pulse = (button: Element) => {
    if (prefersReducedMotion()) return
    clear()
    const rect = button.getBoundingClientRect()
    pulsed = button
    const size = Math.max(rect.width, rect.height) + 4
    ripple.style.width = `${size}px`
    ripple.style.height = `${size}px`
    ripple.style.left = `${rect.left + rect.width / 2}px`
    ripple.style.top = `${rect.top + rect.height / 2}px`
    // Restart only the owned decoration, rather than forcing composer layout.
    void ripple.offsetWidth
    button.setAttribute(PULSE_ATTRIBUTE, '')
    ripple.setAttribute('data-active', '')
    timer = setTimeout(clear, durationMs(intensity, 'flash'))
  }

  const onClick = (event: Event) => {
    if (running || document.documentElement.dataset.lumina !== 'on') return
    const target = event.target
    if (!(target instanceof Element)) return
    const card = target.closest(cssSelector('composerCard'))
    const button = target.closest('button')
    if (card === null || button === null || (button as HTMLButtonElement).disabled) return
    if (primaryButton(card) !== button) return
    clickAcknowledged = true
    if (!transferOwnsGesture()) pulse(button)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    // Enter can mean newline under host preferences: only reset deduplication;
    // a real stream start decides whether a keyboard send needs a visual pulse.
    if (event.key !== 'Enter' || event.isComposing) return
    if (event.target instanceof Element && event.target.closest(cssSelector('composerInput'))) {
      clickAcknowledged = false
    }
  }
  const releaseFallback = onTransferFallback?.(() => {
    if (running || document.documentElement.dataset.lumina !== 'on') return
    const card = queryTarget('composerCard')
    const send = card ? primaryButton(card) : null
    if (send) pulse(send)
  })
  document.addEventListener('click', onClick, true)
  document.addEventListener('keydown', onKeyDown, true)
  const unsubscribe = streaming.subscribe((active) => {
    const started = active && !running
    running = active
    if (!started) return
    const acknowledged = clickAcknowledged
    clickAcknowledged = false
    if (acknowledged || transferOwnsGesture() || document.documentElement.dataset.lumina !== 'on') return
    const card = queryTarget('composerCard')
    if (card === null) return
    const send = primaryButton(card)
    if (send !== null) pulse(send)
  })

  return () => {
    releaseFallback?.()
    unsubscribe()
    document.removeEventListener('click', onClick, true)
    document.removeEventListener('keydown', onKeyDown, true)
    clear()
    ripple.remove()
    disposeStyle()
  }
}
