/**
 * Shared keyframes.
 *
 * The effects own their selectors; the keyframes they animate live here so the
 * settings preview and the live effect run on the same definition. One source
 * of truth means the preview can never drift from what the user actually gets.
 */

/** The idle composer edge breathing without moving. */
export const BORDER_BREATHE = `
@keyframes lumina-border-halo {
  0%, 100% { opacity: .48; }
  50% { opacity: 1; }
}
`

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
  0%, 100% { opacity: .7; }
  50% { opacity: 1; }
}
`

/** The soft ring left at the send button after a click. */
export const SEND_RIPPLE = `
@keyframes lumina-send-ripple {
  0% { opacity: .4; transform: translate(-50%, -50%) scale(.85); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.3); }
}
`

/** The slow drift of one mist blob. */
export const MIST_DRIFT = `
@keyframes lumina-mist-drift {
  from { transform: translate(-6px, 4px) scale(.88); }
  to { transform: translate(8px, -6px) scale(1.14); }
}
`

/** The light band sweeping across the brand wordmark. */
export const WORDMARK_SWEEP = `
@keyframes lumina-sweep {
  0%, 70% { transform: translateX(-100px); }
  100% { transform: translateX(392px); }
}
`

/** The new-session hero entrance. */
export const HERO_IN = `
@keyframes lumina-hero-in {
  from { opacity: 0; transform: translateY(12px) scale(.92); }
  to { opacity: 1; transform: none; }
}
`

/** The one-shot light that lifts the hero screen as it enters. */
export const HERO_VEIL = `
@keyframes lumina-hero-veil {
  0% { opacity: 0; transform: scale(.94); }
  30% { opacity: 1; }
  100% { opacity: 0; transform: scale(1.04); }
}
`

/** The hero halo breathing once on entrance. */
export const HERO_GLOW = `
@keyframes lumina-hero-glow {
  0% { filter: drop-shadow(0 0 0 rgba(var(--lumina-brand-rgb), 0)); }
  35% { filter: drop-shadow(0 0 18px rgba(var(--lumina-brand-rgb), .55)); }
  100% { filter: drop-shadow(0 0 0 rgba(var(--lumina-brand-rgb), 0)); }
}
`

/** The session-row spinner breathing. */
export const SESSION_PULSE = `
@keyframes lumina-session-pulse {
  0%, 100% { opacity: .55; }
  50% { opacity: 1; }
}
`

/** The session-row spinner rotating. */
export const SESSION_SPIN = `
@keyframes lumina-session-spin {
  to { transform: rotate(360deg); }
}
`

/** The primary send button pulsing once after a message is sent. */
export const SEND_BUTTON_FLASH = `
@keyframes lumina-send-button-flash {
  from { scale: .96; }
  to { scale: 1; }
}
`

/** The per-character light fading out. */
export const WAVE_FADE = `
@keyframes lumina-wave-fade {
  from { opacity: .9; }
  to { opacity: 0; }
}
`

/** Every keyframe Lumina defines, in one block. */
export const ALL_KEYFRAMES = [
  BORDER_BREATHE,
  BORDER_SPIN,
  BORDER_ROTATE,
  CARET_BREATHE,
  MIST_DRIFT,
  WORDMARK_SWEEP,
  HERO_IN,
  HERO_GLOW,
  HERO_VEIL,
  SESSION_PULSE,
  SESSION_SPIN,
  SEND_BUTTON_FLASH,
  SEND_RIPPLE,
  WAVE_FADE,
].join('\n')
