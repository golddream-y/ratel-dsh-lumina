/**
 * M10 · the per-character wave.
 *
 * New characters are briefly lit as they appear, in the composer and in the
 * streaming answer. The light is a blurred copy of the glyph itself, drawn
 * above the real text: the host text is never touched, no span is inserted
 * into the editor, and no layout is measured beyond the character's own box.
 *
 * Only characters that were just added are lit. Re-lighting the tail on every
 * keystroke reads as a wash rather than a wave, and it grows with the text.
 */

import { prefersReducedMotion } from '../core/motion.ts'
import { installStyle } from '../core/styles.ts'

/** The class of one light. Scoped to the plugin's own elements. */
export const WAVE_CLASS = 'lumina-wave'

/** The most lights alive at once. Older ones are dropped, not queued. */
const MAX_LIVE = 24

/** The most characters one flush may light. */
const MAX_BATCH = 8

/** The delay between two characters of the same burst. */
const STAGGER_MS = 45

/** How long one light lives. */
const LIFE_MS = 520

/** The stylesheet for the wave lights. */
export function typeWaveCss(): string {
  return `
[data-lumina="on"] .${WAVE_CLASS} {
  position: fixed;
  z-index: 60;
  margin: 0;
  padding: 0;
  pointer-events: none;
  user-select: none;
  white-space: pre;
  filter: blur(3px);
  color: color-mix(in srgb, var(--lumina-brand, #FF3B30) 88%, white);
  animation: lumina-wave-fade ${LIFE_MS}ms ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  [data-lumina="on"] .${WAVE_CLASS} { display: none; }
}
`
}

/**
 * The characters to light for a text that grew from `previous` to `next`.
 *
 * @param previous - the character count before the change.
 * @param next - the character count after the change.
 * @returns the range to light, or null when nothing was added.
 */
export function newCharRange(previous: number, next: number): { from: number; to: number } | null {
  if (next <= previous) return null
  const from = Math.max(previous, next - MAX_BATCH)
  return { from, to: next }
}

/**
 * Install the wave effect.
 *
 * @param doc - the document to observe (injectable for tests).
 * @returns the disposer.
 */
export function installTypeWave(doc: Document = document): () => void {
  if (prefersReducedMotion()) return () => {}

  const view = doc.defaultView ?? window
  const disposeStyle = installStyle('type-wave', typeWaveCss())
  const lights = new Set<HTMLElement>()
  let disposed = false
  let frame = 0
  let composerCount = 0
  const pending: Array<{ node: Text; from: number; to: number }> = []

  /** Drop the oldest light when the cap is reached. */
  const trim = () => {
    while (lights.size > MAX_LIVE) {
      const oldest = lights.values().next().value as HTMLElement | undefined
      if (oldest === undefined) return
      oldest.remove()
      lights.delete(oldest)
    }
  }

  /** Light a single character by drawing a blurred copy over its box. */
  const lightChar = (node: Text, index: number, delay: number) => {
    const parent = node.parentElement
    if (parent === null) return
    const range = doc.createRange()
    range.setStart(node, index)
    range.setEnd(node, index + 1)
    const rect = range.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    const light = doc.createElement('span')
    light.className = WAVE_CLASS
    light.textContent = node.data[index] ?? ''
    light.setAttribute('aria-hidden', 'true')
    const style = view.getComputedStyle(parent)
    light.style.font = style.font
    light.style.left = `${rect.left}px`
    light.style.top = `${rect.top}px`
    light.style.width = `${rect.width}px`
    light.style.height = `${rect.height}px`
    light.style.lineHeight = `${rect.height}px`
    light.style.animationDelay = `${delay}ms`
    doc.body.append(light)
    lights.add(light)
    trim()
    view.setTimeout(() => {
      light.remove()
      lights.delete(light)
    }, LIFE_MS + delay + 60)
  }

  /** Light the range of one text node. */
  const lightNode = (node: Text, from: number, to: number, base: number) => {
    const end = Math.min(to, node.data.length)
    for (let index = Math.max(0, from); index < end; index += 1) {
      lightChar(node, index, base + (index - from) * STAGGER_MS)
    }
  }

  /** Map a character range of an element to its text nodes and queue them. */
  const queueElement = (element: Element, from: number, to: number) => {
    const walker = doc.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    let seen = 0
    let node = walker.nextNode()
    while (node !== null) {
      const text = node as Text
      const length = text.data.length
      if (length > 0 && seen + length > from && seen < to) {
        pending.push({ node: text, from: Math.max(0, from - seen), to: Math.min(length, to - seen) })
      }
      seen += length
      node = walker.nextNode()
    }
  }

  /** Flush the queued ranges in one frame. */
  const flush = () => {
    frame = 0
    const batch = pending.splice(0, pending.length)
    for (const item of batch) {
      if (disposed) return
      lightNode(item.node, item.from, item.to, 0)
    }
  }

  const schedule = () => {
    if (frame === 0) frame = view.requestAnimationFrame(flush)
  }

  /** The composer: count characters and light only what was just added. */
  const onInput = (event: Event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const editor = target.closest('[data-composer-input]')
    if (editor === null || editor.hasAttribute('data-lumina-transfer-mask')) return
    const count = Array.from((editor as HTMLElement).innerText ?? '').length
    const range = newCharRange(composerCount, count)
    composerCount = count
    if (range === null) return
    queueElement(editor, range.from, range.to)
    schedule()
  }

  /** Whether a node lives in the conversation, not in the composer. */
  const inConversation = (node: Node): boolean => {
    const element = node.parentElement
    if (element === null) return false
    if (element.closest('[data-composer-input]') !== null) return false
    return element.closest('[data-conversation-content]') !== null
  }

  /** The answer: light characters that stream in. */
  const observer = new MutationObserver((records) => {
    let queued = false
    for (const record of records) {
      if (record.type === 'characterData') {
        if (!inConversation(record.target)) continue
        const node = record.target as Text
        const next = node.data.length
        const previous = record.oldValue?.length ?? next
        const range = newCharRange(previous, next)
        if (range === null) continue
        pending.push({ node, from: range.from, to: range.to })
        queued = true
        continue
      }
      if (record.type !== 'childList') continue
      for (const added of Array.from(record.addedNodes)) {
        if (added.nodeType !== Node.TEXT_NODE) continue
        if (!inConversation(added)) continue
        const text = added as Text
        const range = newCharRange(0, text.data.length)
        if (range === null) continue
        pending.push({ node: text, from: range.from, to: range.to })
        queued = true
      }
    }
    if (queued) schedule()
  })

  // Observe the body, not the conversation element: the conversation mounts
  // after the plugin in a fresh window, and the filter keeps the cost to the
  // records that matter.
  observer.observe(doc.body, {
    subtree: true,
    childList: true,
    characterData: true,
    characterDataOldValue: true,
  })
  doc.addEventListener('input', onInput, true)

  return () => {
    disposed = true
    doc.removeEventListener('input', onInput, true)
    observer.disconnect()
    if (frame !== 0) view.cancelAnimationFrame(frame)
    for (const light of lights) light.remove()
    lights.clear()
    pending.length = 0
    disposeStyle()
  }
}
