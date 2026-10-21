/**
 * M3 · the typing caret.
 *
 * Two surfaces, one effect:
 *
 * - the streaming tail: a 2px brand caret rendered as a pseudo-element after
 *   the last text block while `[data-streaming]` is present;
 * - the composer: a custom caret overlay that follows the collapsed selection,
 *   because the native caret cannot be animated.
 *
 * The overlay hides the native caret only while it is visible; on blur, range
 * selection, or IME composition it removes the attribute and the native caret
 * comes back. It never mutates the input's layout.
 */

import { cssSelector, queryTarget, withPseudo } from '../adapter/selector.ts'
import { installStyle } from '../core/styles.ts'

/** The attribute that hides the native caret while the overlay is visible. */
const OVERLAY_ATTRIBUTE = 'data-lumina-caret'

/** The overlay class, scoped by the fact that the effect owns the element. */
const OVERLAY_CLASS = 'lumina-caret-overlay'

/**
 * The stylesheet for both caret surfaces.
 *
 * @returns the stylesheet text.
 */
export function caretCss(): string {
  const tail = withPseudo(cssSelector('streamingTail'), 'after')
  const blockCursor = cssSelector('lexicalCursor')
  const input = cssSelector('composerInput')

  return `
${tail} {
  content: "";
  display: inline-block;
  width: 2px;
  height: 1.1em;
  margin-left: 2px;
  margin-right: -2px;
  vertical-align: -0.15em;
  border-radius: 1px;
  background: var(--lumina-brand);
  animation: lumina-caret-breathe var(--lumina-caret-stream) ease-in-out infinite;
  pointer-events: none;
}

${blockCursor} {
  animation: lumina-caret-breathe var(--lumina-caret-idle) ease-in-out infinite;
}

${input} {
  caret-color: var(--lumina-brand);
}

${input}[${OVERLAY_ATTRIBUTE}="overlay"] {
  caret-color: transparent;
}

.${OVERLAY_CLASS} {
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  width: 2px;
  border-radius: 1px;
  background: var(--lumina-brand);
  pointer-events: none;
  z-index: 2;
  will-change: transform;
  animation: lumina-caret-breathe var(--lumina-caret-idle) ease-in-out infinite;
}

[data-lumina-streaming="on"] .${OVERLAY_CLASS} {
  animation-duration: var(--lumina-caret-stream);
}

@media (prefers-reduced-motion: reduce) {
  ${tail},
  ${blockCursor},
  .${OVERLAY_CLASS} {
    animation: none !important;
    opacity: 1;
  }
}
`
}

/** The dependencies a caret overlay needs from the page. */
export interface CaretOverlayOptions {
  /** The owning document. */
  document: Document
  /** The owning window. */
  window: Window
  /** Resolve the composer card that will host the overlay. */
  getCard: () => HTMLElement | null
  /** Resolve the editable input that owns the selection. */
  getInput: () => HTMLElement | null
}

/**
 * Create the custom caret overlay.
 *
 * @param options - page dependencies (injectable for tests).
 * @returns a disposer removing listeners, the overlay, and the native-caret
 *   suppression attribute.
 */
