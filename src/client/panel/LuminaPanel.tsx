import { usePanelMotion } from './motion.ts'
import { getMotionStatus, subscribeMotionStatus } from '../core/frame-scheduler.ts'
import { PerformanceSettings } from './PerformanceSettings.tsx'
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

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { BrandMark } from '../brand/artwork.tsx'
import { PRESET_VARIABLES } from '../effects/brand.ts'
import type { CSSProperties } from 'react'
import type { LuminaConfig, TransferMode } from '../core/config.ts'
import { DEFAULT_CONFIG, TRANSFER_MODES } from '../core/config.ts'
import { getTransferStatus, subscribeTransferStatus } from '../core/transfer-status.ts'

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
  { id: 'dialogMotion', label: 'effectDialogMotion', hint: 'effectDialogMotionHint' },
  { id: 'menuMotion', label: 'effectMenuMotion', hint: 'effectMenuMotionHint' },
  { id: 'sessionSelection', label: 'effectSessionSelection', hint: 'effectSessionSelectionHint' },
  { id: 'panelMotion', label: 'effectPanelMotion', hint: 'effectPanelMotionHint' },
  { id: 'groupMotion', label: 'effectGroupMotion', hint: 'effectGroupMotionHint' },
  { id: 'brand', label: 'effectBrand', hint: 'effectBrandHint' },
  { id: 'composerGlow', label: 'effectComposerGlow', hint: 'effectComposerGlowHint' },
  { id: 'caret', label: 'effectCaret', hint: 'effectCaretHint' },
  { id: 'typeWave', label: 'effectTypeWave', hint: 'effectTypeWaveHint' },
  { id: 'press', label: 'effectPress', hint: 'effectPressHint' },
  { id: 'composerRibbon', label: 'effectComposerRibbon', hint: 'effectComposerRibbonHint' },
  { id: 'hero', label: 'effectHero', hint: 'effectHeroHint' },
  { id: 'sessionActivity', label: 'effectSessionActivity', hint: 'effectSessionActivityHint' },
] as const

/**
 * The effect groups, in display order.
 *
 * Grouped by where the effect shows up rather than by how often it is used:
 * Lumina has no usage data, and a wrong "frequently used" bucket is worse than
 * a predictable location. The subtitle names the surface for first-time use.
 */
