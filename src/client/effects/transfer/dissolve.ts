/**
 * The dissolve mode: the source text disperses and the message text resolves
 * from a soft blur, in the spirit of React Bits' Blur Text.
 *
 * Two acts with a small overlap: the source breaks apart upwards while the
 * landing copy resolves from blur. The blur lives on the whole layer, never
 * per glyph, so the cost stays flat.
 */

import { mix, smooth } from '../liquid-geometry.ts'
import type { TransferRenderer, TransferStage } from './types.ts'

/** Build the dissolve mode renderer. */
export function createDissolveRenderer(): TransferRenderer {
  let resolveStart: number | null = null
  let sourceHidden = false

  const render = (t: number, stage: TransferStage): boolean => {
    const { origin } = stage
    // Act one: every glyph lifts, softens and fades on its own beat.
    const scatter = smooth((t - 60) / 520)
    stage.sourceLayer.style.filter = `blur(${(scatter * 7).toFixed(2)}px)`
    // The stagger spreads over a fixed window, so a long text still finishes
    // its scatter inside the transition instead of trailing behind it.
    const count = Math.max(1, stage.sourceNodes.length - 1)
    for (let i = 0; i < stage.sourceNodes.length; i++) {
      const node = stage.sourceNodes[i]!
      const glyph = stage.source.glyphs[i]!
      const p = smooth((t - 60 - (i / count) * 200) / 460)
      const x = glyph.x + glyph.width / 2
      const y = glyph.y + glyph.height / 2 - p * 34
      node.style.transform = `translate(${x - origin.x - glyph.width / 2}px, ${y - origin.y - glyph.height / 2}px) scale(${1 - .28 * p})`
      node.style.opacity = String(1 - p)
    }
    if (t >= 760 && !sourceHidden) {
      for (const node of stage.sourceNodes) node.style.opacity = '0'
      sourceHidden = true
    }

    if (stage.target === null) return false
    if (resolveStart === null) resolveStart = t
    // Act two: the landing copy resolves out of blur, glyph by glyph.
    const resolve = smooth((t - resolveStart - 120) / 520)
    stage.targetLayer.style.filter = `blur(${((1 - resolve) * 12).toFixed(2)}px)`
    for (let i = 0; i < stage.targetNodes.length; i++) {
      const node = stage.targetNodes[i]!
      const glyph = stage.copyGlyphs[i]!
      const p = smooth((resolve - (i % 8) * .05) / .95)
      const x = mix(stage.arrival?.x ?? glyph.x, glyph.x + glyph.width / 2, p)
      const y = mix(stage.arrival?.y ?? glyph.y, glyph.y + glyph.height / 2, p)
      node.style.opacity = String(p)
      node.style.transform = `translate(${x - origin.x - glyph.width / 2}px, ${y - origin.y - glyph.height / 2}px) scale(${1.14 - .14 * p})`
    }
    return resolve >= 1
  }

  const dispose = (stage: TransferStage) => {
    stage.sourceLayer.style.filter = ''
    stage.targetLayer.style.filter = ''
  }

  return { render, dispose }
}
