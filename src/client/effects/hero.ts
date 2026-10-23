/** New-session particle assembly + stroke-to-fill brand entrance. */
import { createElement, useSyncExternalStore } from 'react'
import { HeroMark, type BrandArtworkProps } from '../brand/artwork.tsx'
import { currentHeroSession, heroHeadline, heroAccessories, heroAccessoryRoot } from '../adapter/targets.ts'
import { queryTarget } from '../adapter/selector.ts'
import type { TransferServices } from '../adapter/send-transfer.ts'
import { occupySlot, type SlotRegistryLike } from '../core/slots.ts'
import { ECHO_CSS, prepareHeroEcho } from './hero-echo.ts'
import { prefersReducedMotion, watchReducedMotion } from '../core/motion.ts'
import { installStyle } from '../core/styles.ts'
import { assembleComposer } from './hero-particles.ts'

export function heroCss(): string {
  return `${ECHO_CSS}
.lumina-hero-mark, .lumina-hero-art { position: relative; display: inline-flex; align-items: center; justify-content: center; }
.lumina-hero-art[data-play="true"] .lumina-whale-body path {
  stroke: var(--lumina-brand); stroke-width: .6; stroke-dasharray: 1; stroke-dashoffset: 1;
  animation: lumina-hero-stroke var(--lumina-hero-stroke) cubic-bezier(.22,.7,.3,1) both;
}
@keyframes lumina-hero-stroke {
  0% { stroke-dashoffset: 1; fill-opacity: 0; stroke-opacity: 1; }
  65% { stroke-dashoffset: 0; fill-opacity: 0; stroke-opacity: 1; }
  100% { stroke-dashoffset: 0; fill-opacity: 1; stroke-opacity: 0; }
}
.lumina-hero-title-stroke { position: absolute; left: 0; top: 0; pointer-events: none; overflow: visible; }
.lumina-hero-title-stroke text {
  fill-opacity: 0; stroke-dasharray: 600; stroke-dashoffset: 600;
  animation: lumina-title-stroke var(--lumina-hero-stroke) ease-out both;
}
@keyframes lumina-title-stroke {
  0% { stroke-dashoffset: 600; fill-opacity: 0; stroke-opacity: 1; }
  70% { stroke-dashoffset: 0; fill-opacity: 0; stroke-opacity: 1; }
  100% { stroke-dashoffset: 0; fill-opacity: 1; stroke-opacity: 0; }
}
.lumina-hero-particles { position: absolute; pointer-events: none; z-index: 2; max-width: none; }
[data-lumina="on"] [data-lumina-assembling] {
  background-color: transparent !important; border-color: transparent !important; box-shadow: none !important;
}
[data-lumina="on"] [data-lumina-assembling] > :not(.lumina-hero-particles),
[data-lumina="on"] [data-lumina-assembling]::before,
[data-lumina="on"] [data-lumina-assembling]::after { opacity: var(--lumina-assembly-reveal, 0) !important; }
@media (prefers-reduced-motion: reduce) {
  .lumina-hero-art[data-play="true"] .lumina-whale-body path, .lumina-hero-title-stroke text { animation: none; stroke: none; fill-opacity: 1; }
  .lumina-hero-particles { display: none; }
  [data-lumina="on"] [data-lumina-assembling] > :not(.lumina-hero-particles),
  [data-lumina="on"] [data-lumina-assembling]::before,
  [data-lumina="on"] [data-lumina-assembling]::after { opacity: 1 !important; }
}`
}

