/**
 * Host half of the Lumina motion plugin.
 *
 * Lumina is a browser-only plugin: every effect lives in the client half and
 * renders through official UI slots. The host half exists so the bundle has a
 * Cordis identity that `cordis.patch.yml` can point at.
 *
 * The `name` export MUST equal the `id` in `cordis.patch.yml` — the loader
 * rejects a patch row whose plugin identity cannot be resolved.
 */

/** Cordis plugin identity. Must match the `id` row in cordis.patch.yml. */
export const name = 'ui-lumina'

/** No host-side behavior: the client half registers the slot occupants. */
export function apply(): void {}