const GROUPS = [
  { title: 'groupSidebar', subtitle: 'groupSidebarHint', ids: ['brand', 'sessionActivity', 'sessionSelection', 'groupMotion'] },
  { title: 'groupInputSend', subtitle: 'groupInputSendHint', ids: ['composerGlow', 'caret', 'typeWave', 'press'] },
  { title: 'groupSessionPage', subtitle: 'groupSessionPageHint', ids: ['hero', 'composerRibbon'] },
  { title: 'groupOverlays', subtitle: 'groupOverlaysHint', ids: ['panelMotion', 'dialogMotion', 'menuMotion'] },
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
  if (left.performance.profile !== right.performance.profile) return false
  if (left.effects.sendTransition !== right.effects.sendTransition) return false
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
  const motionStatus = useSyncExternalStore(subscribeMotionStatus, getMotionStatus)
  const transferStatus = useSyncExternalStore(subscribeTransferStatus, getTransferStatus)
  const saved = useSettings((config) => config)
  const [draft, setDraft] = useState<LuminaConfig>(saved)
  const [message, setMessage] = useState<string | null>(null)
  const base = useRef<LuminaConfig>(saved)
  const panelRoot = useRef<HTMLDivElement>(null)
  const feedback = usePanelMotion(panelRoot, draft.master)

  // A commit made elsewhere replaces the committed snapshot under us. Keep the
  // base in step so the conflict flag means "the stored value moved", not
  // "the draft is stale".
  const dirty = !sameConfig(draft, saved)
  const conflict = saved !== base.current
  useEffect(() => {
    if (sameConfig(draft, base.current)) { base.current = saved; setDraft(saved) }
  }, [saved])

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

  const editTransfer = (mode: TransferMode) => {
    setDraft((current) => ({
      ...current,
      effects: { ...current.effects, sendTransition: mode },
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
    if (!sameConfig(next, draft)) { setMessage(t('storageError')); return }
    base.current = next
    setDraft(next)
    setMessage(t('saved'))
    feedback.confirm()
  }

  const restore = () => {
    setDraft(DEFAULT_CONFIG)
    setMessage(null)
  }

  return (
    <div className="lumina-panel" ref={panelRoot} onClickCapture={feedback.onClickCapture}
      data-settings-motion={draft.master ? 'on' : 'off'}
      style={{ '--lumina-settings-accent': PRESET_VARIABLES[draft.brand]?.['--lumina-brand'] } as CSSProperties}>
      <header className="lumina-panel-header">
        <div className="lumina-header-copy">
          <h2 className="lumina-panel-title">{t('heading')}</h2>
          <p className="lumina-panel-intro">{t('intro')}</p>
        </div>
        <input type="checkbox" role="switch" aria-label={t('master')} title={t('masterHint')}
          className="lumina-switch" checked={draft.master}
          onChange={(event) => edit({ master: event.target.checked })} />
      </header>

      <section className="lumina-section lumina-section-general">
        <h3 className="lumina-section-title lumina-general-title">
          {t('general')}
          <span className="lumina-general-hint">{t('generalHint')}</span>
        </h3>
        <div className="lumina-field">
          <span className="lumina-field-head">
            <span className="lumina-row-title">{t('brand')}</span>
            <span className="lumina-row-hint">{t('brandHint')}</span>
          </span>
          <div className="lumina-segmented" role="radiogroup" aria-label={t('brand')}>
            {(['ratel', 'deepseek'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                role="radio"
                aria-checked={draft.brand === preset}
                className="lumina-segment"
                data-active={draft.brand === preset ? 'true' : undefined}
                disabled={!draft.master}
                onClick={() => edit({ brand: preset })}
              >
                <span style={{ ...PRESET_VARIABLES[preset], display: 'inline-flex', verticalAlign: 'middle', marginRight: 8 } as CSSProperties}><BrandMark size={30} periodic={false} /></span>
                {preset === 'ratel' ? t('brandRatel') : t('brandDeepseek')}
              </button>
            ))}
          </div>
        </div>
        <div className="lumina-field">
          <span className="lumina-field-head">
            <span className="lumina-row-title">{t('intensity')}</span>
            <span className="lumina-row-hint">{t('intensityHint')}</span>
          </span>
          <div className="lumina-segmented" role="radiogroup" aria-label={t('intensity')}>
            {(['subtle', 'normal', 'vivid'] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                role="radio"
                aria-checked={draft.intensity === tier}
                className="lumina-segment"
                data-active={draft.intensity === tier ? 'true' : undefined}
                disabled={!draft.master}
                onClick={() => edit({ intensity: tier })}
              >
                {t(`intensity${tier.charAt(0).toUpperCase()}${tier.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>
        <PerformanceSettings value={draft.performance.profile} disabled={!draft.master} t={t} bare
          onChange={profile => edit({ performance: { profile } })} />
      </section>

      {GROUPS.map(group => (
        <section className="lumina-section" key={group.title}>
          <h3 className="lumina-section-title lumina-group-title">
            {t(group.title)}
            <span className="lumina-group-subtitle">{t(group.subtitle)}</span>
          </h3>
          {group.ids.map((id) => {
            const row = EFFECT_ROWS.find(entry => entry.id === id)
            if (row === undefined) return null
            return (
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
            )
          })}
          {group.title === 'groupInputSend' ? (
            <div className="lumina-field">
              <span className="lumina-field-head">
                <span className="lumina-row-title">{t('effectSendTransfer')}</span>
                <span className="lumina-row-hint">{t('effectSendTransferHint')}</span>
              </span>
              <div className="lumina-segmented" role="radiogroup" aria-label={t('effectSendTransfer')}>
                {TRANSFER_MODES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={draft.effects.sendTransition === mode}
                    className="lumina-segment"
                    data-active={draft.effects.sendTransition === mode ? 'true' : undefined}
                    disabled={!draft.master}
                    onClick={() => editTransfer(mode)}
                  >
                    {t(`transferMode${mode.charAt(0).toUpperCase()}${mode.slice(1)}`)}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ))}

      <details className="lumina-section lumina-diagnostics">
        <summary>{t('diagnostics')}</summary>
        <p className="lumina-row-hint">{t('performanceRuntime')}: {t(`performanceState_${motionStatus.state}`)} · {t('performanceFrames')}: {motionStatus.backgroundFps} / {motionStatus.interactionFps} fps{motionStatus.yielding ? ` · ${t('performanceYielding')}` : ''}</p>
        <p className="lumina-row-hint" role="status">{t('transferStatusLabel')}: {t(`transferStatus_${transferStatus.code}`)} · {t('transferStarts')}: {transferStatus.starts}</p>
        <button type="button" className="lumina-button" onClick={restore}>{t('restoreDefaults')}</button>
      </details>

      <footer className="lumina-panel-footer">
        {dirty ? <span className="lumina-panel-message">{t('unsaved')}</span> : null}
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