/** A local SVG uses the host font and text. It never moves or duplicates the whole hero. */
function strokeTitle(title: HTMLElement, duration: number, onComplete: () => void): () => void {
  const box = title.getBoundingClientRect()
  if (!box.width || !box.height) { onComplete(); return () => {} }
  const style = getComputedStyle(title)
  const oldColor = title.style.color, oldPosition = title.style.position
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.classList.add('lumina-hero-title-stroke')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('width', `${box.width}`); svg.setAttribute('height', `${box.height}`)
  const text = document.createElementNS(svg.namespaceURI, 'text')
  text.textContent = title.textContent
  text.setAttribute('x', '0'); text.setAttribute('y', `${box.height / 2}`)
  text.setAttribute('dominant-baseline', 'central')
  text.setAttribute('textLength', `${box.width}`); text.setAttribute('lengthAdjust', 'spacingAndGlyphs')
  text.setAttribute('fill', style.color); text.setAttribute('stroke', style.color); text.setAttribute('stroke-width', '.8')
  text.setAttribute('style', `font: ${style.font}; letter-spacing: ${style.letterSpacing}; animation-duration: ${duration}ms`)
  svg.append(text)
  title.style.position = 'relative'; title.style.color = 'transparent'; title.append(svg)
  let done = false
  const finish = () => {
    if (done) return
    done = true
    clearTimeout(timer)
    svg.remove(); title.style.color = oldColor; title.style.position = oldPosition
    onComplete()
  }
  const timer = setTimeout(finish, duration + 50)
  text.addEventListener('animationend', finish, { once: true })
  return finish
}

