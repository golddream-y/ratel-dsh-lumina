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

@media (prefers-reduced-motion: reduce) {
  ${button} {
    transition: none;
  }

  ${card}[${SENT_ATTRIBUTE}],
  ${card} button[${PULSE_ATTRIBUTE}] {
    animation: none;
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
  let cardTimer: ReturnType<typeof setTimeout> | undefined
  let buttonTimer: ReturnType<typeof setTimeout> | undefined
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

  const clear = () => {
    clearCard()
    clearButton()
  }

  const pulseButton = (button: Element) => {
    clearButton()
    pulsed = button
    button.removeAttribute(PULSE_ATTRIBUTE)
    void (button as HTMLElement).offsetWidth
    button.setAttribute(PULSE_ATTRIBUTE, '')
    buttonTimer = setTimeout(clearButton, flashMs)
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

    // The primary send button is the last enabled button in the card.
    const buttons = card.querySelectorAll('button:not([disabled])')
    const send = buttons.item(buttons.length - 1)
    if (send !== null) pulseButton(send)
  }

  const onClick = (event: Event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const card = target.closest('[data-composer-card]')
    const button = target.closest('button')
    if (card === null || button === null) return
    if ((button as HTMLButtonElement).disabled) return
    const buttons = card.querySelectorAll('button:not([disabled])')
    if (buttons.item(buttons.length - 1) !== button) return
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
    disposeStyle()
  }
}
