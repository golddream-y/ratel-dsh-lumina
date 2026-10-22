/**
 * Effect registry.
 *
 * Every effect is isolated: a broken effect must never take the others down
 * with it. A failing border glow may not stop the brand mark from rendering,
 * and a failing brand mark may not leave a half-installed stylesheet behind.
 *
 * The registry owns the master switch, the per-effect switches, and the
 * disposer bookkeeping that makes uninstall complete.
 */

/** The effect ids Lumina ships. */
export type EffectId = 'brand' | 'composerGlow' | 'caret' | 'press' | 'hero' | 'sessionActivity' | 'sendTransfer'

/** What an effect returns when it installs successfully. */
export type EffectHandle = (() => void) | void

/** The switches the registry consults before running an effect. */
export interface EffectGates {
  /** The master switch: false disables every effect. */
  readonly master: boolean
  /** The per-effect switch. */
  readonly enabled: (id: EffectId) => boolean
}

/**
 * Install a set of effects with per-effect failure isolation.
 *
 * @param gates - the master and per-effect switches.
 * @param effects - the effect installers, keyed by id.
 * @returns a disposer that tears every installed effect down, in reverse order.
 */
export function runEffects(
  gates: EffectGates,
  effects: Readonly<Record<EffectId, () => EffectHandle>>,
): () => void {
  const disposers: Array<() => void> = []

  for (const [id, install] of Object.entries(effects) as Array<[EffectId, () => EffectHandle]>) {
    if (!gates.master || !gates.enabled(id)) continue
    try {
      const handle = install()
      if (typeof handle === 'function') disposers.push(handle)
    } catch (error) {
      console.warn(`[ratel-lumina] effect failed: ${id}`, error)
    }
  }

  return () => {
    for (let index = disposers.length - 1; index >= 0; index -= 1) {
      try {
        disposers[index]?.()
      } catch (error) {
        console.warn('[ratel-lumina] effect teardown failed', error)
      }
    }
  }
}
