import { requestMotionFrame, cancelMotionFrame } from '../../core/frame-scheduler.ts'
/**
 * Shared runtime for the send transition modes.
 *
 * The runtime owns everything that must behave identically in every mode:
 * the overlay, the glyph copies, the reversible takeover of the host text,
 * the landing resolution and the cleanup. A mode only draws.
 */

import type { TransferRequest } from '../../adapter/send-transfer.ts'
import { snapshotGlyphs, snapshotSurface } from '../../adapter/glyphs.ts'
import { cssSelector } from '../../adapter/selector.ts'
import { isTransferScrollContainer } from '../../adapter/targets.ts'
import { prefersReducedMotion } from '../../core/motion.ts'
import { reportTransferStatus } from '../../core/transfer-status.ts'
import type { Intensity } from '../../core/config.ts'
import { durationMs } from '../../style/tokens.ts'
import { bubbleHost, center, glyphNode, paintedAncestor } from './shared.ts'
import { FLIGHT_START, TRANSFER_TIME } from '../liquid-geometry.ts'
import type { Point, TransferMode, TransferStage } from './types.ts'
import { flowLandingPoint, flowMessageReveal } from './flow-landing.ts'
import { composerHandoff, type ComposerHandoff } from './composer-handoff.ts'
import { createFlowRenderer, FLOW_TIME } from './flow.ts'
import { placeViewportOverlay, watchViewportScale } from '../../core/viewport.ts'
import { createLiquidRenderer } from './liquid.ts'
import { createDissolveRenderer } from './dissolve.ts'
import { createGhostRenderer } from './ghost.ts'

/** The attribute that hides host surfaces while a transition runs. */
import { MASK } from './styles.ts'
export { MASK } from './styles.ts'

let sequence = 0

/** Pick the renderer for a mode. */
function rendererFor(mode: TransferMode) {
  if (mode === 'flow') return createFlowRenderer()
  if (mode === 'ghost') return createGhostRenderer()
  if (mode === 'dissolve') return createDissolveRenderer()
  return createLiquidRenderer()
}

/**
 * Run one send transition.
 *
 * @param request - the confirmed submission and its landing lookup.
 * @param mode - the selected mode.
 * @param intensity - the active duration tier.
 * @returns a disposer that always restores the host content.
 */
