/**
 * Brand effect: occupies the sidebar brand mark and wordmark slots.
 *
 * Tier 1 (official slots) — the only tier that cannot silently break on a
 * client upgrade. The artwork is inline SVG generated from the package asset;
 * third-party bundles must not require Harness Client packages.
 *
 * The `deepseek` preset renders the shine-enabled wordmark; the `ratel` preset
 * is still deferred (MVP 1 §5, PRD O1), so both presets use the same artwork
 * and only the accent color differs.
 */

import { BrandMark, BrandName } from '../brand/artwork.tsx'
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
const PRESET_VARIABLES: Record<string, Record<string, string>> = {
  ratel: {
    '--lumina-brand': '#2563EB',
    '--lumina-brand-soft': '#93B4F8',
    '--lumina-brand-deep': '#1E3A8A',
    '--lumina-brand-rgb': '37, 99, 235',
  },
  deepseek: {
    '--lumina-brand': '#FF3B30',
    '--lumina-brand-soft': '#FFB3A8',
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
.lumina-mark { display: inline-flex; align-items: center; flex-shrink: 0; }
.lumina-name { display: inline-flex; align-items: center; min-width: 0; height: 24px; overflow: hidden; }
.lumina-name-svg { display: block; height: 100%; width: auto; }
.lumina-shine { animation: lumina-sweep var(--lumina-brand-sweep) cubic-bezier(.45, 0, .55, 1) infinite; }
@media (prefers-reduced-motion: reduce) {
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
