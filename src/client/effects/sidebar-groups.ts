/** Retune the host's own row lifecycle; never clone rows or defer business state. */
import { sidebarGroupHeader, sidebarMotionRoot, sidebarMotionTarget } from '../adapter/targets.ts'
import { prefersReducedMotion, watchReducedMotion } from '../core/motion.ts'
import { SIDEBAR_GROUP_MOTION as motion } from '../style/tokens.ts'

export function installSidebarGroups(): () => void {
  const pending = new Set<HTMLElement>()
  const originals = new Map<Animation, { effect: KeyframeEffect; frames: Keyframe[]; timing: OptionalEffectTiming }>()
  let frame = 0
  function restore() {
    for (const [animation, original] of originals) {
      if (animation.playState === 'running') {
        original.effect.setKeyframes(original.frames)
        original.effect.updateTiming(original.timing)
      }
    }
    originals.clear()
  }
  function update() {
    frame = 0
    // Keep bookkeeping bounded across many independent expand/collapse operations.
    for (const [animation] of originals) if (animation.playState === 'finished' || animation.playState === 'idle') originals.delete(animation)
    if (prefersReducedMotion()) { pending.clear(); return }
    for (const root of pending) {
      let index = 0
      for (const animation of root.getAnimations?.({ subtree: true }) ?? []) {
        if (originals.has(animation) || !(animation.effect instanceof KeyframeEffect)) continue
        const effect = animation.effect, target = effect.target
        if (!(target instanceof Element)) continue
        const kind = sidebarMotionTarget(target)
        if (!kind) continue
        const timing = effect.getTiming(), frames = effect.getKeyframes()
        // These signatures are verified in the shipped AnimatedRows implementation.
        if (frames.length !== 2 || timing.iterations !== 1 || timing.delay !== 0) continue
        const first = frames[0]!, last = frames[1]!
        const fade = timing.duration === 100 && first.opacity !== undefined && last.opacity !== undefined && first.transform === undefined && last.transform === undefined
        const move = kind === 'row' && timing.duration === 200 && first.transform !== undefined && last.transform !== undefined && last.opacity === '1'
        if (!fade && !move) continue
        originals.set(animation, { effect, frames, timing: { ...timing, duration: Number(timing.duration) } })
        const entering = fade && kind === 'row' && first.opacity === '0' && last.opacity === '1'
        if (entering) effect.setKeyframes([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'translateY(0)' }])
        effect.updateTiming({
          duration: move ? motion.move : kind === 'exit' ? motion.exit : motion.enter,
          delay: entering ? Math.min(index++ * motion.stagger, motion.maxDelay) : 0,
          fill: entering ? 'backwards' : timing.fill,
          easing: 'cubic-bezier(.22,.75,.25,1)',
        })
      }
    }
    pending.clear()
  }
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (!(record.target instanceof Element) || !sidebarGroupHeader(record.target)) continue
      const root = sidebarMotionRoot(record.target)
      if (root) pending.add(root)
    }
    if (pending.size && !frame) frame = requestAnimationFrame(update)
  })
  observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['aria-expanded'] })
  const stop = watchReducedMotion(() => { cancelAnimationFrame(frame); frame = 0; pending.clear(); restore() })
  return () => { observer.disconnect(); stop(); cancelAnimationFrame(frame); pending.clear(); restore() }
}
