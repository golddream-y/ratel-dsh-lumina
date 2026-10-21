/**
 * Style installation.
 *
 * Lumina ships as a profile bundle, not a dynamic package, so the runtime's
 * `styles.insert` seat does not exist here — a bundle owns its own style tags
 * and must remove them on unload. Every tag is tagged with
 * `data-plugin="dsh-lumina"` so a teardown sweep can find it, and each effect
 * gets its own tag so one effect can be dropped without touching the others.
 */

/** Attribute marking a style tag as owned by this plugin. */
export const PLUGIN_ATTRIBUTE = 'data-plugin'

/** Attribute naming the effect that owns a style tag. */
export const EFFECT_ATTRIBUTE = 'data-effect'

/**
 * Install one stylesheet.
 *
 * @param effect - the effect id; becomes the tag's `data-effect` value.
 * @param css - the stylesheet text.
 * @returns a disposer removing the tag; safe to call more than once.
 */
export function installStyle(effect: string, css: string): () => void {
  const tag = document.createElement('style')
  tag.setAttribute(PLUGIN_ATTRIBUTE, 'dsh-lumina')
  tag.setAttribute(EFFECT_ATTRIBUTE, effect)
  tag.textContent = css
  document.head.append(tag)
  return () => {
    tag.remove()
  }
}

/**
 * Remove every style tag this plugin owns.
 *
 * The emergency stop (L2 in the risk register) is `document.documentElement.dataset.lumina
 * = 'off'`, which is a CSS rule rather than a teardown; this function is the
 * hard path used when the plugin is unloaded.
 */
export function removeAllStyles(): void {
  document.querySelectorAll(`style[${PLUGIN_ATTRIBUTE}="dsh-lumina"]`).forEach((tag) => {
    tag.remove()
  })
}
