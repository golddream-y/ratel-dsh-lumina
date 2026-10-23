/** Crisp, bounded glyph copies; the editor and transcript are never rewritten. */
import { composerEditor, composerEditors, streamingText, isGlyphDecoration } from '../adapter/targets.ts'
import type { Intensity } from '../core/config.ts'
import { prefersReducedMotion } from '../core/motion.ts'
import { installStyle } from '../core/styles.ts'
import { durationMs } from '../style/tokens.ts'

export const WAVE_CLASS = 'lumina-wave'
const MAX_LIVE = 24
const MAX_BATCH = 8
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

export function typeWaveCss(): string {
  return `
[data-lumina="on"] .${WAVE_CLASS} {
  position: fixed; z-index: 60; margin: 0; padding: 0;
  pointer-events: none; user-select: none; white-space: pre;
  color: var(--lumina-brand);
  text-shadow: 0 0 3px currentColor, 0 0 11px currentColor;
  animation: lumina-wave-fade var(--lumina-wave) ease-out both;
}
[data-lumina="on"][data-lumina-intensity="subtle"] .${WAVE_CLASS} { text-shadow: 0 0 2px currentColor, 0 0 6px currentColor; }
[data-lumina="on"] .${WAVE_CLASS}[data-tone="reply"] { color: var(--lumina-brand-ratel); }
@media (prefers-reduced-motion: reduce) {
  [data-lumina="on"] .${WAVE_CLASS} { display: none; animation: none; }
}`
}

export function newCharRange(previous: number, next: number): { from: number; to: number } | null {
  return next > previous ? { from: Math.max(previous, next - MAX_BATCH), to: next } : null
}

/** UTF-16 boundaries of the inserted/replaced run, suitable for DOM Range. */
export function insertedRange(previous: string, next: string): { from: number; to: number } | null {
  const a = [...segmenter.segment(previous)]
  const b = [...segmenter.segment(next)]
  let start = 0
  while (start < a.length && start < b.length && a[start]!.segment === b[start]!.segment) start++
  let end = b.length
  let oldEnd = a.length
  while (end > start && oldEnd > start && b[end - 1]!.segment === a[oldEnd - 1]!.segment) { end--; oldEnd-- }
  if (end === start) return null
  return { from: b[Math.max(start, end - MAX_BATCH)]!.index, to: end < b.length ? b[end]!.index : next.length }
}

