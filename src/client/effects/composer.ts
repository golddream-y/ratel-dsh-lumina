/**
 * M2 · composer edge glow.
 *
 * A conic-gradient ring is masked to the card's edge and rotates a light arc
 * around it. The ring lives on `::before`; the card is already a positioned
 * box, so no layout or DOM mutation is involved.
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
  inset: -1.5px;
  border-radius: inherit;
  padding: 1.5px;
  background: conic-gradient(
    from var(--lumina-angle),
    transparent 0deg 300deg,
    var(--lumina-brand) 330deg,
    transparent 360deg
  );
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
  opacity: .65;
  animation: lumina-border-spin var(--lumina-composer-idle) linear infinite;
}

${card}:focus-within::before {
  opacity: .95;
  animation-duration: var(--lumina-composer-focus);
}

[data-lumina-streaming="on"] ${card}::before {
  opacity: 1;
  animation-duration: var(--lumina-composer-stream);
}

@supports not (mask-composite: exclude) {
  ${card}::before {
    content: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  ${card}::before {
    animation: none;
    opacity: .5;
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
