import { installComposerRibbon } from './effects/composer-ribbon.ts'
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

import { createElement } from 'react'
import { createConfigStore, type ConfigStore, type LuminaConfig } from './core/config.ts'
import { prefersReducedMotion, reducedMotionCss } from './core/motion.ts'
import { runEffects, type EffectId } from './core/registry.ts'
import { installStyle, removeAllStyles } from './core/styles.ts'
import { occupySlot } from './core/slots.ts'
import { ALL_KEYFRAMES } from './core/keyframes.ts'
import { brandCss, installBrand } from './effects/brand.ts'
import { installCaret } from './effects/caret.ts'
import { installComposer } from './effects/composer.ts'
import { reportTransferStatus } from './core/transfer-status.ts'
import { installSendTransfer } from './effects/send-transfer.ts'
import type { TransferBridge, TransferServices } from './adapter/send-transfer.ts'
import { installPress } from './effects/press.ts'
import { installHero } from './effects/hero.ts'
import { installPanels } from './effects/panels.ts'
import { installSidebarGroups } from './effects/sidebar-groups.ts'
import { installSessionActivity } from './effects/session.ts'
import { installTypeWave } from './effects/type-wave.ts'
import { installStreamingState, type StreamingState } from './adapter/streaming.ts'
import { durationCss } from './style/tokens.ts'
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
export interface LuminaClientContext extends TransferServices {
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
export const inject = ['slots', 'locale', 'sessions', 'uiSession', 'uiConversation']

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
 * The attribute on `<html>` that carries the active intensity tier, so the
 * duration tokens can switch without re-installing the stylesheet.
 */
const INTENSITY_ATTRIBUTE = 'data-lumina-intensity'

/**
 * The identity of the Lumina settings page inside the settings navigation.
 */
const SETTINGS_SECTION_ID = 'ratel-lumina'

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
  root.setAttribute(INTENSITY_ATTRIBUTE, config.intensity)
}

/**
 * The stylesheet shared by every surface: the brand variables, the shared
 * keyframes, and the reduced-motion stop.
 *
 * @param config - the active settings.
 * @returns the stylesheet text.
 */
function baseCss(config: LuminaConfig): string {
  return `${brandCss(config.brand)}\n${durationCss()}\n${ALL_KEYFRAMES}\n${reducedMotionCss()}`
}

/**
 * Install every enabled effect.
 *
 * @param ctx - the client context.
 * @param config - the active settings.
 * @returns a disposer removing the styles and releasing the registrations.
 */