export function createCaretOverlay(options: CaretOverlayOptions): () => void {
  const { document: doc, window: win, getCard, getInput } = options
  const overlay = doc.createElement('span')
  overlay.className = OVERLAY_CLASS
  overlay.setAttribute('aria-hidden', 'true')

  let frame: number | null = null
  let currentInput: HTMLElement | null = null

  const raf =
    win.requestAnimationFrame?.bind(win) ??
    ((callback: FrameRequestCallback): number => {
      callback(0)
      return 0
    })
  const cancel =
    win.cancelAnimationFrame?.bind(win) ??
    ((handle: number): void => {
      void handle
    })

  const hide = () => {
    overlay.remove()
    currentInput?.removeAttribute(OVERLAY_ATTRIBUTE)
    currentInput = null
  }

  const show = (
    card: HTMLElement,
    input: HTMLElement,
    rect: DOMRect,
    height: number,
  ) => {
    if (win.getComputedStyle(card).position === 'static') {
      // The overlay is absolutely positioned; without a positioned card it
      // would land relative to the wrong ancestor. Degrade to the native caret.
      hide()
      return
    }
    if (overlay.parentElement !== card) card.append(overlay)
    if (currentInput !== input) {
      currentInput?.removeAttribute(OVERLAY_ATTRIBUTE)
      currentInput = input
      input.setAttribute(OVERLAY_ATTRIBUTE, 'overlay')
    }
    const cardRect = card.getBoundingClientRect()
    overlay.style.height = `${Math.max(height, 1)}px`
    overlay.style.transform = `translate3d(${rect.left - cardRect.left}px, ${rect.top - cardRect.top}px, 0)`
  }

  const update = () => {
    frame = null
    const card = getCard()
    const input = getInput()
    if (card === null || input === null) {
      hide()
      return
    }

    const active = doc.activeElement
    if (active !== input && !input.contains(active)) {
      hide()
      return
    }
    if (
      input.hasAttribute('data-composer-composing') ||
      input.closest('[data-composer-composing]') !== null
    ) {
      // IME composition owns the caret; let the browser draw it.
      hide()
      return
    }

    let selection: Selection | null = null
    try {
      selection = win.getSelection()
    } catch {
      hide()
      return
    }
    if (selection === null || selection.rangeCount !== 1 || !selection.isCollapsed) {
      hide()
      return
    }

    const range = selection.getRangeAt(0)
    if (!input.contains(range.startContainer)) {
      hide()
      return
    }

    let rect: DOMRect | undefined
    try {
      rect = range.getBoundingClientRect()
    } catch {
      rect = undefined
    }
    if (rect === undefined || rect.height === 0) {
      const block = input.querySelector('[data-lexical-cursor]')
      rect = block?.getBoundingClientRect()
    }
    if (rect === undefined || rect.height === 0) {
      hide()
      return
    }

    const computed = win.getComputedStyle(input)
    const lineHeight = Number.parseFloat(computed.lineHeight)
    const height =
      rect.height > 0
        ? rect.height
        : Number.isFinite(lineHeight)
          ? lineHeight
          : 20
    show(card, input, rect, height)
  }

  const schedule = () => {
    if (frame !== null) return
    frame = raf(update)
  }

  const cancelScheduled = () => {
    if (frame === null) return
    cancel(frame)
    frame = null
  }

  const onSelection = () => schedule()
  const onFocus = () => schedule()
  const onBlur = () => {
    cancelScheduled()
    hide()
  }
  const onCompositionStart = () => {
    cancelScheduled()
    hide()
  }
  const onCompositionEnd = () => schedule()
  const onScroll = () => schedule()
  const onResize = () => schedule()

  doc.addEventListener('selectionchange', onSelection)
  doc.addEventListener('focusin', onFocus, true)
  doc.addEventListener('focusout', onBlur, true)
  doc.addEventListener('compositionstart', onCompositionStart, true)
  doc.addEventListener('compositionend', onCompositionEnd, true)
  doc.addEventListener('scroll', onScroll, true)
  win.addEventListener('resize', onResize)

  schedule()

  return () => {
    cancelScheduled()
    doc.removeEventListener('selectionchange', onSelection)
    doc.removeEventListener('focusin', onFocus, true)
    doc.removeEventListener('focusout', onBlur, true)
    doc.removeEventListener('compositionstart', onCompositionStart, true)
    doc.removeEventListener('compositionend', onCompositionEnd, true)
    doc.removeEventListener('scroll', onScroll, true)
    win.removeEventListener('resize', onResize)
    hide()
    overlay.remove()
  }
}

/**
 * Install the caret effect.
 *
 * @param doc - the owning document (injectable for tests).
 * @param win - the owning window (injectable for tests).
 * @returns a disposer removing the stylesheet and overlay.
 */
export function installCaret(
  doc: Document = document,
  win: Window = window,
): () => void {
  const disposers: Array<() => void> = [
    installStyle('caret', caretCss()),
    createCaretOverlay({
      document: doc,
      window: win,
      getCard: () => {
        const card = queryTarget('composerCard', doc)
        return card instanceof HTMLElement ? card : null
      },
      getInput: () => {
        const input = queryTarget('composerInput', doc)
        return input instanceof HTMLElement ? input : null
      },
    }),
  ]

  return () => {
    for (let index = disposers.length - 1; index >= 0; index -= 1) {
      disposers[index]?.()
    }
  }
}
