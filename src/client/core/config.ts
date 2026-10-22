/**
 * Lumina settings: a small, strictly validated snapshot persisted in
 * localStorage under a versioned key.
 *
 * Validation principle (see docs/product/MVP.md §3): an illegal value falls back to
 * its default. Nothing throws, nothing is half-applied. A user with a
 * corrupted or future-versioned payload gets the defaults, not a broken UI.
 */

/** Storage key. The `/v1` suffix is the schema version, not a migration path. */
export const STORAGE_KEY = 'ratel-lumina/settings/v1'

/** The pre-Ratel key, read once so an existing local install keeps its settings. */
export const LEGACY_STORAGE_KEY = 'dsh-lumina/settings/v1'

/** Schema version. A payload whose version differs is ignored wholesale. */
export const SCHEMA_VERSION = 1

/** Brand preset identifiers. */
export type BrandPreset = 'ratel' | 'deepseek'

/** Motion intensity tiers; maps to a duration multiplier. */
export type Intensity = 'subtle' | 'normal' | 'vivid'

/**
 * The send transition modes.
 *
 * `off` keeps the send free of any decoration; the other three replace the
 * message feedback with a distinct transition.
 */
export type TransferMode = 'off' | 'liquid' | 'dissolve' | 'ghost'

/** The modes a user can pick, in settings order. */
export const TRANSFER_MODES: readonly TransferMode[] = ['off', 'liquid', 'dissolve', 'ghost']

/** Per-effect switches. The keys are the effect ids used across the codebase. */
export interface EffectFlags {
  readonly brand: boolean
  readonly composerGlow: boolean
  readonly caret: boolean
  readonly press: boolean
  readonly sendTransition: TransferMode
  readonly hero: boolean
  readonly sessionActivity: boolean
}

/** The full settings snapshot. */
export interface LuminaConfig {
  readonly version: number
  readonly master: boolean
  readonly brand: BrandPreset
  readonly effects: EffectFlags
  readonly intensity: Intensity
}

/** The defaults every fresh install starts from. */
export const DEFAULT_CONFIG: LuminaConfig = {
  version: SCHEMA_VERSION,
  master: true,
  brand: 'deepseek',
  effects: {
    brand: true,
    composerGlow: true,
    caret: true,
    press: true,
    sendTransition: 'dissolve',
    hero: true,
    sessionActivity: true,
  },
  intensity: 'normal',
}

const BRAND_PRESETS: readonly BrandPreset[] = ['ratel', 'deepseek']
const INTENSITIES: readonly Intensity[] = ['subtle', 'normal', 'vivid']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function readBrand(value: unknown): BrandPreset {
  return BRAND_PRESETS.includes(value as BrandPreset) ? (value as BrandPreset) : DEFAULT_CONFIG.brand
}

function readIntensity(value: unknown): Intensity {
  return INTENSITIES.includes(value as Intensity) ? (value as Intensity) : DEFAULT_CONFIG.intensity
}

/**
 * Read the send transition mode.
 *
 * The first release stored a boolean switch; `true` becomes the liquid mode
 * and `false` becomes `off`, so an existing install keeps its behaviour.
 */
function readTransferMode(value: unknown, legacy: unknown): TransferMode {
  if (typeof value === 'boolean') return value ? 'liquid' : 'off'
  if (typeof legacy === 'boolean') return legacy ? 'liquid' : 'off'
  // A short-lived release offered a standalone `mist` mode; the ghost owns the
  // mist trail now, so an existing selection folds into it.
  if (value === 'mist') return 'ghost'
  return TRANSFER_MODES.includes(value as TransferMode) ? (value as TransferMode) : DEFAULT_CONFIG.effects.sendTransition
}

