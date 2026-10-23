/** One final layout, then compositor translations; never interpolate text layout. */
import { panelFrames, panelFrameState } from '../adapter/targets.ts'
import { PANEL_MOTION as motion } from '../style/tokens.ts'
import { installStyle } from '../core/styles.ts'
import { prefersReducedMotion, watchReducedMotion } from '../core/motion.ts'
import { reservePanelMotion } from './panel-budget.ts'

export function installPanels(): () => void {
  type Scene = { frame: HTMLElement; center: HTMLElement; side: HTMLElement; state: ReturnType<typeof panelFrameState>; midpoint: number; sideWidth: number; width: number; animations: Animation[]; restoreSide?: () => void; observer: MutationObserver; mark: string | null }
  const scenes = new Map<HTMLElement, Scene>()
  const style = installStyle('panels', `[data-lumina="on"] [data-lumina-panel-frame] { transition: none !important; --ds-transition-duration-slow: 240ms; --ds-ease-in-out: ${motion.easing}; }
[data-lumina="on"] [data-lumina-panel-frame] > :first-child { grid-column: 1; }
[data-lumina="on"] [data-lumina-panel-frame] > :nth-child(2) { grid-column: 2; }
[data-lumina="on"] [data-lumina-panel-frame] > [data-rightbar-col] { grid-column: 3; }`)
  const midpoint = (element: HTMLElement) => { const r = element.getBoundingClientRect(); return r.left + r.width / 2 }
  function stop(scene: Scene) {
    for (const animation of scene.animations) { animation.onfinish = null; animation.cancel() }
    scene.animations = []; scene.restoreSide?.(); scene.restoreSide = undefined
  }
  function remember(scene: Scene) {
    scene.midpoint = midpoint(scene.center); scene.sideWidth = scene.side.getBoundingClientRect().width; scene.width = scene.frame.clientWidth
  }
  function update(scene: Scene) {
    const next = panelFrameState(scene.frame), previous = scene.state
    const changed = next.left !== previous.left || next.right !== previous.right
    scene.state = next
    if (!changed || next.blocked || prefersReducedMotion() || scene.width !== scene.frame.clientWidth) {
      if (next.blocked || prefersReducedMotion() || scene.width !== scene.frame.clientWidth) stop(scene)
      if (!scene.animations.length) remember(scene)
      return
    }
    const from = scene.animations.length ? midpoint(scene.center) : scene.midpoint
    const oldSideWidth = scene.sideWidth
    stop(scene)
    remember(scene)
    const duration = (previous.left && !next.left) || (previous.right && !next.right) ? motion.open : motion.close
    reservePanelMotion(duration + 40)
    const play = (target: HTMLElement, frames: Keyframe[]) => {
      const animation = target.animate(frames, { duration, easing: motion.easing })
      scene.animations.push(animation)
      animation.onfinish = () => {
        animation.cancel(); scene.animations = scene.animations.filter(item => item !== animation)
        if (!scene.animations.length) { scene.restoreSide?.(); scene.restoreSide = undefined; remember(scene) }
      }
    }
    const dx = from - scene.midpoint
    if (Math.abs(dx) > .5) play(scene.center, [{ translate: `${dx}px 0` }, { translate: '0px 0' }])
    // Native macOS sidebar contents linger during collapse; slide the original column.
    if (!previous.left && next.left && scene.sideWidth === 0 && oldSideWidth > 0) {
      const keys = ['position','top','bottom','left','width','z-index']
      const saved = keys.map(key => [key, scene.side.style.getPropertyValue(key), scene.side.style.getPropertyPriority(key)])
      scene.restoreSide = () => { for (const [key,value,priority] of saved) { if (value) scene.side.style.setProperty(key!,value,priority); else scene.side.style.removeProperty(key!) } }
      Object.assign(scene.side.style, { position: 'absolute', top: '0', bottom: '0', left: '0', width: `${oldSideWidth}px`, zIndex: '10' })
      play(scene.side, [{ translate: '0px 0', opacity: 1 }, { translate: `${-oldSideWidth}px 0`, opacity: 0 }])
    } else if (previous.left && !next.left) {
      play(scene.side, [{ translate: '-12px 0', opacity: 0 }, { translate: '0px 0', opacity: 1 }])
    }
  }
  function discover() {
    if (typeof document === 'undefined') return
    for (const frame of panelFrames()) {
      if (scenes.has(frame) || typeof frame.animate !== 'function') continue
      const side = frame.children[0], center = frame.children[1]
      if (!(side instanceof HTMLElement) || !(center instanceof HTMLElement)) continue
      const observer = new MutationObserver(() => update(scene))
      const scene: Scene = { frame, center, side, state: panelFrameState(frame), midpoint: 0, sideWidth: 0, width: 0, animations: [], observer, mark: frame.getAttribute('data-lumina-panel-frame') }
      scenes.set(frame, scene); frame.setAttribute('data-lumina-panel-frame', ''); remember(scene)
      observer.observe(frame, { attributes: true, attributeFilter: ['style','data-sidebar-collapsed','data-rightbar-collapsed','data-dragging','data-rightbar-fullscreen','data-rightbar-instant'] })
    }
    for (const [frame, scene] of scenes) if (!frame.isConnected) { stop(scene); scene.observer.disconnect(); restoreMark(scene); scenes.delete(frame) }
  }
  function restoreMark(scene: Scene) { if (scene.mark === null) scene.frame.removeAttribute('data-lumina-panel-frame'); else scene.frame.setAttribute('data-lumina-panel-frame', scene.mark) }
  const observer = new MutationObserver(records => { if (scenes.size && [...scenes.keys()].every(frame => frame.isConnected)) return; if (records.some(record => record.addedNodes.length || record.removedNodes.length)) discover() })
  observer.observe(document.body, { childList: true, subtree: true })
  const resize = () => { for (const scene of scenes.values()) { stop(scene); remember(scene) } }
  window.addEventListener('resize', resize)
  const unwatch = watchReducedMotion(resize)
  discover()
  return () => { observer.disconnect(); unwatch(); window.removeEventListener('resize', resize); for (const scene of scenes.values()) { scene.observer.disconnect(); stop(scene); restoreMark(scene) } scenes.clear(); style() }
}
