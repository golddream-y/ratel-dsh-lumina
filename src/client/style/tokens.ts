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
  | 'menu'
  | 'press'
  | 'flash'
  | 'transfer'
  | 'hero'
  | 'hero-glow'
  | 'hero-response'
  | 'hero-assemble'
  | 'hero-stroke'
  | 'hero-echo'
  | 'wave'
  | 'wave-stagger'
  | 'session'

/** Milliseconds per intensity tier. */
export const DURATIONS: Readonly<
  Record<Intensity, Readonly<Record<DurationToken, number>>>
> = {
  normal: {
    'brand-sweep': 9000,
    'composer-breathe': 3600,
    'composer-focus': 4000,
    'composer-stream': 2400,
    'caret-idle': 1150,
    'caret-stream': 720,
    menu: 140,
    press: 140,
    flash: 360,
    transfer: 1150,
    hero: 360,
    'hero-glow': 600,
    'hero-response': 520,
    'hero-assemble': 1100,
    'hero-stroke': 1800,
    'hero-echo': 480,
    wave: 450,
    'wave-stagger': 35,
    session: 2400,
  },
  subtle: {
    'brand-sweep': 14000,
    'composer-breathe': 4800,
    'composer-focus': 6000,
    'composer-stream': 3600,
    'caret-idle': 1600,
    'caret-stream': 1000,
    menu: 180,
    press: 180,
    flash: 420,
    transfer: 1350,
    hero: 420,
    'hero-glow': 700,
    'hero-response': 600,
    'hero-assemble': 1250,
    'hero-stroke': 2000,
    'hero-echo': 560,
    wave: 520,
    'wave-stagger': 40,
    session: 3200,
  },
  vivid: {
    'brand-sweep': 6000,
    'composer-breathe': 2800,
    'composer-focus': 2800,
    'composer-stream': 1680,
    'caret-idle': 850,
    'caret-stream': 550,
    menu: 110,
    press: 110,
    flash: 280,
    transfer: 1000,
    hero: 320,
    'hero-glow': 540,
    'hero-response': 460,
    'hero-assemble': 950,
    'hero-stroke': 1600,
    'hero-echo': 420,
    wave: 420,
    'wave-stagger': 30,
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
