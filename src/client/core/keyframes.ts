/**
 * Shared keyframes.
 *
 * The effects own their selectors; the keyframes they animate live here so the
 * settings preview and the live effect run on the same definition. One source
 * of truth means the preview can never drift from what the user actually gets.
 */

/** The border light travelling once around the composer edge. */
export const BORDER_SPIN = `
@keyframes lumina-border-spin {
  to { --lumina-angle: 360deg; }
}
`

/** The border light orbiting the centre — the fallback when `@property` is absent. */
export const BORDER_ROTATE = `
@keyframes lumina-border-rotate {
  to { rotate: 360deg; }
}
`

/** The breathing streaming caret. */
export const CARET_BREATHE = `
@keyframes lumina-caret-breathe {
  0%, 100% { opacity: .35; }
  50% { opacity: 1; }
}
`

/** The light band sweeping across the brand wordmark. */
export const WORDMARK_SWEEP = `
@keyframes lumina-sweep {
  from { transform: translateX(-100px); }
  to { transform: translateX(392px); }
}
`

/** The new-session hero entrance. */
export const HERO_IN = `
@keyframes lumina-hero-in {
  from { opacity: 0; transform: translateY(6px) scale(.92); filter: blur(6px); }
  to { opacity: 1; transform: none; filter: blur(0); }
}
`

/** The halo expanding once after a message is sent. */
export const SEND_FLASH = `
@keyframes lumina-send-flash {
  0% { box-shadow: 0 0 0 0 rgba(var(--lumina-brand-rgb), .45); }
  100% { box-shadow: 0 0 0 10px rgba(var(--lumina-brand-rgb), 0); }
}
`

/** Every keyframe Lumina defines, in one block. */
export const ALL_KEYFRAMES = [
  BORDER_SPIN,
  BORDER_ROTATE,
  CARET_BREATHE,
  WORDMARK_SWEEP,
  HERO_IN,
  SEND_FLASH,
].join('\n')
