/** M2 · static mixed-color rim, broad flowing light only while focused. */

import { cssSelector } from '../adapter/selector.ts'
import { installStyle } from '../core/styles.ts'

/** Shared by the live composer and the active settings miniature. */
export function composerCss(
  card = cssSelector('composerCard'),
  focused = `${card}:focus-within`,
): string {
  return `
${card} {
  --lumina-edge-cool: var(--dsw-alias-brand-primary-new-colorprimary-new-color, var(--lumina-brand-soft));
  --lumina-edge-light: var(--lumina-hi, var(--lumina-brand-soft));
  --lumina-edge-warm: color-mix(in srgb, var(--lumina-brand) 48%, var(--lumina-edge-light));
  --lumina-edge-ice: color-mix(in srgb, var(--lumina-edge-cool) 48%, var(--lumina-edge-light));
  position: relative;
  border-color: transparent !important;
}

${card}::before {
  content: "";
  position: absolute;
  inset: -1px;
  padding: 1.5px;
  border-radius: inherit;
  pointer-events: none;
  /* A continuous rim, with a broad translucent wash fused into it.
     There is no separate dot, capsule, head or object orbiting the card. */
  background-image:
    linear-gradient(110deg,
      transparent 0% 24%,
      color-mix(in srgb, var(--lumina-brand-soft) 65%, transparent) 36%,
      var(--lumina-edge-light) 48% 52%,
      color-mix(in srgb, var(--lumina-edge-cool) 65%, transparent) 64%,
      transparent 76% 100%),
    linear-gradient(100deg,
      var(--lumina-edge-warm),
      color-mix(in srgb, var(--lumina-brand-soft) 65%, var(--lumina-edge-light)) 28%,
      color-mix(in srgb, var(--lumina-edge-ice) 60%, var(--lumina-edge-light)) 58%,
      var(--lumina-edge-ice));
  background-size: 240% 100%, 100% 100%;
  background-position: 160% 0, 0 0;
  background-repeat: no-repeat;
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  opacity: .78;
  animation: none;
}

${focused} {
  box-shadow:
    -8px 0 20px -6px color-mix(in srgb, var(--lumina-brand) 36%, transparent),
    8px 0 20px -6px color-mix(in srgb, var(--lumina-edge-cool) 40%, transparent);
}
${focused}::before {
  opacity: 1;
  animation:
    lumina-edge-wash calc(var(--lumina-composer-focus) * 1.5) linear infinite,
    lumina-edge-breathe var(--lumina-composer-breathe) ease-in-out infinite;
}
${focused}:is([data-lumina-streaming="on"] *)::before {
  animation-duration: calc(var(--lumina-composer-stream) * 1.5), var(--lumina-composer-breathe);
}

@keyframes lumina-edge-wash {
  from { background-position: 160% 0, 0 0; }
  to { background-position: -160% 0, 0 0; }
}
@keyframes lumina-edge-breathe {
  0%, 100% { opacity: .72; }
  50% { opacity: 1; }
}

@supports not (mask-composite: exclude) {
  ${card} { border-color: var(--lumina-edge-ice) !important; }
  ${card}::before { content: none; }
}
@media (prefers-reduced-motion: reduce) {
  ${card}::before, ${focused}::before, ${focused}::after {
    animation: none;
  }
  ${focused}::before {
    background-position: 50% 0, 0 0;
    opacity: .85;
  }
}
`
}

/** Install the edge decoration without changing DOM or input behavior. */
export function installComposer(): () => void {
  return installStyle('composer-glow', composerCss())
}