export function runTransfer(
  request: TransferRequest,
  mode: TransferMode,
  intensity: Intensity,
): (() => void) | null {
  if (prefersReducedMotion() || typeof window.matchMedia !== 'function') return null
  const media = matchMedia('(prefers-reduced-motion: reduce)')
  const captured=request.source
  const firstLayout=mode==='flow' && request.composer?.firstSend ? request.composer : null
  const source=mode==='flow'?{...captured,box:{...captured.box},glyphs:captured.glyphs.map(g=>({...g}))}:captured
  const baseGlyphs=source.glyphs.map(g=>({...g}))
  const baseBox={...source.box}
  const hub = center(source),baseHub={...hub}
  let sourceCard = source.element.closest(cssSelector('composerCard'))
  if(firstLayout && (!(sourceCard instanceof HTMLElement)||!sourceCard.isConnected)) {
    const choices=Array.from(document.querySelectorAll<HTMLElement>(cssSelector('composerCard'))).filter(node=>node.getBoundingClientRect().width>0)
    sourceCard=choices.length===1?choices[0]!:null
  }
  if (!(sourceCard instanceof HTMLElement)) return null
  let card:HTMLElement=sourceCard
  const cardRect = firstLayout?.box ?? card.getBoundingClientRect()
  const corner = Math.max(28, parseFloat(getComputedStyle(card).borderTopLeftRadius) || 28)
  const edge: Point = {
    x: Math.max(cardRect.left + corner + 55, Math.min(cardRect.left + cardRect.width - corner - 55, hub.x + 42)),
    y: cardRect.top + 1,
  }
  const pad = 64
  const origin: Point = {
    x: Math.max(0, Math.min(source.box.left, hub.x) - pad),
    y: Math.max(0, Math.min(source.box.top, edge.y) - pad),
  }

  const id = `lumina-transfer-${++sequence}`
  const root = document.createElement('div')
  root.className = 'lumina-transfer'
  root.setAttribute('aria-hidden', 'true')
  root.setAttribute('data-phase', 'gather')
  root.setAttribute('data-mode', mode)
  root.style.left = `${origin.x + scrollX}px`
  root.style.top = `${origin.y + scrollY}px`
  root.style.width = `${Math.min(innerWidth - origin.x, source.box.right - origin.x + pad)}px`
  root.style.height = `${Math.min(innerHeight - origin.y, source.box.bottom - origin.y + pad)}px`
  if (mode === 'flow') { root.style.position = 'fixed'; root.style.setProperty('-webkit-app-region', 'no-drag') }
  const ink = document.createElement('div')
  ink.className = 'lumina-transfer-ink'
  root.append(ink)
  const sourceLayer = document.createElement('div')
  sourceLayer.className = 'lumina-transfer-layer'
  const targetLayer = document.createElement('div')
  targetLayer.className = 'lumina-transfer-layer'
  ink.append(sourceLayer, targetLayer)
  document.body.append(root)
  const placeFlow = () => {
    if (mode !== 'flow') return
    const box = { x: origin.x, y: origin.y,
      width: Math.min(innerWidth-origin.x, Math.max(source.box.right, stage.target?.box.right ?? 0)-origin.x+pad),
      height: Math.min(innerHeight-origin.y, Math.max(source.box.bottom, stage.target?.box.bottom ?? 0)-origin.y+pad) }
    if (!placeViewportOverlay(root, box)) return
    const scale = box.width / parseFloat(root.style.width)
    if (!Number.isFinite(scale) || scale <= 0) return
    // Glyph positions and SVG paths are viewport pixels. Cancel ancestor zoom
    // inside the calibrated box, then restore the host's font scale only.
    ink.style.zoom = String(1 / scale)
    for (const [nodes, glyphs] of [[stage.sourceNodes, source.glyphs], [stage.targetNodes, stage.copyGlyphs]] as const) {
      nodes.forEach((node, i) => {
        const font = glyphs[i]?.font.match(/([\d.]+)px/)
        if (font) node.style.fontSize = `${Number(font[1]) * scale}px`
        const spacing = parseFloat(glyphs[i]?.letterSpacing ?? '')
        if (Number.isFinite(spacing)) node.style.letterSpacing = `${spacing * scale}px`
      })
    }
  }
  card.setAttribute('data-lumina-transfer', id)

  const messageReveal=flowMessageReveal(id)
  let flowHost:HTMLElement|null=null
  const masked = new Set<HTMLElement>()
  const mask = (node: HTMLElement) => {
    if (!node.hasAttribute(MASK) || node.getAttribute(MASK) === id) {
      node.setAttribute(MASK, id)
      masked.add(node)
    }
  }
  if ((source.element.innerText ?? source.element.textContent ?? '') === source.text) mask(source.element)
  const releaseSource = () => {
    if (source.element.getAttribute(MASK) === id) source.element.removeAttribute(MASK)
    masked.delete(source.element)
  }
  // A new draft must never inherit the source mask of the sent draft.
  const observer = new MutationObserver(releaseSource)
  observer.observe(source.element, { childList: true, characterData: true, subtree: true })
  source.element.addEventListener('beforeinput', releaseSource)

  const sourceNodes = source.glyphs.map((glyph) => glyphNode(glyph, sourceLayer))
  const stage: TransferStage = {
    root,
    ink,
    sourceLayer,
    targetLayer,
    source,
    sourceNodes,
    targetNodes: [],
    copyGlyphs: [],
    target: null,
    arrival: null,
    hub,
    edge,
    origin,
    pad,
    // The dissolve needs room for two acts, the mist for its flight.
    duration: Math.round(durationMs(intensity, 'transfer') * (mode === 'flow' ? FLOW_TIME / TRANSFER_TIME : mode === 'dissolve' ? 1.25 : mode === 'ghost' ? 1.1 : 1)),
    intensity,
    mask,
  }
  if(mode==='flow')stage.revealTarget=progress=>{if(flowHost)messageReveal.update(flowHost,progress)}
  placeFlow()
  const renderer = rendererFor(mode)
  renderer.enter?.(stage)

  let landingStart = mode === 'flow' ? 80 / FLOW_TIME * TRANSFER_TIME : FLIGHT_START
  let frame = 0
  let disposed = false
  let lastFrame = 0
  let slowFrames = 0
  let degraded = false
  let targetMoved = false
  const started = performance.now()
  let handoff:ComposerHandoff|null=null
  if(firstLayout)handoff=composerHandoff(firstLayout,card,started,(dx,dy,next,final)=>{
    if(card!==next){
      if(card.getAttribute('data-lumina-transfer')===id)card.removeAttribute('data-lumina-transfer')
      card=next;card.setAttribute('data-lumina-transfer',id)
    }
    source.glyphs=baseGlyphs.map(g=>({...g,x:g.x+dx,y:g.y+dy}))
    hub.x=baseHub.x+dx;hub.y=baseHub.y+dy
    if(final){
      source.box={left:baseBox.left+dx,top:baseBox.top+dy,right:baseBox.right+dx,bottom:baseBox.bottom+dy}
      edge.x=Math.max(cardRect.left+corner+55,Math.min(cardRect.left+cardRect.width-corner-55,baseHub.x+42))+dx
      edge.y=cardRect.top+1+dy
      placeFlow()
    }
  })

  const cleanup = () => {
    if (disposed) return
    disposed = true
    cancelMotionFrame(frame)
    handoff?.dispose()
    messageReveal.dispose()
    observer.disconnect()
    source.element.removeEventListener('beforeinput', releaseSource)
    for (const node of masked) if (node.getAttribute(MASK) === id) node.removeAttribute(MASK)
    masked.clear()
    if (card.getAttribute('data-lumina-transfer') === id) card.removeAttribute('data-lumina-transfer')
    releaseScale()
    window.removeEventListener('resize', onGeometry)
    document.removeEventListener('visibilitychange', onHidden)
    window.removeEventListener('blur', onGeometry)
    renderer.dispose?.(stage)
    request.onSettled?.()
    root.remove()
    stage.targetNodes = []
    stage.sourceNodes.length = 0
    stage.copyGlyphs.length = 0
    source.glyphs.length = 0
  }
  const stop = (code: Parameters<typeof reportTransferStatus>[0] = 'canceled') => {
    if (!disposed) reportTransferStatus(code)
    cleanup()
    media.removeEventListener('change', onMotion)
    window.removeEventListener('scroll', onScroll, true)
  }
  const onGeometry = () => stop()
  const onHidden = () => { if (document.hidden) stop() }
  const releaseScale = mode === 'flow' ? watchViewportScale(onGeometry) : () => {}
  if (mode === 'flow') window.addEventListener('resize', onGeometry)
  document.addEventListener('visibilitychange', onHidden)
  window.addEventListener('blur', onGeometry)
  const onMotion = () => { if (media.matches) stop() }
  const onScroll = (event: Event) => {
    if(handoff?.waiting)return
    if (mode === 'flow' && isTransferScrollContainer(event.target, card, stage.target?.element)) {
      targetMoved = true
      return
    }
    if (event.target === document || (performance.now() - started - (handoff?.paused??0)) * TRANSFER_TIME / stage.duration >= landingStart) stop()
  }
  window.addEventListener('scroll', onScroll, true)
  media.addEventListener('change', onMotion)

  const draw = (now: number) => {
    try {
      if (disposed) return
      if (document.documentElement.dataset.lumina !== 'on' || media.matches) { stop(); return }
      handoff?.update(now)
      if(!card.isConnected){stop();return}
      if(handoff?.waiting){
        const pending=request.target()
        if(pending)mask(bubbleHost(pending))
        renderer.render(0,stage)
        stage.root.dataset.phase='layout-handoff'
        frame=requestMotionFrame(draw)
        return
      }
      // Frame budget guard: the liquid filter is the only expensive layer, so
      // it is dropped rather than letting the whole send animation stutter.
      if (lastFrame !== 0) {
        const cost = now - lastFrame
        if (cost > 38) slowFrames += 1
        else slowFrames = Math.max(0, slowFrames - 1)
        if (!degraded && slowFrames >= 3 && stage.root.querySelector('[data-liquid-filter]')) {
          degraded = true
          stage.root.querySelector('[data-liquid-filter]')?.setAttribute('filter', 'none')
          stage.root.setAttribute('data-lumina-transfer-quality', 'reduced')
          console.warn('[ratel-lumina] send transfer filter disabled: frame budget exceeded')
        }
      }
      lastFrame = now
      const t = (now - started - (handoff?.paused??0)) * TRANSFER_TIME / stage.duration

      const moved = targetMoved
      targetMoved = false
      if (!stage.target || !stage.target.element.isConnected || moved) {
        const element = request.target()
        const next = element ? mode === 'flow' ? snapshotSurface(element, paintedAncestor(element)) : snapshotGlyphs(element) : null
        if (next) {
          const nextCenter = mode==='flow'?flowLandingPoint(next.element,edge,next.box):center(next)
          if (!moved && stage.arrival && t >= landingStart && Math.hypot(nextCenter.x - stage.arrival.x, nextCenter.y - stage.arrival.y) > 8) { stop(); return }
          stage.target = next
          // Hide the whole message row first, background included, so the
          // bubble is gone before the animation reads as a send.
          const host=bubbleHost(next.element)
          mask(host)
          if(mode==='flow'){flowHost=host;messageReveal.update(host,0)}
          if (mode === 'flow' || stage.copyGlyphs.length === 0) {
            // Flow refreshes its landing only after scroll invalidation;
            // modes with target glyph copies keep their initial geometry.
            stage.arrival = nextCenter
            stage.copyGlyphs = next.glyphs
            for (const node of stage.targetNodes) node.remove()
            stage.targetNodes = mode==='flow'?[]:stage.copyGlyphs.map((glyph) => glyphNode(glyph, targetLayer))
            for (const node of stage.targetNodes) node.style.opacity = '0'
            stage.origin.x = Math.max(0, Math.min(source.box.left, next.box.left) - pad)
            stage.origin.y = Math.max(0, Math.min(source.box.top, edge.y, next.box.top) - pad)
            root.style.left = `${stage.origin.x + scrollX}px`
            root.style.top = `${stage.origin.y + scrollY}px`
            root.style.width = `${Math.min(innerWidth - stage.origin.x, Math.max(source.box.right, next.box.right) - stage.origin.x + pad)}px`
            root.style.height = `${Math.min(innerHeight - stage.origin.y, Math.max(source.box.bottom, next.box.bottom) - stage.origin.y + pad)}px`
            placeFlow()
          }
        } else if (stage.target && (moved || !stage.target.element.isConnected) && t >= landingStart) {
          stop(); return
        }
      }
      if (!stage.target && t > (mode === 'flow' ? 120 / FLOW_TIME * TRANSFER_TIME : 1000)) { request.fallback(); stop('timeout'); return }
      if (!stage.arrival && mode !== 'flow') landingStart = Math.max(FLIGHT_START, t + 120)
      if (renderer.render(t, stage) === true) { stop('done'); return }
      frame = requestMotionFrame(draw)
    } catch { stop('failed') }
  }
  reportTransferStatus('playing')
  frame = requestMotionFrame(draw)
  return () => stop()
}
