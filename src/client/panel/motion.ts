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
