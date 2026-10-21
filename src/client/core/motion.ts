/**
 * Reduced-motion handling.
 *
 * The system preference is honored unconditionally. There is deliberately no
 * setting to opt out: a user who asked the OS for less motion must not have to
 * find a second switch in a plugin panel to get it.
 */

/** The media query that carries the system preference. */
export const REDUCE_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

/**
 * Whether the system currently asks for reduced motion.
 *
 * `matchMedia` is missing in some embedded webviews and in test DOMs, so its
 * absence is treated as "no preference" rather than an error.
 *
 * @returns true when the preference is active.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(REDUCE_MOTION_QUERY).matches
}

/**
 * Subscribe to changes of the reduced-motion preference.
 *
 * @param onChange - called with the new value whenever the preference flips.
 * @returns a disposer.
 */
export function watchReducedMotion(onChange: (reduced: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }
  const query = window.matchMedia(REDUCE_MOTION_QUERY)
  const listener = (event: MediaQueryListEvent) => onChange(event.matches)
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

/**
 * The CSS block that stops every Lumina animation when the system asks for it.
 *
 * `::before` and `::after` must be included: the composer glow lives on a
 * pseudo-element, and leaving it out would keep the border spinning.
 *
 * @returns the stylesheet text.
 */
export function reducedMotionCss(): string {
  return `@media (prefers-reduced-motion: reduce) {
  [data-lumina] *,
  [data-lumina] *::before,
  [data-lumina] *::after {
    animation-duration: 0s !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0s !important;
  }
}`
}
