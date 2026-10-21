/**
 * Browser half of Lumina: the module the client loads and the effect
 * orchestrator behind it.
 *
 * The client loads this file through `window.__ModuleLoader__.load(...)`, so
 * the module contract is narrow on purpose: `apply` and `inject` are exported
 * and nothing else.
 */

import { readConfig, type LuminaConfig } from './core/config.ts'
import { prefersReducedMotion, reducedMotionCss } from './core/motion.ts'
import { runEffects, type EffectId } from './core/registry.ts'
import { installStyle, removeAllStyles } from './core/styles.ts'
import { brandCss, installBrand } from './effects/brand.ts'

/**
 * The slice of the client context Lumina actually uses.
 *
 * Declared structurally on purpose: the official `ClientContext` type lives in
 * `@deepseek-ai/dsh-client-runtime`, whose published versions lag the client
 * releases. A local shape keeps the build free of a version-coupled type
 * dependency while still pinning the three services we consume.
 */
export interface LuminaClientContext {
  /** The slot registry. */
  slots: {
    /**
     * Run a callback when the slot is declared (and again after a
     * re-declaration); the returned disposer cancels the wait.
     */
    inject: (key: string, callback: () => unknown) => () => void
    /** Register an occupant; the returned disposer releases it. */
    register: (options: unknown, component: unknown) => () => void
  }
  /** The locale registry, used for the settings panel labels. */
  locale?: {
    /** Register a dictionary namespace. */
    register: (namespace: string, dictionaries: Record<string, unknown>) => () => void
    /** Bind a namespace for reading. */
    bind: (namespace: string) => (key: string) => string
  }
  /** Cordis effect registration: ties a disposer to the plugin fiber. */
  effect: (callback: () => unknown, reason?: string) => void
}

/** The services this module declares. `slots` is mandatory; the seat is withheld otherwise. */
export const inject = ['slots']

/**
 * The attribute on `<html>` that carries the emergency stop.
 *
 * `document.documentElement.dataset.lumina = 'off'` stops every Tier 2
 * animation from the console without a restart (layer L2 of the risk
 * register).
 */
const ROOT_ATTRIBUTE = 'data-lumina'

/**
 * The attribute on `<html>` that carries the active brand preset, so the
 * stylesheet can switch the accent color.
 */
const BRAND_ATTRIBUTE = 'data-lumina-brand'

/**
 * Apply the settings snapshot to the document root.
 *
 * @param config - the active settings.
 */
function applyConfigToDocument(config: LuminaConfig): void {
  const root = document.documentElement
  root.setAttribute(ROOT_ATTRIBUTE, config.master ? 'on' : 'off')
  root.setAttribute(BRAND_ATTRIBUTE, config.brand)
}

/**
 * Install the plugin: read the settings, publish them to the document, and
 * run every enabled effect.
 *
 * @param ctx - the client context.
 */
export function apply(ctx: LuminaClientContext): void {
  const config = readConfig()
  applyConfigToDocument(config)

  // The base stylesheet carries the shared variables and the reduced-motion
  // stop. It is installed before the effects so a broken effect still leaves
  // the page in a coherent state.
  const disposeBase = installStyle('base', `${brandCss(config.brand)}\n${reducedMotionCss()}`)

  const disposeEffects = runEffects(
    {
      master: config.master,
      enabled: (id: EffectId) => config.effects[id],
    },
    {
      brand: () => installBrand(ctx),
      composerGlow: () => {
        // P1: the composer edge glow. Not installed yet.
      },
      caret: () => {
        // P1: the streaming caret. Not installed yet.
      },
      press: () => {
        // P2: button press feedback and the send flash. Not installed yet.
      },
      hero: () => {
        // P2: the new-session hero entrance. Not installed yet.
      },
    },
  )

  ctx.effect(() => {
    disposeEffects()
    disposeBase()
    removeAllStyles()
    document.documentElement.removeAttribute(ROOT_ATTRIBUTE)
    document.documentElement.removeAttribute(BRAND_ATTRIBUTE)
  }, 'dsh-lumina: teardown')

  if (prefersReducedMotion()) {
    // The reduced-motion stylesheet already stops every animation; this log
    // line is the only signal that the preference is active.
    console.info('[dsh-lumina] reduced motion is active; animations are disabled')
  }
}
