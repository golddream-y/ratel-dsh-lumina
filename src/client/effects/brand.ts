/**
 * Brand effect: occupies the sidebar brand mark and wordmark slots.
 *
 * Tier 1 (official slots) — the only tier that cannot silently break on a
 * client upgrade. The artwork is inline SVG generated from the package asset;
 * third-party bundles must not require Harness Client packages.
 *
 * Both presets retain the upstream mark geometry and apply enamel shading.
 */

import { BrandMark, BrandName } from '../brand/artwork.tsx'
import { rootWithTarget } from '../adapter/selector.ts'
import { occupySlot } from '../core/slots.ts'

/** The slots this effect occupies. */
const BRAND_SLOTS = ['sidebar.brand.mark', 'sidebar.brand.name'] as const

/**
 * The shadowing rank Lumina registers at.
 *
 * Lower renders first, so this wins over any other occupant that registered at
 * a higher rank (the `dsh-brand-studio` community plugin uses -10). Two
 * occupants at the same rank in a single slot is an error, not a race, so the
 * rank must differ from every competitor's.
 */
const BRAND_PRIORITY = -20

/** The full variable set each brand preset publishes. */
export const PRESET_VARIABLES: Record<string, Record<string, string>> = {
  ratel: {
    '--lumina-brand': '#2563EB',
    '--lumina-hi': '#FFFFFF',
    '--lumina-brand-soft': '#93B4F8',
    '--lumina-brand-deep': '#102C82',
    '--lumina-brand-rgb': '37, 99, 235',
  },
  deepseek: {
    '--lumina-brand': '#FF3B30',
    '--lumina-hi': '#FFFFFF',
    '--lumina-brand-soft': '#FFB2A0',
    '--lumina-brand-deep': '#8C1D12',
    '--lumina-brand-rgb': '255, 59, 48',
  },
}

/**
 * The stylesheet that carries the brand accent and the layout of the two
 * occupants.
 *
 * @param preset - the active brand preset id.
 * @returns the stylesheet text.
 */
export function brandCss(preset: string): string {
  const variables = PRESET_VARIABLES[preset] ?? PRESET_VARIABLES.ratel ?? {}
  const declarations = Object.entries(variables)
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n')
  // Both presets are published as named variables so the settings preview can
  // show the *draft* brand while the live effects use the committed one.
  const presetAccents = Object.entries(PRESET_VARIABLES)
    .map(([id, values]) => `  --lumina-brand-${id}: ${values['--lumina-brand']};`)
    .join('\n')
  return `html[data-lumina] {
${presetAccents}
}
html[data-lumina][data-lumina-brand="${preset}"] {
${declarations}
}
.lumina-mark { position: relative; pointer-events: none; display: inline-flex; align-items: center; flex-shrink: 0; }
.lumina-whale-water { position: absolute; inset: 0; overflow: visible; pointer-events: none; }
.lumina-whale-periodic .lumina-whale-body { transform-origin: 50% 65%; animation: lumina-whale-float var(--lumina-brand-sweep) ease-in-out infinite; }
.lumina-water-fall { opacity: 0; }
.lumina-water-fall-left { --water-fall-x: -3px; }
.lumina-water-fall-right { --water-fall-x: 3px; }
.lumina-whale-periodic .lumina-water-flow { animation: lumina-water-flow var(--lumina-brand-sweep) linear infinite; }
.lumina-whale-periodic .lumina-water-fall { animation: lumina-water-fall var(--lumina-brand-sweep) ease-in infinite; }
@keyframes lumina-water-flow {
  0%, 77% { transform: translateY(0); }
  97%, 100% { transform: translateY(-22px); }
}
@keyframes lumina-water-fall {
  0%, 89%, 100% { opacity: 0; transform: translate(0,0); }
  92% { opacity: .9; transform: translate(var(--water-fall-x),-1px); }
  99% { opacity: 0; transform: translate(var(--water-fall-x),8px); }
}
.lumina-water-jet { opacity: 0; transform-origin: 15px 7px; }
.lumina-whale-periodic .lumina-water-jet { transform-origin: 15px 7px; animation: lumina-whale-jet var(--lumina-brand-sweep) ease-out infinite; }
@keyframes lumina-whale-float {
  0%, 70%, 100% { transform: none; }
  79%, 88% { transform: translateY(-1.5px); }
  84%, 93% { transform: translateY(-.5px); }
}
@keyframes lumina-whale-jet {
  0%, 77%, 97%, 100% { opacity: 0; transform: scaleY(.05); }
  81% { opacity: 1; transform: scaleX(.95) scaleY(1) skewX(-3deg); }
  85% { opacity: 1; transform: scaleX(1.08) scaleY(.82) skewX(3deg); }
  89% { opacity: 1; transform: scaleX(.9) scaleY(1.08) skewX(-2deg); }
  93% { opacity: 1; transform: scaleX(.65) scaleY(.85); }
}
.lumina-name { display: inline-flex; align-items: center; min-width: 0; height: 24px; overflow: hidden; }
.lumina-name-svg { display: block; height: 100%; width: auto; }
.lumina-shine { animation: lumina-sweep var(--lumina-brand-sweep) cubic-bezier(.45, 0, .55, 1) infinite; }
${rootWithTarget('composerInput', ':focus')} .lumina-shine,
[data-lumina-streaming="on"] .lumina-shine {
  animation-play-state: paused;
}
${rootWithTarget('composerInput', ':focus')} .lumina-whale-periodic *,
[data-lumina-streaming="on"] .lumina-whale-periodic * { animation-play-state: paused; }
@media (prefers-reduced-motion: reduce) {
  .lumina-whale-periodic *, .lumina-whale-water { animation: none !important; }
  .lumina-whale-water { display: none; }
  .lumina-shine { animation: none; }
}`
}

/**
 * Classify a slot registration failure.
 *
 * Two failures need opposite handling. A *conflict* — another occupant at the
 * same rank — is expected in the wild (a user may run two branding plugins),
 * so it degrades to a warning. A *programming* failure — the slot does not
 * exist, or the options are malformed — means the plugin is wrong, and
 * swallowing it would leave the effect silently missing.
 *
 * @param error - the thrown registration error.
 * @returns whether the error is a benign occupancy conflict.
 */
export function isOccupancyConflict(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('already has a registration') || message.includes('already has an entry')
}

/**
 * Install the brand effect.
 *
 * @param ctx - the client context carrying the slot registry.
 * @returns a disposer releasing the slot registrations.
 */
export function installBrand(
  ctx: { slots: { inject: (key: string, callback: () => unknown) => () => void; register: (options: unknown, component: unknown) => () => void } },
): () => void {
  const disposers: Array<() => void> = []

  for (const slot of BRAND_SLOTS) {
    disposers.push(
      occupySlot(
        ctx.slots,
        slot,
        { priority: BRAND_PRIORITY },
        slot === 'sidebar.brand.name' ? BrandName : BrandMark,
      ),
    )
  }

  return () => {
    for (const dispose of disposers) dispose()
  }
}
