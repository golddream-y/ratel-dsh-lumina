/**
 * M4 · button press and send flash.
 *
 * Press feedback is pure CSS on the composer's enabled buttons. The send flash
 * is driven by the single streaming observer: a stream start puts a temporary
 * attribute on the composer card, whose own box-shadow animation expands once.
 */

import { cssSelector, queryTarget } from '../adapter/selector.ts'
import type { StreamingState } from '../adapter/streaming.ts'
import type { Intensity } from '../core/config.ts'
import { installStyle } from '../core/styles.ts'
import { durationMs } from '../style/tokens.ts'

/** The attribute that starts the flash. */
const SENT_ATTRIBUTE = 'data-lumina-sent'

/** The press/flash stylesheet. */
export function pressCss(): string {
  const button = cssSelector('composerButton')
  const card = cssSelector('composerCard')

  return `
${button} {
  transition: transform var(--lumina-press) cubic-bezier(.34, 1.56, .64, 1);
}

${button}:active {
  transform: scale(.92);
}

${card}[${SENT_ATTRIBUTE}] {
  animation: lumina-send-flash var(--lumina-flash) ease-out;
}

@media (prefers-reduced-motion: reduce) {
  ${button} {
    transition: none;
  }

  ${card}[${SENT_ATTRIBUTE}] {
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
 * @returns a disposer removing the listeners, timer, attribute, and stylesheet.
 */
export function installPress(streaming: StreamingState, intensity: Intensity): () => void {
  const disposeStyle = installStyle('press', pressCss())
  let timer: ReturnType<typeof setTimeout> | undefined
  let flashed: Element | null = null

  const clear = () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      timer = undefined
    }
    flashed?.removeAttribute(SENT_ATTRIBUTE)
    flashed = null
  }

  const flash = () => {
    const card = queryTarget('composerCard')
    if (card === null) return
    clear()
    flashed = card
    // Removing and forcing a reflow makes a repeated send replay the animation.
    card.removeAttribute(SENT_ATTRIBUTE)
    void (card as HTMLElement).offsetWidth
    card.setAttribute(SENT_ATTRIBUTE, '')
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
