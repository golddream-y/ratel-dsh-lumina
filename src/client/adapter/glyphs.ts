/** Short-lived, visible user glyph geometry; never retained or logged. */
import { isGlyphDecoration } from './targets.ts'
export interface Glyph {
  text: string
  x: number
  y: number
  width: number
  height: number
  font: string
  color: string
  letterSpacing: string
}
export interface GlyphSnapshot {
  element: HTMLElement
  text: string
  glyphs: Glyph[]
  box: { left: number; top: number; right: number; bottom: number }
}

export function snapshotGlyphs(element: HTMLElement): GlyphSnapshot | null {
  try { return captureGlyphs(element) } catch { return null }
}

function captureGlyphs(element: HTMLElement): GlyphSnapshot | null {
  const bounds = element.getBoundingClientRect()
  let left = Math.max(0, bounds.left), top = Math.max(0, bounds.top)
  let right = Math.min(innerWidth, bounds.right), bottom = Math.min(innerHeight, bounds.bottom)
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent)
    const rect = parent.getBoundingClientRect()
    if (/hidden|clip|auto|scroll/.test(style.overflowX)) { left = Math.max(left, rect.left); right = Math.min(right, rect.right) }
    if (/hidden|clip|auto|scroll/.test(style.overflowY)) { top = Math.max(top, rect.top); bottom = Math.min(bottom, rect.bottom) }
  }
  if (right <= left || bottom <= top) return null
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  const glyphs: Glyph[] = []
  const range = document.createRange()
  // Segmenter preserves combining marks and emoji sequences as one visual unit.
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  let node: Node | null
  let scanned = 0
  while ((node = walker.nextNode())) {
    const parent = node.parentElement
    if (!parent || isGlyphDecoration(parent)) continue
    const style = getComputedStyle(parent)
    for (const { segment, index } of segmenter.segment(node.textContent ?? '')) {
      if (++scanned > 4000) return null
      if (!segment.trim()) continue
      range.setStart(node, index)
      range.setEnd(node, index + segment.length)
      const rect = range.getBoundingClientRect()
      if (rect.width <= 0 || rect.height <= 0 || rect.left < left - 1 || rect.right > right + 1 || rect.top < top - 1 || rect.bottom > bottom + 1) continue
      if (glyphs.length >= 240) return null
      glyphs.push({ text: segment, x: rect.left, y: rect.top, width: rect.width, height: rect.height,
        font: style.font, color: style.color, letterSpacing: style.letterSpacing })
    }
  }
  if (!glyphs.length) return null
  return { element, text: element.innerText ?? element.textContent ?? '', glyphs, box: { left, top, right, bottom } }
}
