/**
 * The dissolve mode: the source text disperses and the message text resolves
 * from a soft blur, in the spirit of React Bits' Blur Text.
 */

import { mix, smooth } from '../liquid-geometry.ts'
import type { TransferRenderer, TransferStage } from './types.ts'

/** Build the dissolve mode renderer. */
export function createDissolveRenderer(): TransferRenderer {
  let resolveStart: number | null = null
  let sourceHidden = false

  const render = (t: number, stage: TransferStage): boolean => {
    const { origin } = stage
    // Source: every glyph lifts, softens and fades on its own beat.
    for (let i = 0; i < stage.sourceNodes.length; i++) {
      const node = stage.sourceNodes[i]!
      const p = smooth((t - i * 6) / 320)
      const glyph = stage.source.glyphs[i]!
      const x = glyph.x + glyph.width / 2
      const y = glyph.y + glyph.height / 2
      node.style.transform = `translate(${x - origin.x - glyph.width / 2}px, ${y - origin.y - glyph.height / 2 - p * 18}px) scale(${1 - .22 * p})`
      node.style.opacity = String(1 - p)
    }
    if (t >= 360 && !sourceHidden) {
      for (const node of stage.sourceNodes) node.style.opacity = '0'
      sourceHidden = true
    }

    if (stage.target === null) return false
    if (resolveStart === null) resolveStart = t
    const resolve = smooth((t - resolveStart - 120) / 420)
    // The whole landing copy resolves from blur, like Blur Text.
    stage.targetLayer.style.filter = `blur(${((1 - resolve) * 9).toFixed(2)}px)`
    for (let i = 0; i < stage.targetNodes.length; i++) {
      const node = stage.targetNodes[i]!
      const glyph = stage.copyGlyphs[i]!
      const p = smooth((resolve - (i % 6) * .05) / .95)
      const x = mix(stage.arrival?.x ?? glyph.x, glyph.x + glyph.width / 2, p)
      const y = mix(stage.arrival?.y ?? glyph.y, glyph.y + glyph.height / 2, p)
      node.style.opacity = String(p)
      node.style.transform = `translate(${x - origin.x - glyph.width / 2}px, ${y - origin.y - glyph.height / 2}px) scale(${1.1 - .1 * p})`
    }
    return resolve >= 1
  }

  return { render }
}
