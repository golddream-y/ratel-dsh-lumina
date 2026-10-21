/**
 * @vitest-environment jsdom
 *
 * The loading-chain proof.
 *
 * The client fetches `lib/client.js` and evaluates it as a script. The file
 * must call `window.__ModuleLoader__.load({ id, factory })` with the right id,
 * and the factory must return `module.exports` — returning the `module`
 * object instead leaves the plugin unmaterialized and silently inactive.
 *
 * Neither failure raises an error in the client, so it has to be asserted
 * here. This spec loads the built artifact exactly the way the client does.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'

const ARTIFACT = resolve(process.cwd(), 'lib/client.js')

/** The module table entries the built bundle is allowed to require. */
const EXPECTED_REQUIRES = ['react', '@deepseek-ai/dsh-client-ui-primitives']

interface CapturedRegistration {
  id: string
  factory: (require: (spec: string) => unknown) => unknown
}

/**
 * Evaluate the built artifact the way the client does.
 *
 * @returns the captured registration.
 */
function loadArtifact(): CapturedRegistration {
  const source = readFileSync(ARTIFACT, 'utf8')
  const captured: CapturedRegistration[] = []
  const loader = {
    load(registration: CapturedRegistration) {
      captured.push(registration)
    },
  }
  const globals = globalThis as unknown as { __ModuleLoader__?: unknown }
  globals.__ModuleLoader__ = loader
  // The artifact is a script, not a module: it is evaluated for its side
  // effect of registering itself with the loader.
  new Function(source)()
  delete globals.__ModuleLoader__
  if (captured.length !== 1) {
    throw new Error(`expected exactly one module registration, got ${captured.length}`)
  }
  return captured[0]!
}

/**
 * Build the `require` the loader hands to the factory.
 *
 * @returns the require function and the list of specifiers it was asked for.
 */
function createRequire(): { require: (spec: string) => unknown; requested: string[] } {
  const requested: string[] = []
  const require = (spec: string): unknown => {
    requested.push(spec)
    if (spec === 'react') {
      return { createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({ type, props, children }) }
    }
    if (spec === '@deepseek-ai/dsh-client-ui-primitives') {
      return { BrandWordmark: () => null, FishLogo: () => null }
    }
    throw new Error(`unexpected require: ${spec}`)
  }
  return { require, requested }
}

describe('client bundle', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.documentElement.removeAttribute('data-lumina')
    document.documentElement.removeAttribute('data-lumina-brand')
    // jsdom ships no matchMedia; the plugin must tolerate its absence, and
    // the stub keeps the reduced-motion branch reachable.
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    })
  })

  it('registers itself with the module loader under the package id', () => {
    const registration = loadArtifact()
    expect(registration.id).toBe('dsh-lumina')
  })

  it('returns module.exports from the factory', () => {
    const registration = loadArtifact()
    const { require } = createRequire()
    const exported = registration.factory(require) as {
      apply?: unknown
      inject?: unknown
    }
    expect(exported).toBeTypeOf('object')
    expect(exported.apply).toBeTypeOf('function')
    expect(exported.inject).toContain('slots')
  })

  it('asks only for module-table specifiers', () => {
    const registration = loadArtifact()
    const { require, requested } = createRequire()
    registration.factory(require)
    for (const specifier of requested) {
      expect(EXPECTED_REQUIRES).toContain(specifier)
    }
  })

  it('occupies the brand slots and installs its stylesheet on apply', () => {
    const registration = loadArtifact()
    const { require } = createRequire()
    const exported = registration.factory(require) as { apply: (ctx: unknown) => void }

    const injected: string[] = []
    const registered: Array<{ name: string; priority?: number }> = []
    const ctx = {
      slots: {
        inject: (key: string, callback: () => unknown) => {
          injected.push(key)
          callback()
          return () => {}
        },
        register: (options: { name: string; priority?: number }) => {
          registered.push(options)
          return () => {}
        },
      },
      effect: () => {},
    }

    exported.apply(ctx)

    expect(injected).toContain('sidebar.brand.mark')
    expect(injected).toContain('sidebar.brand.name')
    for (const entry of registered) {
      expect(entry.priority).toBe(-20)
    }

    const styles = document.querySelectorAll('style[data-plugin="dsh-lumina"]')
    expect(styles.length).toBeGreaterThan(0)
    expect(document.documentElement.getAttribute('data-lumina')).toBe('on')
  })
})
