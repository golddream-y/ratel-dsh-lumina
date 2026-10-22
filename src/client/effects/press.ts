/**
 * M4 · button press and send flash.
 *
 * Press feedback is pure CSS on the composer's enabled buttons. The send
 * action adds two temporary attributes: one on the card (a halo) and one on
 * the primary send button (a short scale + ring pulse). The button pulse is
 * what makes the send control itself acknowledge the click.
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
 * @returns a disposer removing the listeners, timer, attributes, and stylesheet.
 */
export function installPress(streaming: StreamingState, intensity: Intensity): () => void {
  const disposeStyle = installStyle('press', pressCss())
  let timer: ReturnType<typeof setTimeout> | undefined
  let flashed: Element | null = null
  let pulsed: Element | null = null

  const clear = () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    flashed?.removeAttribute(SENT_ATTRIBUTE)
    flashed = null
    pulsed?.removeAttribute(PULSE_ATTRIBUTE)
    pulsed = null
  }

  const flash = () => {
    const card = queryTarget('composerCard')
    if (card === null) return
    clear()

    flashed = card
    // Removing and forcing a reflow makes a repeated send replay the card halo.
    card.removeAttribute(SENT_ATTRIBUTE)
    void (card as HTMLElement).offsetWidth
    card.setAttribute(SENT_ATTRIBUTE, '')

    // The primary send button is the last enabled button in the card.
    const buttons = card.querySelectorAll('button:not([disabled])')
    const send = buttons.item(buttons.length - 1)
    if (send !== null) {
      pulsed = send
      send.removeAttribute(PULSE_ATTRIBUTE)
      void (send as HTMLElement).offsetWidth
      send.setAttribute(PULSE_ATTRIBUTE, '')
    }

    timer = setTimeout(clear, durationMs(intensity, 'flash'))
  }

  const unsubscribe = streaming.subscribe((active) => {
    if (active) flash()
  })

  return () => {
    unsubscribe()
    clear()
    disposeStyle()
  }
}
