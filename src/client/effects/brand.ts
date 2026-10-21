/**
 * Brand effect: occupies the sidebar brand mark and wordmark slots.
 *
 * Tier 1 (official slots) — the only tier that cannot silently break on a
 * client upgrade. The artwork comes from the client's own primitive package,
 * so it always matches the shipped brand and needs no asset upkeep.
 *
 * The `deepseek` preset eventually renders Lumina's own shine-enabled
 * wordmark; the `ratel` preset needs a honey-badger mark that does not exist
 * yet (risk R15 in docs/design/07). Until then both presets render the
 * official artwork, and only the accent color differs.
 */

import { createElement } from 'react'
import { BrandWordmark, FishLogo } from '@deepseek-ai/dsh-client-ui-primitives'

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
 * The mark occupant: the whale mark, painted with the preset accent.
 *
 * @param props - the host-supplied presentation props.
 * @returns the mark element.
 */
function BrandMark(props: { size?: number; className?: string }): unknown {
  return createElement(
    'span',
    {
      className: 'lumina-mark',
      style: { display: 'inline-flex', flexShrink: 0, color: 'var(--lumina-brand, #2563EB)' },
      'aria-hidden': 'true',
    },
    createElement(FishLogo, { size: props.size ?? 24, className: props.className }),
  )
}

/**
 * The name occupant: the wordmark plus the HARNESS badge.
 *
 * @returns the name element.
 */
function BrandName(): unknown {
  return createElement(
    'span',
    { className: 'lumina-name' },
    createElement(BrandWordmark, { size: 24, includeMark: false }),
  )
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
  return `:root {
${presetAccents}
${declarations}
}
.lumina-mark { display: inline-flex; align-items: center; }
.lumina-name { display: inline-flex; align-items: center; min-width: 0; height: 24px; overflow: hidden; }`
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
      ctx.slots.inject(slot, () => {
        let release: (() => void) | undefined
        try {
          release = ctx.slots.register(
            {
              name: slot,
              priority: BRAND_PRIORITY,
            },
            slot === 'sidebar.brand.name' ? BrandName : BrandMark,
          )
        } catch (error) {
          console.warn(`[dsh-lumina] cannot occupy slot ${slot}`, error)
        }
        return () => {
          release?.()
        }
      }),
    )
  }

  return () => {
    for (const dispose of disposers) dispose()
  }
}
