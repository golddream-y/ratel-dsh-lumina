/**
 * M2 · composer edge glow.
 *
 * Idle: a thin blue-to-warm gradient edge with a soft outer glow breathes.
 * It does not travel. The ring is deliberately not a hard solid stroke.
 * Streaming (a send): the edge becomes a light arc and rotates around the
 * card until the stream ends, then returns to the idle blue breath.
 *
 * The ring lives on `::before`; the card is already a positioned box, so no
 * layout or DOM mutation is involved. The idle color is the client's blue
 * accent token with a touch of the Lumina warm tone, not
 * `--dsw-alias-brand-primary` (near-black in the light theme). The official
 * card border is made transparent while the effect owns the edge.
 */

import { cssSelector } from '../adapter/selector.ts'
import { installStyle } from '../core/styles.ts'

/** The border-light stylesheet. */
export function composerCss(): string {
  const card = cssSelector('composerCard')
  const blue = 'var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6)'
  const warm = 'var(--lumina-brand-soft)'

  return `
@property --lumina-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

${card} {
  position: relative;
  border-color: transparent !important;
}

${card}::before {
  content: "";
  position: absolute;
  inset: -0.5px;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    135deg,
    color-mix(in srgb, ${blue} 85%, transparent),
    color-mix(in srgb, ${warm} 55%, transparent) 70%,
    color-mix(in srgb, ${blue} 85%, transparent)
  );
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
  opacity: .75;
  filter: drop-shadow(0 0 5px rgba(65, 118, 230, .25));
  animation: lumina-border-breathe var(--lumina-composer-breathe) ease-in-out infinite;
}

${card}:focus-within::before {
  animation-duration: var(--lumina-composer-focus);
}

[data-lumina-streaming="on"] ${card}::before {
  background: conic-gradient(
    from var(--lumina-angle),
    color-mix(in srgb, ${blue} 18%, transparent) 0deg 300deg,
    ${blue} 330deg,
    color-mix(in srgb, ${blue} 18%, transparent) 360deg
  );
  opacity: 1;
  filter: drop-shadow(0 0 9px rgba(65, 118, 230, .42));
  animation: lumina-border-spin var(--lumina-composer-stream) linear infinite;
}

@supports not (mask-composite: exclude) {
  ${card}::before {
    content: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  ${card}::before {
    animation: none;
    opacity: .8;
  }

  [data-lumina-streaming="on"] ${card}::before {
    background: var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6);
    opacity: .8;
  }
}
`
}

/**
 * Install the composer edge glow.
 *
 * @returns a disposer removing the stylesheet.
 */
export function installComposer(): () => void {
  return installStyle('composer-glow', composerCss())
}
