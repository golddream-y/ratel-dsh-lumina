/**
 * Lumina settings: a small, strictly validated snapshot persisted in
 * localStorage under a versioned key.
 *
 * Validation principle (see docs/design/03): an illegal value falls back to
 * its default. Nothing throws, nothing is half-applied. A user with a
 * corrupted or future-versioned payload gets the defaults, not a broken UI.
 */

/** Storage key. The `/v1` suffix is the schema version, not a migration path. */
export const STORAGE_KEY = 'dsh-lumina/settings/v1'

/** Schema version. A payload whose version differs is ignored wholesale. */
export const SCHEMA_VERSION = 1

/** Brand preset identifiers. */
export type BrandPreset = 'ratel' | 'deepseek'

/** Motion intensity tiers; maps to a duration multiplier. */
export type Intensity = 'subtle' | 'normal' | 'vivid'

/** Per-effect switches. The keys are the effect ids used across the codebase. */
export interface EffectFlags {
  readonly brand: boolean
  readonly composerGlow: boolean
  readonly caret: boolean
  readonly press: boolean
  readonly hero: boolean
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
  brand: 'ratel',
  effects: {
    brand: true,
    composerGlow: true,
    caret: true,
    press: true,
    hero: true,
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

function readEffects(value: unknown): EffectFlags {
  const source = isRecord(value) ? value : {}
  return {
    brand: readBoolean(source.brand, DEFAULT_CONFIG.effects.brand),
    composerGlow: readBoolean(source.composerGlow, DEFAULT_CONFIG.effects.composerGlow),
    caret: readBoolean(source.caret, DEFAULT_CONFIG.effects.caret),
    press: readBoolean(source.press, DEFAULT_CONFIG.effects.press),
    hero: readBoolean(source.hero, DEFAULT_CONFIG.effects.hero),
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
    return parseConfig(globalThis.localStorage?.getItem(STORAGE_KEY) ?? null)
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
