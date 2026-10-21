/**
 * Register an occupant without assuming the slot is declared after the plugin.
 *
 * The shell may declare its slots before or after a lazy plugin applies.
 * `ctx.slots.register` only works once the slot is declared; `ctx.slots.inject`
 * waits for a future declaration. Try the declaration directly first, then
 * fall back to `inject` when the plugin applied before the shell's first render.
 */

/** The two slot operations Lumina needs. */
export interface SlotRegistryLike {
  /** Wait for a slot declaration. */
  inject: (key: string, callback: () => (() => void) | void) => () => void
  /** Register against an already declared slot. */
  register: (options: unknown, component: unknown) => () => void
}

/**
 * Occupy a slot, preferring a direct registration.
 *
 * @param slots - the client slot service.
 * @param key - the slot key.
 * @param options - registration metadata; `name` is filled with `key`.
 * @param component - the occupant component.
 * @returns a disposer releasing the occupant and any pending wait.
 */
export function occupySlot(
  slots: SlotRegistryLike,
  key: string,
  options: Record<string, unknown>,
  component: unknown,
): () => void {
  let release: (() => void) | undefined
  let disposed = false
  let wait: (() => void) | undefined

  const register = () => {
    if (release !== undefined || disposed) return
    release = slots.register({ ...options, name: key }, component)
  }

  try {
    register()
  } catch {
    // The slot is not declared yet. Wait for its declaration; the callback
    // registers once, then the disposer releases it.
    wait = slots.inject(key, () => {
      try {
        register()
      } catch {
        // The owner rejected the registration (usually a rank conflict); the
        // effect stays off rather than breaking the client boot.
      }
      return () => {
        release?.()
        release = undefined
      }
    })
  }

  return () => {
    disposed = true
    wait?.()
    release?.()
    release = undefined
  }
}
