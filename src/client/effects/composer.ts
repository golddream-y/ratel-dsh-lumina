/** M2 · warm-to-cool composer edge, with a travelling highlight on focus/send. */

import { cssSelector } from '../adapter/selector.ts'
import { installStyle } from '../core/styles.ts'

/** Shared by the live composer and the settings miniature. */
export function composerCss(
  card = cssSelector('composerCard'),
  focused = `${card}:focus-within`,
): string {
  return `
@property --lumina-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 0deg;
}

${card} {
  --lumina-edge-cool: var(--dsw-alias-brand-primary-new-colorprimary-new-color, var(--lumina-brand-soft));
  --lumina-edge-warm: color-mix(in srgb, var(--lumina-brand) 42%, var(--lumina-hi, var(--lumina-brand-soft)));
  --lumina-edge-ice: color-mix(in srgb, var(--lumina-edge-cool) 42%, var(--lumina-hi, var(--lumina-brand-soft)));
  --lumina-edge-light: var(--lumina-hi, var(--lumina-brand-soft));
  position: relative;
  border-color: transparent !important;
  box-shadow:
    0 0 0 .5px color-mix(in srgb, var(--lumina-edge-light) 75%, transparent),
    -4px 0 9px -5px color-mix(in srgb, var(--lumina-brand) 28%, transparent),
    4px 0 9px -5px color-mix(in srgb, var(--lumina-edge-cool) 30%, transparent);
}

${card}::before {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  border: 1px solid transparent;
  padding: .75px;
  /* Inner white core, travelling accent and pastel rim share one masked pseudo-element.
     The highlight has a narrow head and a long translucent tail. */
  background:
    conic-gradient(from var(--lumina-angle, 0deg),
      color-mix(in srgb, var(--lumina-edge-light) 28%, transparent) 0deg 40deg,
      color-mix(in srgb, var(--lumina-edge-light) 42%, transparent) 65deg,
      var(--lumina-edge-light) 88deg 94deg,
      color-mix(in srgb, var(--lumina-edge-light) 68%, transparent) 106deg,
      color-mix(in srgb, var(--lumina-edge-light) 28%, transparent) 155deg 360deg) padding-box,
    conic-gradient(from var(--lumina-angle, 0deg),
      transparent 0deg 52deg,
      color-mix(in srgb, var(--lumina-edge-cool) 15%, transparent) 72deg,
      color-mix(in srgb, var(--lumina-edge-cool) 48%, transparent) 88deg 94deg,
      color-mix(in srgb, var(--lumina-edge-cool) 18%, transparent) 115deg,
      transparent 160deg 360deg) border-box,
    linear-gradient(100deg,
      var(--lumina-edge-warm),
      color-mix(in srgb, var(--lumina-brand-soft) 45%, var(--lumina-edge-light)) 28%,
      color-mix(in srgb, var(--lumina-edge-ice) 65%, var(--lumina-edge-light)) 55%,
      var(--lumina-edge-ice)) border-box;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
  opacity: .88;
  animation: lumina-border-halo var(--lumina-composer-breathe) ease-in-out infinite;
}

${focused} {
  box-shadow:
    0 0 0 .5px color-mix(in srgb, var(--lumina-edge-light) 90%, transparent),
    -5px 0 6px -4px color-mix(in srgb, var(--lumina-brand) 32%, transparent),
    5px 0 6px -4px color-mix(in srgb, var(--lumina-edge-cool) 36%, transparent),
    -7px 0 16px -8px color-mix(in srgb, var(--lumina-brand) 22%, transparent),
    7px 0 16px -8px color-mix(in srgb, var(--lumina-edge-cool) 25%, transparent);
}

${focused}::before {
  opacity: .94;
  animation: lumina-border-spin var(--lumina-composer-focus) linear infinite;
}

${card}:is([data-lumina-streaming="on"] *)::before {
  opacity: .94;
  animation: lumina-border-spin var(--lumina-composer-stream) linear infinite;
}

@supports not (mask-composite: exclude) {
  ${card} { border-color: var(--lumina-edge-cool) !important; box-shadow: none; }
  ${card}::before { content: none; }
}

@media (prefers-reduced-motion: reduce) {
  ${card}, ${card}::before, ${card}::after,
  ${focused}::before,
  ${card}:is([data-lumina-streaming="on"] *)::before {
    animation: none;
  }
  ${card}::before { opacity: .85; }
}
`
}

/** Install the edge decoration without changing DOM or input behavior. */
export function installComposer(): () => void {
  return installStyle('composer-glow', composerCss())
}
