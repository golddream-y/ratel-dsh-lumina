/**
 * Browser half of Lumina: the module the client loads and the effect
 * orchestrator behind it.
 *
 * The client loads this file through `window.__ModuleLoader__.load(...)`, so
 * the module contract is narrow on purpose: `apply` and `inject` are exported
 * and nothing else.
 *
 * Two surfaces are registered here:
 *
 * - the brand slots, which carry the motion itself;
 * - the settings page, which lets the user switch the effects off.
 *
 * Both read the same committed settings snapshot, so a change in the settings
 * page re-applies the effects without a reload.
 */

import { createConfigStore, type ConfigStore, type LuminaConfig } from './core/config.ts'
import { prefersReducedMotion, reducedMotionCss } from './core/motion.ts'
import { runEffects, type EffectId } from './core/registry.ts'
import { installStyle, removeAllStyles } from './core/styles.ts'
import { ALL_KEYFRAMES } from './core/keyframes.ts'
import { brandCss, installBrand } from './effects/brand.ts'
import { LuminaPanel } from './panel/LuminaPanel.tsx'
import { panelCss } from './panel/styles.ts'
import { en, zh, LUMINA_LOCALE_NAMESPACE } from './locales.ts'

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
  /** The locale registry, used for the settings page label and copy. */
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
export const inject = ['slots', 'locale']

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
 * The identity of the Lumina settings page inside the settings navigation.
 */
const SETTINGS_SECTION_ID = 'dsh-lumina'

/**
 * The position of the Lumina page among the settings pages. The shipped
 * pages use the low hundreds; a larger value places Lumina after them.
 */
const SETTINGS_SECTION_ORDER = 1200

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
 * The stylesheet shared by every surface: the brand variables, the shared
 * keyframes, and the reduced-motion stop.
 *
 * @param config - the active settings.
 * @returns the stylesheet text.
 */
function baseCss(config: LuminaConfig): string {
  return `${brandCss(config.brand)}\n${ALL_KEYFRAMES}\n${reducedMotionCss()}`
}

/**
 * Install every enabled effect.
 *
 * @param ctx - the client context.
 * @param config - the active settings.
 * @returns a disposer removing the styles and releasing the registrations.
 */
function installEffects(ctx: LuminaClientContext, config: LuminaConfig): () => void {
  const disposers: Array<() => void> = []

  // The base stylesheet is installed before the effects so a broken effect
  // still leaves the page in a coherent state.
  disposers.push(installStyle('base', baseCss(config)))

  disposers.push(
    runEffects(
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
    ),
  )

  return () => {
    for (let index = disposers.length - 1; index >= 0; index -= 1) {
      disposers[index]?.()
    }
  }
}

/**
 * Register the Lumina settings page.
 *
 * The page is a `settings.section` list entry: one page in the settings
 * navigation that this plugin owns end to end. `label` is a thunk so the
 * localized text follows the active locale without the shell subscribing to
 * locale state.
 *
 * @param ctx - the client context.
 * @param store - the settings store the page edits.
 * @returns a disposer releasing the registration.
 */
function installSettingsSection(ctx: LuminaClientContext, store: ConfigStore): () => void {
  return ctx.slots.inject('settings.section', () => {
    let release: (() => void) | undefined
    try {
      release = ctx.slots.register(
        {
          name: 'settings.section',
          id: SETTINGS_SECTION_ID,
          order: SETTINGS_SECTION_ORDER,
          label: () => ctx.locale?.bind(LUMINA_LOCALE_NAMESPACE)('nav') ?? 'Lumina',
          locale: LUMINA_LOCALE_NAMESPACE,
          inject: () => ({
            hooks: { settings: store },
            save: (config: LuminaConfig) => store.commit(config),
          }),
        },
        LuminaPanel,
      )
    } catch (error) {
      console.warn('[dsh-lumina] cannot occupy the settings section', error)
    }
    return () => {
      release?.()
    }
  })
}

/**
 * Apply the plugin: publish the locale, open the settings page, and run
 * every enabled effect.
 *
 * @param ctx - the client context.
 */
export function apply(ctx: LuminaClientContext): void {
  const store = createConfigStore()

  // The locale namespace must exist before the settings page is registered:
  // the page's label reads from it during the first projection.
  const disposeLocale = ctx.locale?.register(LUMINA_LOCALE_NAMESPACE, { en, zh })

  // The settings page must stay usable while the master switch is off, so its
  // stylesheet is installed independently of the effects.
  const disposePanel = installStyle('panel', panelCss())

  const disposeSection = installSettingsSection(ctx, store)

  let disposeEffects: (() => void) | undefined
  const render = () => {
    disposeEffects?.()
    const config = store.getSnapshot()
    applyConfigToDocument(config)
    disposeEffects = installEffects(ctx, config)
  }
  render()

  // A settings change re-applies the effects: the master switch, the brand
  // preset, and the per-effect switches all change what is installed.
  const unsubscribe = store.subscribe(render)

  ctx.effect(() => {
    unsubscribe()
    disposeEffects?.()
    disposeSection()
    disposePanel()
    disposeLocale?.()
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
