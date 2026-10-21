/**
 * Duration tokens.
 *
 * One table feeds both the stylesheet and the JavaScript timer paths, so a
 * duration cannot drift between CSS and code. Values are milliseconds because
 * the flash effect needs a number for its cleanup timer; CSS gets `ms` too.
 */

import type { Intensity } from '../core/config.ts'

/** The duration tokens every effect consumes. */
export type DurationToken =
  | 'brand-sweep'
  | 'composer-breathe'
  | 'composer-focus'
  | 'composer-stream'
  | 'caret-idle'
  | 'caret-stream'
  | 'press'
  | 'flash'
  | 'hero'
  | 'hero-glow'
  | 'session'

/** Milliseconds per intensity tier. */
export const DURATIONS: Readonly<
  Record<Intensity, Readonly<Record<DurationToken, number>>>
> = {
  normal: {
    'brand-sweep': 3600,
    'composer-breathe': 3600,
    'composer-focus': 4000,
    'composer-stream': 2400,
    'caret-idle': 1150,
    'caret-stream': 720,
    press: 140,
    flash: 520,
    hero: 320,
    'hero-glow': 900,
    session: 2400,
  },
  subtle: {
    'brand-sweep': 6000,
    'composer-breathe': 4800,
    'composer-focus': 6000,
    'composer-stream': 3600,
    'caret-idle': 1600,
    'caret-stream': 1000,
    press: 180,
    flash: 620,
    hero: 420,
    'hero-glow': 1100,
    session: 3200,
  },
  vivid: {
    'brand-sweep': 2600,
    'composer-breathe': 2800,
    'composer-focus': 2800,
    'composer-stream': 1680,
    'caret-idle': 850,
    'caret-stream': 550,
    press: 110,
    flash: 420,
    hero: 240,
    'hero-glow': 700,
    session: 1800,
  },
}

/**
 * Read one duration in milliseconds.
 *
 * @param intensity - the active tier.
 * @param token - the duration token.
 * @returns the duration in milliseconds.
 */
export function durationMs(intensity: Intensity, token: DurationToken): number {
  return DURATIONS[intensity][token]
}

/**
 * Build the stylesheet block that publishes every duration token.
 *
 * The block is scoped to the enabled root; the intensity attribute is written
 * by the composition root before the stylesheet is installed.
 *
 * @returns the stylesheet text.
 */
export function durationCss(): string {
  return (['normal', 'subtle', 'vivid'] as const)
    .map((intensity) => {
      const declarations = Object.entries(DURATIONS[intensity])
        .map(([token, milliseconds]) => `  --lumina-${token}: ${milliseconds}ms;`)
        .join('\n')
      return `html[data-lumina="on"][data-lumina-intensity="${intensity}"] {\n${declarations}\n}`
    })
    .join('\n\n')
}
