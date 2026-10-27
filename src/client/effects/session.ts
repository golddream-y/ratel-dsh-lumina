/**
 * M8 · session activity indicator.
 *
 * The sidebar's running-session spinner remains in place for semantics and
 * failure recovery. A shared inert canvas draws the approved running cloud in
 * the icon slot and the star river along the row's lower edge.
 */

import { cssSelector } from '../adapter/selector.ts'
import { installSessionGalaxy } from './session-galaxy.ts'
import { installStyle } from '../core/styles.ts'

/** The session spinner stylesheet. */
export function sessionCss(): string {
  const spinner = cssSelector('sessionRunning')

  return `
.lumina-session-galaxy { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; border-radius: inherit; color: var(--dsw-alias-label-primary); }
@media (prefers-reduced-motion: reduce) { .lumina-session-galaxy { display: none; } }
${spinner}[data-lumina-session-cloud-ready] {
  opacity: 0 !important;
  animation: none !important;
  transition: none !important;
}
html[data-lumina-motion-paused] .lumina-session-galaxy { visibility: hidden; }
html[data-lumina-motion-paused] ${spinner}[data-lumina-session-cloud-ready] { opacity: 1 !important; }
@media (prefers-reduced-motion: reduce) {
  ${spinner}[data-lumina-session-cloud-ready] { opacity: 1 !important; transition: none !important; }
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
