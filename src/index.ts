/**
 * Host half of the Lumina motion plugin.
 *
 * Lumina is a browser-only plugin: every effect lives in the client half and
 * renders through official UI slots. The host half exists so the bundle has a
 * Cordis identity that `cordis.patch.yml` can point at.
 *
 * The three identifiers are independent and each has its own rule:
 *
 * - the patch row's `id` is the loader entry key (a later layer overrides a
 *   row by its id);
 * - the patch row's `name` is the npm package name, which Node resolves to
 *   the installed code;
 * - this export is the Cordis plugin identity, which must be unique inside
 *   the context.
 */

/** Cordis plugin identity. Unique inside the client context. */
export const name = 'ui-lumina'

/** No host-side behavior: the client half registers the slot occupants. */
export function apply(): void {}