function readEffects(value: unknown): EffectFlags {
  const source = isRecord(value) ? value : {}
  return {
    brand: readBoolean(source.brand, DEFAULT_CONFIG.effects.brand),
    composerGlow: readBoolean(source.composerGlow, DEFAULT_CONFIG.effects.composerGlow),
    caret: readBoolean(source.caret, DEFAULT_CONFIG.effects.caret),
    press: readBoolean(source.press, DEFAULT_CONFIG.effects.press),
    sendTransition: readTransferMode(source.sendTransition, source.sendTransfer),
    hero: readBoolean(source.hero, DEFAULT_CONFIG.effects.hero),
    sessionActivity: readBoolean(source.sessionActivity, DEFAULT_CONFIG.effects.sessionActivity),
  }
}

/**
 * Parse a stored payload into a validated snapshot.
 *
 * @param raw - the JSON text read from storage; `null` when nothing is stored.
 * @returns a complete snapshot; defaults fill every missing or illegal field.
 */
export function parseConfig(raw: string | null): LuminaConfig {
  if (raw === null) return DEFAULT_CONFIG
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return DEFAULT_CONFIG
  }
  if (!isRecord(parsed) || parsed.version !== SCHEMA_VERSION) return DEFAULT_CONFIG
  return {
    version: SCHEMA_VERSION,
    master: readBoolean(parsed.master, DEFAULT_CONFIG.master),
    brand: readBrand(parsed.brand),
    effects: readEffects(parsed.effects),
    intensity: readIntensity(parsed.intensity),
  }
}

/**
 * Read the current settings from localStorage.
 *
 * @returns the validated snapshot; defaults when storage is unavailable.
 */
export function readConfig(): LuminaConfig {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY)
      ?? globalThis.localStorage?.getItem(LEGACY_STORAGE_KEY)
      ?? null
    return parseConfig(raw)
  } catch {
    return DEFAULT_CONFIG
  }
}

/**
 * Persist a settings snapshot, replacing the stored payload wholesale.
 *
 * @param config - the snapshot to persist.
 * @returns whether the write succeeded.
 */
export function writeConfig(config: LuminaConfig): boolean {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(config))
    return true
  } catch {
    return false
  }
}

/**
 * The duration multiplier for the current intensity tier.
 *
 * @param intensity - the configured tier.
 * @returns the multiplier applied to every baseline duration.
 */
export function intensityFactor(intensity: Intensity): number {
  switch (intensity) {
    case 'subtle':
      return 0.6
    case 'vivid':
      return 1.4
    case 'normal':
      return 1
  }
}

/**
 * A live view over the persisted settings.
 *
 * The settings page edits a draft and commits it; the effects read the
 * committed snapshot and re-apply when it changes. A store is the seam that
 * lets the panel and the effects share one truth without either knowing about
 * the other's storage.
 */
export interface ConfigStore {
  /** The current committed snapshot; the same reference until it changes. */
  getSnapshot: () => LuminaConfig
  /** Observe committed changes. */
  subscribe: (listener: () => void) => () => void
  /**
   * Persist a snapshot and notify the subscribers.
   *
   * @param config - the snapshot to persist.
   * @returns the persisted snapshot, or the previous one when the write failed.
   */
  commit: (config: LuminaConfig) => LuminaConfig
}

/**
 * Create a store over the settings persisted in localStorage.
 *
 * Writes from another tab arrive through the `storage` event, so two open
 * clients stay consistent.
 *
 * @returns the store.
 */
export function createConfigStore(): ConfigStore {
  let snapshot = readConfig()
  const listeners = new Set<() => void>()

  const notify = () => {
    for (const listener of listeners) {
      try {
        listener()
      } catch (error) {
        console.warn('[ratel-lumina] settings listener failed', error)
      }
    }
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY && event.key !== LEGACY_STORAGE_KEY) return
    const next = readConfig()
    if (next === snapshot) return
    snapshot = next
    notify()
  }

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', onStorage)
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    commit: (config) => {
      if (!writeConfig(config)) return snapshot
      snapshot = config
      notify()
      return snapshot
    },
  }
}
