/** Shared shapes for the send transition modes. */

import type { Glyph, GlyphSnapshot } from '../../adapter/glyphs.ts'
import type { Intensity } from '../../core/config.ts'

/** The selectable send transition modes. */
export type TransferMode = 'liquid' | 'flow' | 'dissolve' | 'ghost'

/** A point in viewport coordinates. */
export interface Point { x: number; y: number }

/** Everything a mode renderer may read or change while a transition runs. */
export interface TransferStage {
  /** The overlay root that lives for the whole transition. */
  root: HTMLElement
  /** The layer that holds the glyph copies and the mode graphics. */
  ink: HTMLElement
  /** The layer that holds the source glyph copies. */
  sourceLayer: HTMLElement
  /** The layer that holds the target glyph copies. */
  targetLayer: HTMLElement
  /** The composer snapshot the transition started from. */
  source: GlyphSnapshot
  /** The source glyph copies. */
  sourceNodes: HTMLSpanElement[]
  /** The target glyph copies. */
  targetNodes: HTMLSpanElement[]
  /** The frozen target glyphs used by the landing copy. */
  copyGlyphs: Glyph[]
  /** The resolved target snapshot, once it exists. */
  target: GlyphSnapshot | null
  /** The frozen landing point. */
  arrival: Point | null
  /** The gather centre of the source text. */
  hub: Point
  /** The anchor on the composer top edge. */
  edge: Point
  /** The overlay origin in page coordinates. */
  origin: Point
  /** Padding around the captured region. */
  pad: number
  /** Total transition duration in milliseconds. */
  duration: number
  /** The active intensity tier. */
  intensity: Intensity
  /** Hide a surface for the duration of the transition. */
  mask: (node: HTMLElement) => void
  /** Flow reveals the real message row, including its background. */
  revealTarget?: (progress:number) => void
}

/** A mode draws one transition; the runtime owns the rest. */
export interface TransferRenderer {
  /** Optional one-time setup. */
  enter?: (stage: TransferStage) => void
  /**
   * Draw the frame for the given timeline position.
   *
   * @returns true when the transition is finished.
   */
  render: (t: number, stage: TransferStage) => boolean
  /** Optional cleanup for mode-owned nodes. */
  dispose?: (stage: TransferStage) => void
}