export function installTypeWave(doc: Document = document, intensity: Intensity = 'normal'): () => void {
  if (prefersReducedMotion()) return () => {}
  const view = doc.defaultView ?? window
  const disposeStyle = installStyle('type-wave', typeWaveCss())
  const lights = new Map<HTMLElement, number>()
  const previous = new WeakMap<HTMLElement, string>()
  const composing = new WeakSet<HTMLElement>()
  const pending: Array<{ node: Text; from: number; to: number; reply: boolean }> = []
  let frame = 0
  let disposed = false
  const life = durationMs(intensity, 'wave')
  const stagger = durationMs(intensity, 'wave-stagger')
  const read = (editor: HTMLElement) => editor.textContent ?? ''
  // Seed existing drafts so installation cannot light historical text.
  const seed = (element: Element) => {
    const editor = composerEditor(element)
    if (editor && !previous.has(editor)) previous.set(editor, read(editor))
  }
  for (const element of composerEditors(doc)) seed(element)
  const drop = (light: HTMLElement) => {
    view.clearTimeout(lights.get(light))
    light.remove()
    lights.delete(light)
  }
  const clear = () => {
    for (const light of lights.keys()) drop(light)
    pending.length = 0
    if (frame) view.cancelAnimationFrame(frame)
    frame = 0
  }
  const flush = () => {
    frame = 0
    let count = 0
    const batch = pending.splice(0)
    for (const item of batch) {
      if (disposed || !item.node.isConnected || !item.node.parentElement) continue
      const parent = item.node.parentElement
      if (isGlyphDecoration(parent)) continue
      for (const glyph of segmenter.segment(item.node.data)) {
        if (glyph.index < item.from || glyph.index >= item.to || !glyph.segment.trim()) continue
        if (count >= MAX_BATCH) break
        const range = doc.createRange()
        range.setStart(item.node, glyph.index)
        range.setEnd(item.node, glyph.index + glyph.segment.length)
        const rect = range.getBoundingClientRect()
        if (!rect.width || !rect.height) continue
        const clip = composerEditor(parent)?.getBoundingClientRect()
        if (clip && (rect.top < clip.top || rect.bottom > clip.bottom || rect.left < clip.left || rect.right > clip.right)) continue
        const light = doc.createElement('span')
        const style = view.getComputedStyle(parent)
        light.className = WAVE_CLASS
        light.textContent = glyph.segment
        light.setAttribute('aria-hidden', 'true')
        light.dataset.tone = item.reply ? 'reply' : 'input'
        Object.assign(light.style, {
          font: style.font, letterSpacing: style.letterSpacing,
          left: `${rect.left}px`, top: `${rect.top}px`,
          lineHeight: `${rect.height}px`, animationDelay: `${count * stagger}ms`,
        })
        doc.body.append(light)
        lights.set(light, view.setTimeout(() => drop(light), life + count * stagger + 60))
        count++
        while (lights.size > MAX_LIVE) drop(lights.keys().next().value!)
      }
    }
  }
  const schedule = () => { if (!frame && pending.length) frame = view.requestAnimationFrame(flush) }
  const queue = (element: Element, from: number, to: number, reply: boolean) => {
    const walker = doc.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    let offset = 0
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node as Text
      if (offset < to && offset + text.length > from) pending.push({ node: text, from: Math.max(0, from - offset), to: Math.min(text.length, to - offset), reply })
      offset += text.length
    }
    schedule()
  }
  const before = (event: Event) => { const editor = composerEditor(event.target); if (editor && !composing.has(editor)) previous.set(editor, read(editor)) }
  const update = (event: Event) => {
    const editor = composerEditor(event.target)
    if (!editor || composing.has(editor) || (event as InputEvent).isComposing) return
    const next = read(editor)
    const range = insertedRange(previous.get(editor) ?? '', next)
    previous.set(editor, next)
    if (range && !editor.hasAttribute('data-lumina-transfer-mask')) queue(editor, range.from, range.to, false)
  }
  const start = (event: Event) => { before(event); const editor = composerEditor(event.target); if (editor) composing.add(editor) }
  const end = (event: Event) => { const editor = composerEditor(event.target); if (editor) composing.delete(editor); update(event) }
  const observer = new MutationObserver((records) => {
    // Only semantic streaming regions; mounting an entire historical subtree is ignored.
    const changed = new Map<Text, string>()
    for (const record of records) {
      if (record.type === 'childList') {
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.TEXT_NODE && streamingText(node) && !changed.has(node as Text)) changed.set(node as Text, '')
        }
      }
      if (record.type === 'characterData' && streamingText(record.target) && !changed.has(record.target as Text)) changed.set(record.target as Text, record.oldValue ?? '')
    }
    for (const [node, old] of changed) {
      const range = insertedRange(old, node.data)
      if (range) pending.push({ node, ...range, reply: true })
    }
    schedule()
  })
  observer.observe(doc.body, { subtree: true, childList: true, characterData: true, characterDataOldValue: true })
  const listeners = { beforeinput: before, focusin: before, input: update, compositionstart: start, compositionend: end }
  for (const [name, listener] of Object.entries(listeners)) doc.addEventListener(name, listener, true)
  doc.addEventListener('scroll', clear, true)
  view.addEventListener('resize', clear)
  return () => {
    disposed = true
    observer.disconnect()
    for (const [name, listener] of Object.entries(listeners)) doc.removeEventListener(name, listener, true)
    doc.removeEventListener('scroll', clear, true)
    view.removeEventListener('resize', clear)
    clear()
    disposeStyle()
  }
}
