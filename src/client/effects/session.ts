/**
 * M8 · session activity indicator.
 *
 * The sidebar's running-session spinner is an official SVG with a track and a
 * short arc. The effect recolors it to the brand and gives it a slower breathe
 * and rotation. An inert canvas adds the running star river without changing
 * row height, native controls, or the screen-reader label.
 */

import { cssSelector } from '../adapter/selector.ts'
import { installSessionGalaxy } from './session-galaxy.ts'
import { installStyle } from '../core/styles.ts'

/** The session spinner stylesheet. */
export function sessionCss(): string {
  const spinner = cssSelector('sessionRunning')

  return `
.lumina-session-galaxy { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; border-radius: inherit; color: var(--dsw-alias-label-primary); opacity: 0; transition: opacity 500ms ease; }
@media (prefers-reduced-motion: reduce) { .lumina-session-galaxy { display: none; } }
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
  const style = installStyle('session-activity', sessionCss())
  let galaxy = () => {}
  try { galaxy = installSessionGalaxy() } catch (error) { console.warn('[ratel-lumina] session galaxy unavailable', error) }
  return () => { galaxy(); style() }
}