function installEffects(
  ctx: LuminaClientContext,
  config: LuminaConfig,
  streaming: StreamingState,
): () => void {
  const disposers: Array<() => void> = []

  let transfer: TransferBridge | undefined
  if (!config.master || config.effects.sendTransition === 'off') reportTransferStatus('disabled')

  // The base stylesheet is installed before the effects so a broken effect
  // still leaves the page in a coherent state.
  disposers.push(installStyle('base', baseCss(config)))

  disposers.push(
    runEffects(
      {
        master: config.master,
        enabled: (id: EffectId) => id === 'sendTransition'
          ? config.effects.sendTransition !== 'off'
          : config.effects[id],
      },
      {
        brand: () => installBrand(ctx),
        composerGlow: () => installComposer(),
        composerRibbon: () => installComposerRibbon(),
        caret: () => installCaret(),
        sendTransition: () => {
          const mode = config.effects.sendTransition
          transfer = installSendTransfer(ctx, mode === 'off' ? 'dissolve' : mode, config.intensity)
          return () => transfer?.dispose()
        },
        typeWave: () => installTypeWave(document, config.intensity),
        press: () => installPress(streaming, config.intensity, () => transfer?.ownsGesture() ?? false, (listener) => transfer?.onFallback(listener) ?? (() => {})),
        hero: () => installHero(ctx),
        sessionActivity: () => installSessionActivity(),
        panelMotion: () => installPanels(),
        groupMotion: () => installSidebarGroups(),
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
  return occupySlot(
    ctx.slots,
    'settings.section',
    {
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
}

/**
 * Register a visible failure page when `apply` throws.
 *
 * The client half is loaded lazily and a throw otherwise leaves no UI trace:
 * the plugin still appears installed while every effect is silently absent.
 * This page is diagnostic, not a feature surface; it intentionally has no
 * locale dependency so it can render when locale registration is the failure.
 *
 * @param ctx - the client context.
 * @param error - the thrown value.
 */
function installFailureSection(ctx: LuminaClientContext, error: unknown): void {
  const message = error instanceof Error
    ? `${error.message}\n\n${error.stack ?? ''}`
    : String(error)
  const firstLine = message.split('\n')[0] ?? 'unknown error'
  const FailurePanel = () => createElement(
    'pre',
    {
      style: {
        margin: 0,
        padding: '16px',
        whiteSpace: 'pre-wrap',
        overflow: 'auto',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: '12px',
        lineHeight: 1.5,
      },
    },
    message,
  )
  try {
    const dispose = ctx.slots.inject('settings.section', () => {
      let release: (() => void) | undefined
      try {
        release = ctx.slots.register(
          {
            name: 'settings.section',
            id: 'ratel-lumina-error',
            order: 1201,
            label: () => `Lumina error: ${firstLine.slice(0, 80)}`,
          },
          FailurePanel,
        )
      } catch (sectionError) {
        console.warn('[ratel-lumina] cannot show the failure section', sectionError)
      }
      return () => {
        release?.()
      }
    })
    try {
      ctx.effect(() => dispose, 'ratel-lumina: failure section')
    } catch (effectError) {
      console.warn('[ratel-lumina] cannot register the failure section teardown', effectError)
    }
  } catch (sectionError) {
    console.warn('[ratel-lumina] cannot inject the failure section', sectionError)
  }
}

/**
 * Apply the plugin: publish the locale, open the settings page, and run
 * every enabled effect.
 *
 * @param ctx - the client context.
 */
export function apply(ctx: LuminaClientContext): void {
  try {
    applyInner(ctx)
  } catch (error) {
    console.error('[ratel-lumina] apply failed', error)
    installFailureSection(ctx, error)
    throw error
  }
}

/**
 * The normal apply path, wrapped so a failure leaves a visible page.
 *
 * @param ctx - the client context.
 */
function applyInner(ctx: LuminaClientContext): void {
  const store = createConfigStore()

  // The locale namespace must exist before the settings page is registered:
  // the page's label reads from it during the first projection.
  const disposeLocale = ctx.locale?.register(LUMINA_LOCALE_NAMESPACE, { en, zh })

  // The settings page must stay usable while the master switch is off, so its
  // stylesheet is installed independently of the effects.
  const disposePanel = installStyle('panel', panelCss())

  const disposeSection = installSettingsSection(ctx, store)

  // One streaming observer for the whole plugin; effects read the root
  // attribute instead of observing the same mutation themselves.
  const streaming = installStreamingState()

  let disposeEffects: (() => void) | undefined
  const render = () => {
    disposeEffects?.()
    const config = store.getSnapshot()
    applyConfigToDocument(config)
    disposeEffects = installEffects(ctx, config, streaming)
  }
  render()

  // A settings change re-applies the effects: the master switch, the brand
  // preset, and the per-effect switches all change what is installed.
  const unsubscribe = store.subscribe(render)

  // `ctx.effect` runs this callback immediately and collects the disposer it
  // returns. Returning the teardown is mandatory: passing it as the callback
  // itself tears the plugin down during apply.
  ctx.effect(() => () => {
    unsubscribe()
    disposeEffects?.()
    streaming.dispose()
    disposeSection()
    disposePanel()
    disposeLocale?.()
    removeAllStyles()
    document.documentElement.removeAttribute(ROOT_ATTRIBUTE)
    document.documentElement.removeAttribute(BRAND_ATTRIBUTE)
    document.documentElement.removeAttribute(INTENSITY_ATTRIBUTE)
  }, 'ratel-lumina: teardown')

  if (prefersReducedMotion()) {
    // The reduced-motion stylesheet already stops every animation; this log
    // line is the only signal that the preference is active.
    console.info('[ratel-lumina] reduced motion is active; animations are disabled')
  }
}
