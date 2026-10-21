/**
 * Vitest setup.
 *
 * React 18's `act` requires the environment to opt in; without this flag every
 * render warns that the testing environment is not configured for it.
 */
declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true

export {}
