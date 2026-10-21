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
  --lumina-edge-warm: var(--lumina-brand);
  --lumina-edge-light: var(--lumina-hi, var(--lumina-brand-soft));
  position: relative;
  border-color: transparent !important;
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--lumina-edge-light) 70%, transparent),
    -10px 1px 24px -9px color-mix(in srgb, var(--lumina-edge-warm) 32%, transparent),
    10px 1px 24px -9px color-mix(in srgb, var(--lumina-edge-cool) 38%, transparent);
}

${card}::before {
  content: "";
  position: absolute;
  inset: -1.5px;
  border-radius: inherit;
  padding: 1.5px;
  background:
    conic-gradient(from var(--lumina-angle, 0deg),
      transparent 0deg 65deg,
      color-mix(in srgb, var(--lumina-edge-light) 75%, transparent) 85deg,
      var(--lumina-edge-light) 92deg,
      transparent 112deg 245deg,
      color-mix(in srgb, var(--lumina-edge-light) 85%, transparent) 268deg,
      transparent 292deg 360deg),
    linear-gradient(100deg,
      var(--lumina-edge-warm), var(--lumina-brand-soft) 28%,
      color-mix(in srgb, var(--lumina-edge-cool) 45%, var(--lumina-edge-light)) 55%,
      var(--lumina-edge-cool));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
  opacity: .85;
  animation: lumina-border-halo var(--lumina-composer-breathe) ease-in-out infinite;
}

${focused} {
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--lumina-edge-light) 70%, transparent),
    -12px 2px 30px -8px color-mix(in srgb, var(--lumina-edge-warm) 40%, transparent),
    12px 2px 30px -8px color-mix(in srgb, var(--lumina-edge-cool) 48%, transparent);
}

${focused}::before {
  opacity: 1;
  animation: lumina-border-spin var(--lumina-composer-focus) linear infinite;
}

${card}:is([data-lumina-streaming="on"] *)::before {
  opacity: 1;
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
