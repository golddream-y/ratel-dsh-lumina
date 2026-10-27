/** Performance is one preference; details are generated from the renderer's budgets. */
import { useEffect, useId, useRef, useState } from 'react'
import { PERFORMANCE_PROFILES, RENDER_BUDGETS, type PerformanceProfile } from '../core/performance.ts'

export function PerformanceSettings({ value, disabled, onChange, t }: {
  value: PerformanceProfile; disabled: boolean; onChange: (profile: PerformanceProfile) => void; t: (key: string) => string
}) {
  const id = useId(), container = useRef<HTMLDivElement>(null)
  const [info, setInfo] = useState<PerformanceProfile | null>(null)
  const dismissed = useRef(false)
  const show = (profile: PerformanceProfile) => { dismissed.current = false; setInfo(profile) }
  const hide = () => { dismissed.current = true; setInfo(null) }
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !container.current?.contains(event.target)) hide() }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') hide() }
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [])
  const b = info ? RENDER_BUDGETS[info] : null
  const closeHover = () => {
    const focused = container.current?.contains(document.activeElement)
      ? (document.activeElement as HTMLElement).dataset.performanceProfile : undefined
    setInfo(!dismissed.current && PERFORMANCE_PROFILES.includes(focused as PerformanceProfile) ? focused as PerformanceProfile : null)
  }
  return <section className="lumina-section lumina-performance">
    <h3 className="lumina-section-title">{t('performanceHeading')}</h3>
    <p className="lumina-row-hint lumina-performance-intro">{t('performanceHint')}</p>
    <div ref={container} className="lumina-performance-control" onMouseLeave={closeHover} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setInfo(null)
    }}>
      <div className="lumina-segmented lumina-performance-options" role="radiogroup" aria-label={t('performanceHeading')}>
        {PERFORMANCE_PROFILES.map(profile => <button key={profile} type="button" role="radio" aria-checked={profile === value}
          data-performance-profile={profile} data-active={profile === value ? 'true' : undefined} disabled={disabled}
          aria-describedby={info === profile ? `${id}-details` : undefined}
          tabIndex={profile === value ? 0 : -1} className="lumina-segment lumina-performance-choice"
          onMouseEnter={() => show(profile)} onFocus={() => show(profile)}
          onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
            event.preventDefault()
            const index = PERFORMANCE_PROFILES.indexOf(profile)
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? PERFORMANCE_PROFILES.length - 1
              : (index + (event.key === 'ArrowRight' ? 1 : -1) + PERFORMANCE_PROFILES.length) % PERFORMANCE_PROFILES.length
            onChange(PERFORMANCE_PROFILES[next]!)
            event.currentTarget.closest('.lumina-performance-options')?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
          }} onClick={() => { onChange(profile); show(profile) }}>{t(`performance_${profile}`)}</button>)}
      </div>
      {info && b ? <div id={`${id}-details`} role="tooltip" className="lumina-performance-details">
        <strong>{t(`performance_${info}`)}</strong>
        <p>{t(`performanceHint_${info}`)}</p>
        <dl>
          <dt>{t('performanceFrames')}</dt><dd>{b.backgroundFps} / {b.interactionFps} fps</dd>
          <dt>{t('performanceGalaxy')}</dt><dd>{b.stars} {t('performanceStars')} · {b.filaments} {t('performanceLines')} · {b.cloudResolution} {t('performanceCloudResolution')} · {b.cloudSteps} {t('performanceCloudSteps')} · DPR ≤ {b.galaxyDpr}</dd>
          <dt>{t('performanceRibbon')}</dt><dd>DPR ≤ {b.ribbonDpr} · {(b.ribbonPixels / 1_000_000).toFixed(1)} MP · MSAA {b.ribbonSamples}× · {b.ribbonColumns} × 16</dd>
          <dt>{t('performanceEntrance')}</dt><dd>≤ {b.heroParticles} {t('performanceStars')} · DPR ≤ {b.heroDpr}</dd>
        </dl>
        <p className="lumina-row-hint">{t('performanceScope')}</p>
      </div> : null}
    </div>
    <p className="lumina-performance-summary">{t(`performanceHint_${value}`)}</p>
  </section>
}
