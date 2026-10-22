/**
 * The dissolve mode: the source text disperses and the message text resolves
 * from a soft blur, in the spirit of React Bits' Blur Text.
 *
 * Two acts with a small overlap: the source breaks apart upwards while the
 * landing copy resolves from blur. The blur lives on the whole layer, never
 * per glyph, so the cost stays flat.
 */

import { mix, smoother } from '../liquid-geometry.ts'
import type { TransferRenderer, TransferStage } from './types.ts'

/** Build the dissolve mode renderer. */
export function createDissolveRenderer(): TransferRenderer {
  let resolveStart: number | null = null
  let sourceHidden = false

  const render = (t: number, stage: TransferStage): boolean => {
    const { origin } = stage
    // Act one: every glyph lifts, softens and fades on its own beat. The
    // stagger spreads over a fixed window so long text still finishes inside
    // the transition, and every glyph reaches zero on its own curve: there is
    // no cut that pops the remaining text away.
    const scatter = smoother((t - 60) / 560)
    stage.sourceLayer.style.filter = `blur(${(scatter * 5).toFixed(2)}px)`
    const count = Math.max(1, stage.sourceNodes.length - 1)
    for (let i = 0; i < stage.sourceNodes.length; i++) {
      const node = stage.sourceNodes[i]!
      const glyph = stage.source.glyphs[i]!
      const p = smoother((t - 60 - (i / count) * 220) / 500)
      const x = glyph.x + glyph.width / 2
      const y = glyph.y + glyph.height / 2 - p * 30
      node.style.transform = `translate(${x - origin.x - glyph.width / 2}px, ${y - origin.y - glyph.height / 2}px) scale(${1 - .22 * p})`
      node.style.opacity = String(1 - p)
    }
    if (t >= 820 && !sourceHidden) {
      for (const node of stage.sourceNodes) node.style.opacity = '0'
      sourceHidden = true
    }

    if (stage.target === null) return false
    if (resolveStart === null) resolveStart = t
    // Act two: the landing copy sharpens out of blur as one soft body, and the
    // glyphs settle in with a small staggered rise. Fading every glyph on its
    // own would read as a hard cut once the blur is gone.
    const resolve = smoother((t - resolveStart - 140) / 560)
    stage.targetLayer.style.opacity = String(resolve)
    stage.targetLayer.style.filter = `blur(${((1 - resolve) * 10).toFixed(2)}px)`
    const targetCount = Math.max(1, stage.targetNodes.length - 1)
    for (let i = 0; i < stage.targetNodes.length; i++) {
      const node = stage.targetNodes[i]!
      const glyph = stage.copyGlyphs[i]!
      const p = smoother((resolve - (i / targetCount) * .18) / .82)
      const x = mix(stage.arrival?.x ?? glyph.x, glyph.x + glyph.width / 2, p)
      const rest = glyph.y + glyph.height / 2
      const y = mix(stage.arrival?.y ?? rest, rest, p) - (1 - p) * 8
      node.style.transform = `translate(${x - origin.x - glyph.width / 2}px, ${y - origin.y - glyph.height / 2}px) scale(${1.05 - .05 * p})`
    }
    return resolve >= 1
  }

  const dispose = (stage: TransferStage) => {
    stage.sourceLayer.style.filter = ''
    stage.targetLayer.style.filter = ''
  }

  return { render, dispose }
}
