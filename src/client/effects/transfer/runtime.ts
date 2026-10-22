/**
 * Shared runtime for the send transition modes.
 *
 * The runtime owns everything that must behave identically in every mode:
 * the overlay, the glyph copies, the reversible takeover of the host text,
 * the landing resolution and the cleanup. A mode only draws.
 */

import type { TransferRequest } from '../../adapter/send-transfer.ts'
import { snapshotGlyphs } from '../../adapter/glyphs.ts'
import { cssSelector } from '../../adapter/selector.ts'
import { prefersReducedMotion } from '../../core/motion.ts'
import { reportTransferStatus } from '../../core/transfer-status.ts'
import type { Intensity } from '../../core/config.ts'
import { durationMs } from '../../style/tokens.ts'
import { bubbleHost, center, glyphNode } from './shared.ts'
import { FLIGHT_START, TRANSFER_TIME } from '../liquid-geometry.ts'
import type { Point, TransferMode, TransferStage } from './types.ts'
import { createLiquidRenderer } from './liquid.ts'
import { createDissolveRenderer } from './dissolve.ts'
import { createMistRenderer } from './mist.ts'

/** The attribute that hides host surfaces while a transition runs. */
export const MASK = 'data-lumina-transfer-mask'

let sequence = 0

/** Pick the renderer for a mode. */
function rendererFor(mode: TransferMode) {
  if (mode === 'mist') return createMistRenderer()
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
  const source = request.source
  const hub = center(source)
  const card = source.element.closest(cssSelector('composerCard'))
  if (!(card instanceof HTMLElement)) return null
  const cardRect = card.getBoundingClientRect()
  const corner = Math.max(28, parseFloat(getComputedStyle(card).borderTopLeftRadius) || 28)
  const edge: Point = {
    x: Math.max(cardRect.left + corner + 55, Math.min(cardRect.right - corner - 55, hub.x + 42)),
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
  const ink = document.createElement('div')
  ink.className = 'lumina-transfer-ink'
  root.append(ink)
  const sourceLayer = document.createElement('div')
  sourceLayer.className = 'lumina-transfer-layer'
  const targetLayer = document.createElement('div')
  targetLayer.className = 'lumina-transfer-layer'
  ink.append(sourceLayer, targetLayer)
  document.body.append(root)
  card.setAttribute('data-lumina-transfer', id)

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
    duration: Math.round(durationMs(intensity, 'transfer') * (mode === 'dissolve' ? 1.25 : mode === 'mist' ? 1.1 : 1)),
    intensity,
    mask,
  }
  const renderer = rendererFor(mode)
  renderer.enter?.(stage)

  let landingStart = FLIGHT_START
  let frame = 0
  let disposed = false
  let lastFrame = 0
  let slowFrames = 0
  let degraded = false
  const started = performance.now()

  const cleanup = () => {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frame)
    observer.disconnect()
    source.element.removeEventListener('beforeinput', releaseSource)
    for (const node of masked) if (node.getAttribute(MASK) === id) node.removeAttribute(MASK)
    masked.clear()
    if (card.getAttribute('data-lumina-transfer') === id) card.removeAttribute('data-lumina-transfer')
    renderer.dispose?.(stage)
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
  const onMotion = () => { if (media.matches) stop() }
  const onScroll = (event: Event) => {
    if (event.target === document || (performance.now() - started) * TRANSFER_TIME / stage.duration >= landingStart) stop()
  }
  window.addEventListener('scroll', onScroll, true)
  media.addEventListener('change', onMotion)

  const draw = (now: number) => {
    try {
      if (disposed) return
      if (document.documentElement.dataset.lumina !== 'on' || media.matches || !card.isConnected) { stop(); return }
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
      const t = (now - started) * TRANSFER_TIME / stage.duration

      if (!stage.target || !stage.target.element.isConnected) {
        const element = request.target()
        const next = element ? snapshotGlyphs(element) : null
        if (next) {
          const nextCenter = center(next)
          if (stage.arrival && t >= landingStart && Math.hypot(nextCenter.x - stage.arrival.x, nextCenter.y - stage.arrival.y) > 8) { stop(); return }
          stage.target = next
          // Hide the whole message row first, background included, so the
          // bubble is gone before the animation reads as a send.
          mask(bubbleHost(next.element))
          if (stage.copyGlyphs.length === 0) {
            // Freeze the destination and the copy geometry on the first hit.
            stage.arrival = nextCenter
            stage.copyGlyphs = next.glyphs
            for (const node of stage.targetNodes) node.remove()
            stage.targetNodes = stage.copyGlyphs.map((glyph) => glyphNode(glyph, targetLayer))
            for (const node of stage.targetNodes) node.style.opacity = '0'
            stage.origin.x = Math.max(0, Math.min(source.box.left, next.box.left) - pad)
            stage.origin.y = Math.max(0, Math.min(source.box.top, edge.y, next.box.top) - pad)
            root.style.left = `${stage.origin.x + scrollX}px`
            root.style.top = `${stage.origin.y + scrollY}px`
            root.style.width = `${Math.min(innerWidth - stage.origin.x, Math.max(source.box.right, next.box.right) - stage.origin.x + pad)}px`
            root.style.height = `${Math.min(innerHeight - stage.origin.y, Math.max(source.box.bottom, next.box.bottom) - stage.origin.y + pad)}px`
          }
        } else if (stage.target && !stage.target.element.isConnected && t >= landingStart) {
          stop(); return
        }
      }
      if (!stage.target && t > 1000) { request.fallback(); stop('timeout'); return }
      if (!stage.arrival) landingStart = Math.max(FLIGHT_START, t + 120)
      if (renderer.render(t, stage) === true) { stop('done'); return }
      frame = requestAnimationFrame(draw)
    } catch { stop('failed') }
  }
  reportTransferStatus('playing')
  frame = requestAnimationFrame(draw)
  return () => stop()
}
