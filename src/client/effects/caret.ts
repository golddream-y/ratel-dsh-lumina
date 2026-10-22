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
  const blue = 'var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6)'

  return `
${tail} {
  content: "";
  display: inline-block;
  width: 2px;
  height: 1.05em;
  margin-left: 2px;
  margin-right: -2px;
  vertical-align: -0.14em;
  border-radius: 1px;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, ${blue} 18%, transparent),
    ${blue} 28%,
    ${blue} 72%,
    color-mix(in srgb, ${blue} 18%, transparent)
  );
  box-shadow: 0 0 6px color-mix(in srgb, ${blue} 45%, transparent);
  animation: lumina-caret-breathe var(--lumina-caret-stream) ease-in-out infinite;
  pointer-events: none;
}

${blockCursor} {
  color: ${blue};
  background-color: ${blue};
  animation: lumina-caret-breathe var(--lumina-caret-idle) ease-in-out infinite;
}

${input} {
  caret-color: ${blue};
}

${input}[${OVERLAY_ATTRIBUTE}="overlay"] {
  caret-color: transparent;
}

.${OVERLAY_CLASS} {
  position: fixed;
  top: 0;
  left: 0;
  display: block;
  width: 2px;
  border-radius: 1px;
  background: linear-gradient(
    to bottom,
    color-mix(in srgb, ${blue} 18%, transparent),
    ${blue} 28%,
    ${blue} 72%,
    color-mix(in srgb, ${blue} 18%, transparent)
  );
  box-shadow: 0 0 8px color-mix(in srgb, ${blue} 55%, transparent);
  pointer-events: none;
  z-index: 2147483647;
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
  const { document: doc, window: win, getInput } = options
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

  const show = (input: HTMLElement, rect: DOMRect, height: number) => {
    if (overlay.parentElement !== doc.body) doc.body.append(overlay)
    if (currentInput !== input) {
      currentInput?.removeAttribute(OVERLAY_ATTRIBUTE)
      currentInput = input
      input.setAttribute(OVERLAY_ATTRIBUTE, 'overlay')
    }
    overlay.style.height = `${Math.max(height, 1)}px`
    overlay.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`
  }

  const update = () => {
    frame = null
    const input = getInput()
    if (input === null) {
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
    show(input, rect, height)
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
