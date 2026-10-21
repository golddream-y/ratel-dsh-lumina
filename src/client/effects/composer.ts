/**
 * M2 · composer edge glow.
 *
 * Idle: a static blue edge breathes in opacity. It does not travel.
 * Streaming (a send): the edge becomes a light arc and rotates around the
 * card until the stream ends, then returns to the idle blue breath.
 *
 * The ring lives on `::before`; the card is already a positioned box, so no
 * layout or DOM mutation is involved. The idle color is the client's blue
 * accent token, not `--dsw-alias-brand-primary` (which is near-black in the
 * light theme) and not the Lumina brand red used by the logo.
 */

import { cssSelector } from '../adapter/selector.ts'
import { installStyle } from '../core/styles.ts'

/** The border-light stylesheet. */
export function composerCss(): string {
  const card = cssSelector('composerCard')

  return `
@property --lumina-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

${card} {
  position: relative;
}

${card}::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
  opacity: 1;
  animation: lumina-border-breathe var(--lumina-composer-breathe) ease-in-out infinite;
}

${card}:focus-within::before {
  animation-duration: var(--lumina-composer-focus);
}

[data-lumina-streaming="on"] ${card}::before {
  background: conic-gradient(
    from var(--lumina-angle),
    color-mix(in srgb, var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6) 15%, transparent) 0deg 300deg,
    var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6) 330deg,
    color-mix(in srgb, var(--dsw-alias-brand-primary-new-colorprimary-new-color, #4176e6) 15%, transparent) 360deg
  );
  opacity: 1;
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
