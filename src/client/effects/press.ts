/**
 * M4 · button press and send flash.
 *
 * Press feedback is pure CSS on the composer's enabled buttons. A send does
 * two things: the primary button pulses immediately on click, and a stream
 * start adds a halo to the card. The click pulse is intentionally independent
 * of the streaming observer so the button acknowledges the user even when the
 * stream takes a moment to start.
 */

import { cssSelector, queryTarget } from '../adapter/selector.ts'
import type { StreamingState } from '../adapter/streaming.ts'
import type { Intensity } from '../core/config.ts'
import { installStyle } from '../core/styles.ts'
import { durationMs } from '../style/tokens.ts'

/** The attribute that starts the card halo. */
const SENT_ATTRIBUTE = 'data-lumina-sent'

/** The attribute that starts the send-button pulse. */
const PULSE_ATTRIBUTE = 'data-lumina-send-pulse'

/** The fixed ring that survives the button's React re-render. */
const RIPPLE_CLASS = 'lumina-send-ripple'

/** The press/flash stylesheet. */
export function pressCss(): string {
  const button = cssSelector('composerButton')
  const card = cssSelector('composerCard')

  return `
${button} {
  transition: scale var(--lumina-press) cubic-bezier(.34, 1.56, .64, 1);
  transform-origin: center;
}

${button}:active {
  scale: .88;
}

${card}[${SENT_ATTRIBUTE}] {
  animation: lumina-send-flash var(--lumina-flash) ease-out;
}

${card} button[${PULSE_ATTRIBUTE}] {
  animation: lumina-send-button-flash var(--lumina-flash) ease-out;
}

.lumina-send-ripple {
  position: fixed;
  top: 0;
  left: 0;
  border: 1.5px solid color-mix(in srgb, var(--lumina-brand) 78%, transparent);
  border-radius: 50%;
  box-shadow: 0 0 10px color-mix(in srgb, var(--lumina-brand) 36%, transparent);
  opacity: 0;
  pointer-events: none;
  z-index: 2147483647;
  transform: translate(-50%, -50%) scale(.55);
}

.lumina-send-ripple[data-active] {
  animation: lumina-send-ripple var(--lumina-flash) ease-out;
}

@media (prefers-reduced-motion: reduce) {
  ${button} {
    transition: none;
  }

  ${card}[${SENT_ATTRIBUTE}],
  ${card} button[${PULSE_ATTRIBUTE}] {
    animation: none;
  }

  .lumina-send-ripple {
    animation: none !important;
    opacity: 0;
  }
}
`
}

/**
 * Install press feedback and the send flash.
 *
 * @param streaming - the plugin's single streaming observer.
 * @param intensity - the active duration tier.
 * @returns a disposer removing the listeners, timers, attributes, and stylesheet.
 */
export function installPress(streaming: StreamingState, intensity: Intensity): () => void {
  const disposeStyle = installStyle('press', pressCss())
  const flashMs = durationMs(intensity, 'flash')
  const ripple = document.createElement('span')
  ripple.className = RIPPLE_CLASS
  ripple.setAttribute('aria-hidden', 'true')
  document.body.append(ripple)
  let cardTimer: ReturnType<typeof setTimeout> | undefined
  let buttonTimer: ReturnType<typeof setTimeout> | undefined
  let rippleTimer: ReturnType<typeof setTimeout> | undefined
  let flashed: Element | null = null
  let pulsed: Element | null = null

  const clearCard = () => {
    if (cardTimer !== undefined) {
      clearTimeout(cardTimer)
      cardTimer = undefined
    }
    flashed?.removeAttribute(SENT_ATTRIBUTE)
    flashed = null
  }

  const clearButton = () => {
    if (buttonTimer !== undefined) {
      clearTimeout(buttonTimer)
      buttonTimer = undefined
    }
    pulsed?.removeAttribute(PULSE_ATTRIBUTE)
    pulsed = null
  }

  const clearRipple = () => {
    if (rippleTimer !== undefined) {
      clearTimeout(rippleTimer)
      rippleTimer = undefined
    }
    ripple.removeAttribute('data-active')
  }

  const pulseSendRipple = (button: Element) => {
    const rect = button.getBoundingClientRect()
    if (rect.height <= 0) return
    const size = Math.max(rect.width, rect.height) + 10
    ripple.style.width = `${size}px`
    ripple.style.height = `${size}px`
    ripple.style.left = `${rect.left + rect.width / 2}px`
    ripple.style.top = `${rect.top + rect.height / 2}px`
    clearRipple()
    void (ripple as HTMLElement).offsetWidth
    ripple.setAttribute('data-active', '')
    rippleTimer = setTimeout(clearRipple, flashMs)
  }

  const clear = () => {
    clearCard()
    clearButton()
    clearRipple()
  }

  /** The primary send control is the rightmost enabled button in the card. */
  const primaryButton = (card: Element): Element | null => {
    let primary: Element | null = null
    let right = -Infinity
    for (const button of card.querySelectorAll('button:not([disabled])')) {
      const rect = button.getBoundingClientRect()
      if (rect.width === 0 && rect.height === 0) continue
      if (rect.right > right) {
        right = rect.right
        primary = button
      }
    }
    return primary
  }

  const pulseButton = (button: Element) => {
    clearButton()
    pulsed = button
    button.removeAttribute(PULSE_ATTRIBUTE)
    void (button as HTMLElement).offsetWidth
    button.setAttribute(PULSE_ATTRIBUTE, '')
    buttonTimer = setTimeout(clearButton, flashMs)
    pulseSendRipple(button)
  }

  const flash = () => {
    const card = queryTarget('composerCard')
    if (card === null) return

    clearCard()
    flashed = card
    // Removing and forcing a reflow makes a repeated send replay the card halo.
    card.removeAttribute(SENT_ATTRIBUTE)
    void (card as HTMLElement).offsetWidth
    card.setAttribute(SENT_ATTRIBUTE, '')
    cardTimer = setTimeout(clearCard, flashMs)

    const send = primaryButton(card)
    if (send !== null) pulseButton(send)
  }

  const onClick = (event: Event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const card = target.closest('[data-composer-card]')
    const button = target.closest('button')
    if (card === null || button === null) return
    if ((button as HTMLButtonElement).disabled) return
    if (primaryButton(card) !== button) return
    pulseButton(button)
  }

  document.addEventListener('click', onClick, true)

  const unsubscribe = streaming.subscribe((active) => {
    if (active) flash()
  })

  return () => {
    unsubscribe()
    document.removeEventListener('click', onClick, true)
    clear()
    ripple.remove()
    disposeStyle()
  }
}