export function installHero(ctx: { slots: SlotRegistryLike } & TransferServices): () => void {
  const disposeStyle = installStyle('hero', heroCss())
  let active = () => {}
  let waitFrame = 0
  let disposed = false
  let interactionTargets: Element[] = []
  const clear = () => { cancelAnimationFrame(waitFrame); active(); active = () => {}; interactionTargets = [] }
  const entrance = (mark: HTMLElement) => {
    clear()
    if (disposed || prefersReducedMotion()) return
    const root = getComputedStyle(document.documentElement)
    const duration = parseFloat(root.getPropertyValue('--lumina-hero-assemble')) || 1100
    const strokeDuration = parseFloat(root.getPropertyValue('--lumina-hero-stroke')) || 1800
    const echoDuration = parseFloat(root.getPropertyValue('--lumina-hero-echo')) || 480
    const accessories = heroAccessories(mark)
    const accessoryRoot = heroAccessoryRoot(mark)
    interactionTargets = [mark, ...accessories]
    if (accessoryRoot !== document.documentElement) interactionTargets.push(accessoryRoot)
    const initialCard = queryTarget('composerCard')
    if (initialCard) interactionTargets.push(initialCard)
    const sprayAnimations: Animation[] = []
    const spray = () => {
      if (!running || !mark.isConnected || prefersReducedMotion()) return
      const body = mark.querySelector('.lumina-whale-body')
      const jet = mark.querySelector('.lumina-water-jet')
      const options: KeyframeAnimationOptions = { duration: 1400, easing: 'ease-in-out' }
      if (body) sprayAnimations.push(body.animate([
        { transform: 'none', offset: 0 },
        { transform: 'translateY(-1.5px)', offset: .3 },
        { transform: 'translateY(-.5px)', offset: .48 },
        { transform: 'translateY(-1.5px)', offset: .68 },
        { transform: 'translateY(-.5px)', offset: .84 },
        { transform: 'none', offset: 1 },
      ], options))
      if (jet) sprayAnimations.push(jet.animate([
        { opacity: 0, transform: 'scaleY(.05)', transformOrigin: '15px 7px', offset: 0 },
        { opacity: 1, transform: 'scaleX(.95) scaleY(1) skewX(-3deg)', offset: .25 },
        { opacity: 1, transform: 'scaleX(1.08) scaleY(.82) skewX(3deg)', offset: .43 },
        { opacity: 1, transform: 'scaleX(.9) scaleY(1.08) skewX(-2deg)', offset: .62 },
        { opacity: 1, transform: 'scaleX(.65) scaleY(.85)', offset: .8 },
        { opacity: 0, transform: 'scaleY(.05)', offset: 1 },
      ], options))
      const flow = mark.querySelector('.lumina-water-flow')
      if (flow) sprayAnimations.push(flow.animate([
        { transform: 'translateY(0)' }, { transform: 'translateY(-22px)' },
      ], { duration: 1400, easing: 'linear' }))
      mark.querySelectorAll('.lumina-water-fall').forEach((drop, index) => {
        const x = index === 0 ? -3 : 3
        sprayAnimations.push(drop.animate([
          { opacity: 0, transform: 'translate(0,0)', offset: 0 },
          { opacity: 0, transform: 'translate(0,0)', offset: .66 },
          { opacity: .9, transform: `translate(${x}px,-1px)`, offset: .78 },
          { opacity: 0, transform: `translate(${x}px,8px)`, offset: 1 },
        ], options))
      })
    }
    const echo = prepareHeroEcho(accessories, echoDuration, { root: accessoryRoot, targets: () => heroAccessories(mark), onComplete: spray })
    let running = true, remaining = 3
    const disposers = [echo.dispose, () => sprayAnimations.forEach(animation => animation.cancel())]
    active = () => { running = false; disposers.forEach(fn => fn()) }
    const completed = () => { if (running && --remaining === 0) echo.play() }
    waitFrame = requestAnimationFrame(() => {
      if (disposed || !mark.isConnected) { clear(); return }
      try {
        const card = queryTarget('composerCard') as HTMLElement | null
        if (card && !interactionTargets.includes(card)) interactionTargets.push(card)
        const title = heroHeadline(mark)
        let whaleDone = false
        const whaleFinished = () => {
          if (whaleDone) return
          whaleDone = true
          clearTimeout(whaleTimer)
          mark.removeEventListener('animationend', onWhaleEnd)
          completed()
        }
        const onWhaleEnd = (event: AnimationEvent) => { if (event.animationName === 'lumina-hero-stroke') whaleFinished() }
        const whaleTimer = setTimeout(whaleFinished, strokeDuration + 100)
        mark.addEventListener('animationend', onWhaleEnd)
        disposers.push(whaleFinished)
        if (card) disposers.push(assembleComposer(card, duration, completed)); else completed()
        if (title) disposers.push(strokeTitle(title, strokeDuration, completed)); else completed()
      } catch (error) {
        clear()
        console.warn('[ratel-lumina] hero entrance unavailable', error)
      }
    })
  }
  const face = ctx.uiSession?.current
  const snapshot = () => face?.getSnapshot().key ?? currentHeroSession()
  const subscribe = (listener: () => void) => {
    let previousKey = snapshot()
    return face?.subscribe(() => {
      const nextKey = snapshot()
      if (nextKey !== previousKey) { previousKey = nextKey; clear() }
      listener()
    }) ?? (() => {})
  }
  function SessionHero(props: BrandArtworkProps) {
    const sessionKey = useSyncExternalStore(subscribe, snapshot, snapshot)
    return createElement(HeroMark, { ...props, key: sessionKey, sessionKey, onEntrance: entrance })
  }
  const release = occupySlot(ctx.slots, 'conversation.hero.brand.mark', { priority: -20 }, SessionHero)
  const onInteraction = (event: Event) => {
    if (event.target instanceof Node && interactionTargets.some(element => element.contains(event.target as Node))) clear()
  }
  document.addEventListener('scroll', onInteraction, true)
  window.addEventListener('resize', clear)
  const interactions = ['pointerdown', 'keydown', 'beforeinput', 'compositionstart']
  for (const event of interactions) document.addEventListener(event, onInteraction, true)
  const stopMotion = watchReducedMotion(reduced => { if (reduced) clear() })
  return () => {
    disposed = true
    release(); clear()
    document.removeEventListener('scroll', onInteraction, true)
    window.removeEventListener('resize', clear)
    for (const event of interactions) document.removeEventListener(event, onInteraction, true)
    stopMotion()
    disposeStyle()
  }
}
