import { cssSelector } from '../../adapter/selector.ts'
export const MASK = 'data-lumina-transfer-mask'

/** The stylesheet for every mode. */
export function transferCss(): string {
  return `
[data-lumina="on"] [${MASK}] { opacity: 0 !important; }
[data-lumina="on"] [data-lumina-transfer-pending] { opacity: 0 !important; }
[data-lumina="on"] [${MASK}][data-lumina-flow-reveal] { opacity: var(--lumina-flow-progress, 0) !important; }
[data-lumina="off"] .lumina-transfer { display: none; }
[data-lumina="on"] .lumina-transfer {
  position: absolute; pointer-events: none; user-select: none; z-index: 2147483646;
  --lumina-water-tint: var(--dsw-alias-brand-primary-new-colorprimary-new-color, var(--lumina-brand-ratel));
  --lumina-water-light: color-mix(in srgb, var(--lumina-water-tint) 10%, var(--lumina-hi));
  --lumina-water-body: color-mix(in srgb, var(--lumina-water-tint) 26%, var(--lumina-hi));
  --lumina-water-depth: color-mix(in srgb, var(--lumina-water-tint) 54%, var(--dsw-alias-label-secondary, var(--lumina-hi)));
  --lumina-water-warm: color-mix(in srgb, var(--lumina-brand-ratel) 28%, var(--lumina-hi));
  --lumina-water-line: color-mix(in srgb, var(--lumina-water-tint) 70%, transparent);
  --lumina-ghost-tint: var(--lumina-brand-deepseek);
  --lumina-ghost-soft: color-mix(in srgb, var(--lumina-ghost-tint) 24%, var(--lumina-hi));
  --lumina-ghost-shade: color-mix(in srgb, var(--lumina-ghost-tint) 55%, var(--lumina-brand-deep));
  --lumina-ghost-void: color-mix(in srgb, var(--lumina-ghost-tint) 20%, var(--lumina-brand-deep));
  contain: layout style; isolation: isolate; color: var(--lumina-water-depth);
}
[data-lumina="on"] .lumina-transfer * { pointer-events: none; }
[data-lumina="on"] .lumina-transfer-ink { position: absolute; inset: 0; }
[data-lumina="on"] .lumina-transfer-layer { position: absolute; inset: 0; }
[data-lumina="on"] .lumina-transfer-glyph {
  position: absolute; left: 0; top: 0; white-space: pre; transform-origin: center;
}
[data-lumina="on"] .lumina-transfer-liquid { position: absolute; inset: 0; overflow: visible; }
[data-lumina="on"] .lumina-transfer-mist {
  position: absolute; left: 0; top: 0; width: 64px; height: 64px;
  will-change: transform, opacity; filter: blur(5px);
}
[data-lumina="on"] .lumina-transfer-mist-blob {
  position: absolute; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--lumina-ghost-tint) 52%, transparent), transparent 70%);
  animation: lumina-mist-drift 2.6s ease-in-out infinite alternate;
}
${cssSelector('composerCard')}[data-lumina-transfer]::before,
${cssSelector('composerCard')}[data-lumina-transfer]::after { animation-play-state: paused !important; }
@media (prefers-reduced-motion: reduce) {
  [data-lumina="on"] .lumina-transfer { display: none; }
  [data-lumina="on"] [${MASK}] { opacity: revert !important; }
}
`
}
