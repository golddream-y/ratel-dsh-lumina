/** Small helpers shared by the send transition modes. */

import type { Glyph, GlyphSnapshot } from '../../adapter/glyphs.ts'
import type { Point } from './types.ts'

/** The visual centre of a glyph snapshot. */
export function center(snapshot: GlyphSnapshot): Point {
  const glyphs = snapshot.glyphs
  const left = Math.min(...glyphs.map((g) => g.x)), right = Math.max(...glyphs.map((g) => g.x + g.width))
  const top = Math.min(...glyphs.map((g) => g.y)), bottom = Math.max(...glyphs.map((g) => g.y + g.height))
  return { x: (left + right) / 2, y: (top + bottom) / 2 }
}

/** Build one glyph copy that mirrors the original typography. */
export function glyphNode(glyph: Glyph, parent: HTMLElement): HTMLSpanElement {
  const span = document.createElement('span')
  span.className = 'lumina-transfer-glyph'
  span.textContent = glyph.text
  Object.assign(span.style, {
    font: glyph.font,
    color: glyph.color,
    letterSpacing: glyph.letterSpacing,
    width: `${glyph.width}px`,
    height: `${glyph.height}px`,
    lineHeight: `${glyph.height}px`,
  })
  parent.append(span)
  return span
}

/**
 * The nearest painted ancestor of a text element is the message bubble.
 * A surface that covers most of the viewport is a page region, not a bubble.
 */
export function paintedAncestor(node: HTMLElement): HTMLElement {
  let current: HTMLElement | null = node
  for (let depth = 0; current !== null && depth < 5; depth += 1) {
    const background = getComputedStyle(current).backgroundColor
    if (background !== 'rgba(0, 0, 0, 0)' && background !== 'transparent') {
      const rect = current.getBoundingClientRect()
      if (rect.width * rect.height > innerWidth * innerHeight * 0.5) break
      return current
    }
    current = current.parentElement
  }
  return node
}

/** A quadratic point on an arc between two positions. */
export function arcPoint(from: Point, via: Point, to: Point, p: number): Point {
  const inv = 1 - p
  return {
    x: inv * inv * from.x + 2 * inv * p * via.x + p * p * to.x,
    y: inv * inv * from.y + 2 * inv * p * via.y + p * p * to.y,
  }
}
