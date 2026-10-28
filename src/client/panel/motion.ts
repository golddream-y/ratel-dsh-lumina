/** Finite feedback on real settings controls; never starts a drawing loop. */
import { useEffect, useRef, type MouseEventHandler, type RefObject } from 'react'
import { prefersReducedMotion, watchReducedMotion } from '../core/motion.ts'

export function usePanelMotion(root: RefObject<HTMLDivElement>, enabled: boolean) {
  const active = useRef(new Map<HTMLElement, () => void>())
  const clear = () => { for (const dispose of [...active.current.values()]) dispose() }
  useEffect(() => {
    if (!enabled) clear()
    const hidden = () => { if (document.hidden) clear() }
    const unwatch = watchReducedMotion(reduced => { if (reduced) clear() })
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', hidden)
    return () => { unwatch(); window.removeEventListener('blur', clear); document.removeEventListener('visibilitychange', hidden); clear() }
  }, [enabled])

  const play = (button: HTMLElement) => {
    if (!enabled || document.hidden || prefersReducedMotion() || typeof button.animate !== 'function') return
    active.current.get(button)?.()
    const light = document.createElement('span')
    light.className = 'lumina-setting-glint'
    light.setAttribute('aria-hidden', 'true')
    button.append(light)
    let animation: Animation
    const dispose = () => { animation?.cancel(); light.remove(); if (active.current.get(button) === dispose) active.current.delete(button) }
    try {
      animation = light.animate([
        { transform: 'translateX(-85%)', opacity: 0, offset: 0 },
        { transform: 'translateX(-30%)', opacity: .55, offset: .3 },
        { transform: 'translateX(30%)', opacity: .35, offset: .7 },
        { transform: 'translateX(85%)', opacity: 0, offset: 1 },
      ], { duration: 420, easing: 'cubic-bezier(.22,.7,.3,1)' })
      active.current.set(button, dispose)
      void animation.finished.then(dispose, dispose)
    } catch { dispose() }
  }
  const onClickCapture: MouseEventHandler<HTMLDivElement> = event => {
    if (!(event.target instanceof Element)) return
    const button = event.target.closest<HTMLButtonElement>('.lumina-segment')
    if (button && root.current?.contains(button) && !button.disabled && button.dataset.active !== 'true') play(button)
  }
  return { onClickCapture, confirm: () => {
    const button = root.current?.querySelector<HTMLElement>('.lumina-button[data-primary="true"]')
    if (button) play(button)
  } }
}

/**
 * Publish the active chip's box on every segmented group under `root`.
 *
 * The selected state is drawn by one indicator per group instead of by tinting
 * each chip, so switching a mode slides the indicator to the new chip. Widths
 * differ per group (the colour preset carries brand marks, the send modes carry
 * five labels), so the box is measured rather than computed from an index.
 *
 * @param root - the panel element that owns the groups.
 * @param signature - re-measure when any selection changes.
 */
export function useSegmentIndicators(root: RefObject<HTMLElement>, signature: string) {
  useEffect(() => {
    const container = root.current
    if (container === null) return
    const measure = () => {
      for (const group of container.querySelectorAll<HTMLElement>('.lumina-segmented')) {
        const chip = group.querySelector<HTMLElement>('.lumina-segment[data-active="true"]')
        if (chip === null) { delete group.dataset.chip; continue }
        group.dataset.chip = 'ready'
        group.style.setProperty('--lumina-chip-x', `${chip.offsetLeft}px`)
        group.style.setProperty('--lumina-chip-y', `${chip.offsetTop}px`)
        group.style.setProperty('--lumina-chip-w', `${chip.offsetWidth}px`)
        group.style.setProperty('--lumina-chip-h', `${chip.offsetHeight}px`)
      }
    }
    measure()
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    observer?.observe(container)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [root, signature])
}
