/**
 * M8 · session activity indicator.
 *
 * The sidebar's running-session spinner is an official SVG with a track and a
 * short arc. The effect recolors it to the brand and gives it a slower breathe
 * and rotation; it never adds or removes nodes, so the row height and the
 * screen-reader label stay untouched.
 */

import { cssSelector } from '../adapter/selector.ts'
import { installStyle } from '../core/styles.ts'

/** The session spinner stylesheet. */
export function sessionCss(): string {
  const spinner = cssSelector('sessionRunning')

  return `
${spinner} {
  color: var(--lumina-brand);
  transform-origin: center;
  animation: lumina-session-pulse var(--lumina-session) ease-in-out infinite !important;
}

${spinner} :is(circle, path) {
  stroke: var(--lumina-brand) !important;
}

${spinner} circle:first-of-type {
  opacity: .16;
}

${spinner} g {
  transform-box: fill-box;
  transform-origin: center;
  animation: lumina-session-spin calc(var(--lumina-session) * 2) linear infinite !important;
}

@media (prefers-reduced-motion: reduce) {
  ${spinner},
  ${spinner} g {
    animation: none !important;
  }

  ${spinner} {
    opacity: .8;
  }
}
`
}

/**
 * Install the session activity indicator.
 *
 * @returns a disposer removing the stylesheet.
 */
export function installSessionActivity(): () => void {
  return installStyle('session-activity', sessionCss())
}
