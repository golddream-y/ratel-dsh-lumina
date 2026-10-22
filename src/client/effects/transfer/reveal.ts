/**
 * The handover styles.
 *
 * A mode picks how the landing copy replaces the hidden message text. Keeping
 * the two handovers here makes the difference explicit and stops each mode
 * from quietly copying another mode's landing (the ghost looked like the
 * dissolve because it had copied the blur resolve).
 */

import { mix, smoother } from '../liquid-geometry.ts'
import type { TransferStage } from './types.ts'

/**
 * Ease a handover between zero and one.
 *
 * @param t - the normalized timeline position.
 * @param start - when the handover starts.
 * @param duration - how long it takes.
 * @returns the eased progress.
 */
export function revealProgress(t: number, start: number, duration: number): number {
  return smoother((t - start) / duration)
}

/**
 * Blur resolve: the copy sharpens out of blur as one body while the glyphs
 * settle. This is the dissolve handover (React Bits Blur Text).
 *
 * @param t - the normalized timeline position.
 * @param stage - the transition stage.
 * @param start - when the handover starts.
 * @param duration - how long it takes.
 * @returns the eased progress.
 */
export function revealBlur(t: number, stage: TransferStage, start: number, duration = 560): number {
  const resolve = revealProgress(t, start, duration)
  stage.targetLayer.style.opacity = String(resolve)
  stage.targetLayer.style.filter = `blur(${((1 - resolve) * 10).toFixed(2)}px)`
  const count = Math.max(1, stage.targetNodes.length - 1)
  for (let i = 0; i < stage.targetNodes.length; i++) {
    const node = stage.targetNodes[i]!
    const glyph = stage.copyGlyphs[i]!
    node.style.opacity = '1'
    const p = smoother((resolve - (i / count) * .18) / .82)
    const x = mix(stage.arrival?.x ?? glyph.x, glyph.x + glyph.width / 2, p)
    const rest = glyph.y + glyph.height / 2
    const y = mix(stage.arrival?.y ?? rest, rest, p) - (1 - p) * 8
    node.style.transform = `translate(${x - stage.origin.x - glyph.width / 2}px, ${y - stage.origin.y - glyph.height / 2}px) scale(${1.05 - .05 * p})`
  }
  return resolve
}

/**
 * Plain resolve: the copy appears as one body, without blur or per-glyph
 * fading. This is the ghost handover, deliberately distinct from the dissolve.
 *
 * @param t - the normalized timeline position.
 * @param stage - the transition stage.
 * @param start - when the handover starts.
 * @param duration - how long it takes.
 * @returns the eased progress.
 */
export function revealFade(t: number, stage: TransferStage, start: number, duration = 240): number {
  const resolve = revealProgress(t, start, duration)
  stage.targetLayer.style.filter = ''
  stage.targetLayer.style.opacity = String(resolve)
  for (let i = 0; i < stage.targetNodes.length; i++) {
    const node = stage.targetNodes[i]!
    const glyph = stage.copyGlyphs[i]!
    node.style.opacity = '1'
    node.style.transform = `translate(${glyph.x - stage.origin.x}px, ${glyph.y - stage.origin.y}px)`
  }
  return resolve
}
