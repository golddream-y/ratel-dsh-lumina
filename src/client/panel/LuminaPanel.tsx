/**
 * The Lumina settings page.
 *
 * Registered into the `settings.section` list slot: one page in the settings
 * navigation, owned entirely by this plugin. The shell contributes the frame
 * and the navigation; everything inside the page — chrome, controls, copy —
 * belongs to Lumina.
 *
 * The component follows the staged-form pattern the client's own panels use:
 * edits land in a local draft, the committed snapshot stays untouched until
 * the user saves, and a change made elsewhere is detected as a conflict
 * rather than silently overwritten.
 */

import { useEffect, useRef, useState } from 'react'
import type { LuminaConfig } from '../core/config.ts'
import { DEFAULT_CONFIG } from '../core/config.ts'

/** The props the shell binds for a settings section entry. */
export interface LuminaPanelProps {
  /** The committed settings snapshot, bound from the store. */
  useSettings: (selector: (config: LuminaConfig) => LuminaConfig) => LuminaConfig
  /** Persist a draft and return the committed snapshot. */
  save: (config: LuminaConfig) => LuminaConfig
  /** The localized copy function. */
  t: (key: string) => string
}

/** The effect ids the panel toggles, in display order. */
const EFFECT_ROWS = [
  { id: 'brand', label: 'effectBrand', hint: 'effectBrandHint' },
  { id: 'composerGlow', label: 'effectComposerGlow', hint: 'effectComposerGlowHint' },
  { id: 'caret', label: 'effectCaret', hint: 'effectCaretHint' },
  { id: 'press', label: 'effectPress', hint: 'effectPressHint' },
  { id: 'hero', label: 'effectHero', hint: 'effectHeroHint' },
  { id: 'sessionActivity', label: 'effectSessionActivity', hint: 'effectSessionActivityHint' },
] as const

/**
 * Compare two snapshots field by field.
 *
 * @param left - the first snapshot.
 * @param right - the second snapshot.
 * @returns whether they carry the same settings.
 */
function sameConfig(left: LuminaConfig, right: LuminaConfig): boolean {
  if (left.master !== right.master) return false
  if (left.brand !== right.brand) return false
  if (left.intensity !== right.intensity) return false
  return EFFECT_ROWS.every((row) => left.effects[row.id] === right.effects[row.id])
}

/**
 * Render the Lumina settings page.
 *
 * @param props - the bound store, the save action, and the localized copy.
 * @returns the page element.
 */
export function LuminaPanel(props: LuminaPanelProps) {
  const { t, save, useSettings } = props
  const saved = useSettings((config) => config)
  const [draft, setDraft] = useState<LuminaConfig>(saved)
  const [message, setMessage] = useState<string | null>(null)
  const base = useRef<LuminaConfig>(saved)

  // A commit made elsewhere replaces the committed snapshot under us. Keep the
  // base in step so the conflict flag means "the stored value moved", not
  // "the draft is stale".
  useEffect(() => {
    base.current = saved
  }, [saved])

  const dirty = !sameConfig(draft, saved)
  const conflict = saved !== base.current

  const edit = (patch: Partial<LuminaConfig>) => {
    setDraft((current) => ({ ...current, ...patch }))
    setMessage(null)
  }

  const editEffect = (id: (typeof EFFECT_ROWS)[number]['id'], enabled: boolean) => {
    setDraft((current) => ({
      ...current,
      effects: { ...current.effects, [id]: enabled },
    }))
    setMessage(null)
  }

  const cancel = () => {
    base.current = saved
    setDraft(saved)
    setMessage(null)
  }

  const apply = () => {
    const next = save(draft)
    base.current = next
    setDraft(next)
    setMessage(t('saved'))
  }

  const restore = () => {
    setDraft(DEFAULT_CONFIG)
    setMessage(null)
  }

  return (
    <div className="lumina-panel">
      <header className="lumina-panel-header">
        <h2 className="lumina-panel-title">{t('heading')}</h2>
        <p className="lumina-panel-intro">{t('intro')}</p>
      </header>

      <section className="lumina-section">
        <label className="lumina-row">
          <span className="lumina-row-text">
            <span className="lumina-row-title">{t('master')}</span>
            <span className="lumina-row-hint">{t('masterHint')}</span>
          </span>
          <input
            type="checkbox"
            className="lumina-switch"
            checked={draft.master}
            onChange={(event) => edit({ master: event.target.checked })}
          />
        </label>
      </section>

      <section className="lumina-section">
        <div className="lumina-field">
          <span className="lumina-row-title">{t('brand')}</span>
          <span className="lumina-row-hint">{t('brandHint')}</span>
          <div className="lumina-segmented" role="radiogroup" aria-label={t('brand')}>
            {(['ratel', 'deepseek'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                role="radio"
                aria-checked={draft.brand === preset}
                className="lumina-segment"
                data-active={draft.brand === preset ? 'true' : undefined}
                onClick={() => edit({ brand: preset })}
              >
                {preset === 'ratel' ? t('brandRatel') : t('brandDeepseek')}
              </button>
            ))}
          </div>
        </div>

        <div className="lumina-field">
          <span className="lumina-row-title">{t('intensity')}</span>
          <span className="lumina-row-hint">{t('intensityHint')}</span>
          <div className="lumina-segmented" role="radiogroup" aria-label={t('intensity')}>
            {(['subtle', 'normal', 'vivid'] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                role="radio"
                aria-checked={draft.intensity === tier}
                className="lumina-segment"
                data-active={draft.intensity === tier ? 'true' : undefined}
                onClick={() => edit({ intensity: tier })}
              >
                {t(`intensity${tier.charAt(0).toUpperCase()}${tier.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="lumina-section">
        <span className="lumina-section-title">{t('effects')}</span>
        {EFFECT_ROWS.map((row) => (
          <label key={row.id} className="lumina-row">
            <span className="lumina-row-text">
              <span className="lumina-row-title">{t(row.label)}</span>
              <span className="lumina-row-hint">{t(row.hint)}</span>
            </span>
            <input
              type="checkbox"
              className="lumina-switch"
              checked={draft.effects[row.id]}
              disabled={!draft.master}
              onChange={(event) => editEffect(row.id, event.target.checked)}
            />
          </label>
        ))}
      </section>

      <section className="lumina-section">
        <span className="lumina-section-title">{t('preview')}</span>
        <span className="lumina-row-hint">{t('previewHint')}</span>
        <div className="lumina-preview">
          <div className="lumina-preview-composer" data-active={draft.master && draft.effects.composerGlow ? 'true' : undefined}>
            <span className="lumina-preview-caret" data-active={draft.master && draft.effects.caret ? 'true' : undefined} />
          </div>
          <div className="lumina-preview-mark" data-brand={draft.brand} />
        </div>
      </section>

      <footer className="lumina-panel-footer">
        <button type="button" className="lumina-button" onClick={restore}>
          {t('restoreDefaults')}
        </button>
        <span className="lumina-panel-spacer" />
        {conflict ? <span className="lumina-panel-message">{t('updated')}</span> : null}
        {message ? <span className="lumina-panel-message">{message}</span> : null}
        <button type="button" className="lumina-button" onClick={cancel} disabled={!dirty}>
          {t('cancel')}
        </button>
        <button
          type="button"
          className="lumina-button"
          data-primary="true"
          onClick={apply}
          disabled={!dirty}
        >
          {t('save')}
        </button>
      </footer>
    </div>
  )
}
