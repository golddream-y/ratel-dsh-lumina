/** Finite glyph → liquid → message transition. Host content is never rewritten. */
import { installTransferBridge, type TransferBridge, type TransferRequest, type TransferServices } from '../adapter/send-transfer.ts'
import { snapshotGlyphs, type Glyph, type GlyphSnapshot } from '../adapter/glyphs.ts'
import { cssSelector } from '../adapter/selector.ts'
import { prefersReducedMotion } from '../core/motion.ts'
import { installStyle } from '../core/styles.ts'
import { reportTransferStatus, type TransferStatusCode } from '../core/transfer-status.ts'
import type { Intensity } from '../core/config.ts'
import { durationMs } from '../style/tokens.ts'
import { clamp, smooth, mix, liquidFrame, TRANSFER_TIME, FLIGHT_START } from './liquid-geometry.ts'

const MASK = 'data-lumina-transfer-mask'
let sequence = 0

export function transferCss(): string {
  return `
[data-lumina="on"] [${MASK}] { opacity: 0 !important; }
[data-lumina="off"] .lumina-transfer { display: none; }
[data-lumina="on"] .lumina-transfer {
  position: absolute; pointer-events: none; user-select: none; z-index: 2147483646;
  --lumina-water-tint: var(--dsw-alias-brand-primary-new-colorprimary-new-color, var(--lumina-brand-ratel));
  --lumina-water-light: color-mix(in srgb, var(--lumina-water-tint) 16%, var(--lumina-hi));
  --lumina-water-body: color-mix(in srgb, var(--lumina-water-tint) 42%, var(--lumina-hi));
  --lumina-water-depth: color-mix(in srgb, var(--lumina-water-tint) 76%, var(--lumina-hi));
  --lumina-water-line: color-mix(in srgb, var(--lumina-water-tint) 70%, transparent);
  contain: layout style; isolation: isolate; color: var(--lumina-water-depth);
}
[data-lumina="on"] .lumina-transfer * { pointer-events: none; }
[data-lumina="on"] .lumina-transfer-ink { position: absolute; inset: 0; }
[data-lumina="on"] .lumina-transfer-glyph {
  position: absolute; left: 0; top: 0; white-space: pre; transform-origin: center;
}
[data-lumina="on"] .lumina-transfer-liquid { position: absolute; inset: 0; overflow: visible; }
${cssSelector('composerCard')}[data-lumina-transfer]::before,
${cssSelector('composerCard')}[data-lumina-transfer]::after { animation-play-state: paused !important; }
@media (prefers-reduced-motion: reduce) {
  [data-lumina="on"] .lumina-transfer { display: none; }
  [data-lumina="on"] [${MASK}] { opacity: revert !important; }
}
`
}

function center(snapshot: GlyphSnapshot): { x: number; y: number } {
  const glyphs = snapshot.glyphs
  const left = Math.min(...glyphs.map((g) => g.x)), right = Math.max(...glyphs.map((g) => g.x + g.width))
  const top = Math.min(...glyphs.map((g) => g.y)), bottom = Math.max(...glyphs.map((g) => g.y + g.height))
  return { x: (left + right) / 2, y: (top + bottom) / 2 }
}

function glyphNode(glyph: Glyph, parent: HTMLElement): HTMLSpanElement {
  const span = document.createElement('span')
  span.className = 'lumina-transfer-glyph'
  span.textContent = glyph.text
  Object.assign(span.style, { font: glyph.font, color: glyph.color, letterSpacing: glyph.letterSpacing,
    width: `${glyph.width}px`, height: `${glyph.height}px`, lineHeight: `${glyph.height}px` })
  parent.append(span)
  return span
}

/** Returns a total cleanup even when the target disappears halfway through. */
export function animateTransfer(request: TransferRequest, duration = TRANSFER_TIME): (() => void) | null {
  if (prefersReducedMotion() || typeof window.matchMedia !== 'function') return null
  const media = matchMedia('(prefers-reduced-motion: reduce)')
  const source = request.source
  const hub = center(source)
  const card = source.element.closest(cssSelector('composerCard'))
  if (!(card instanceof HTMLElement)) return null
  const cardRect = card.getBoundingClientRect()
  const corner = Math.max(28, parseFloat(getComputedStyle(card).borderTopLeftRadius) || 28)
  const edge = { x: Math.max(cardRect.left + corner + 55, Math.min(cardRect.right - corner - 55, hub.x + 42)), y: cardRect.top + 1 }
  const surfaceHalf = Math.max(24, Math.min(96, edge.x - cardRect.left - corner, cardRect.right - corner - edge.x))
  const pad = 64
  const origin = { x: Math.max(0, Math.min(source.box.left, hub.x) - pad), y: Math.max(0, Math.min(source.box.top, edge.y) - pad) }
  // This region is clipped to the actual source/flight area after landing is known.
  const root = document.createElement('div')
  root.className = 'lumina-transfer'
  root.setAttribute('aria-hidden', 'true')
  root.setAttribute('data-phase', 'gather')
  root.style.left = `${origin.x + scrollX}px`
  root.style.top = `${origin.y + scrollY}px`
  root.style.width = `${Math.min(innerWidth - origin.x, source.box.right - origin.x + pad)}px`
  root.style.height = `${Math.min(innerHeight - origin.y, source.box.bottom - origin.y + pad)}px`
  const id = `lumina-goo-${++sequence}`
  const ink = document.createElement('div')
  ink.className = 'lumina-transfer-ink'
  root.append(ink)
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.classList.add('lumina-transfer-liquid')
  svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%')
  // Alpha fusion is confined to this temporary ink group, never the page.
  const defs = document.createElementNS(ns, 'defs')
  const filter = document.createElementNS(ns, 'filter')
  filter.id = id
  filter.setAttribute('x', '-12%'); filter.setAttribute('y', '-12%')
  filter.setAttribute('width', '124%'); filter.setAttribute('height', '124%')
  filter.setAttribute('color-interpolation-filters', 'sRGB')
  const blur = document.createElementNS(ns, 'feGaussianBlur')
  blur.setAttribute('stdDeviation', '0')
  const matrix = document.createElementNS(ns, 'feColorMatrix')
  matrix.setAttribute('type', 'matrix')
  matrix.setAttribute('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7')
  filter.append(blur, matrix)
  const gradient = document.createElementNS(ns, 'linearGradient')
  gradient.id = `${id}-liquid`
  gradient.setAttribute('x1', '0%'); gradient.setAttribute('y1', '0%')
  gradient.setAttribute('x2', '100%'); gradient.setAttribute('y2', '100%')
  for (const [offset, color] of [['0%', 'var(--lumina-water-light)'], ['55%', 'var(--lumina-water-body)'], ['100%', 'var(--lumina-water-depth)']]) {
    const stop = document.createElementNS(ns, 'stop')
    stop.setAttribute('offset', offset!); stop.style.stopColor = color!
    gradient.append(stop)
  }
  defs.append(filter, gradient); svg.append(defs)
  const neck = document.createElementNS(ns, 'path')
  const surface = document.createElementNS(ns, 'path')
  surface.setAttribute('data-liquid-part', 'surface')
  neck.setAttribute('data-liquid-part', 'neck')
  const drop = document.createElementNS(ns, 'path')
  drop.setAttribute('data-liquid-part', 'drop')
  // The goo filter is attached to the shape group, not to the viewport-sized
  // SVG: a filter region follows the filtered element's box, so the buffer
  // stays the size of the droplet instead of the whole screen.
  const liquid = document.createElementNS(ns, 'g')
  liquid.setAttribute('filter', `url(#${id})`)
  for (const shape of [surface, neck, drop]) { shape.setAttribute('fill', `url(#${id}-liquid)`); liquid.append(shape) }
  svg.append(liquid)
  ink.append(svg)
  const glass = document.createElementNS(ns, 'svg')
  glass.classList.add('lumina-transfer-liquid')
  glass.setAttribute('width', '100%'); glass.setAttribute('height', '100%')
  const surfaceLine = document.createElementNS(ns, 'path')
  const dropLine = document.createElementNS(ns, 'path')
  const glint = document.createElementNS(ns, 'path')
  for (const path of [surfaceLine, dropLine, glint]) {
    path.setAttribute('fill', 'none'); path.setAttribute('stroke-linecap', 'round')
    glass.append(path)
  }
  surfaceLine.setAttribute('stroke', 'var(--lumina-hi)'); surfaceLine.setAttribute('stroke-width', '1.4')
  dropLine.setAttribute('stroke', 'var(--lumina-water-line)'); dropLine.setAttribute('stroke-width', '.85')
  glint.setAttribute('stroke', 'var(--lumina-hi)'); glint.setAttribute('stroke-width', '1.8')
  root.append(glass)
  const sourceNodes = source.glyphs.map((g) => glyphNode(g, ink))
  document.body.append(root)
  card.setAttribute('data-lumina-transfer', id)
  const masked = new Set<HTMLElement>()
  const mask = (node: HTMLElement) => {
    if (!node.hasAttribute(MASK) || node.getAttribute(MASK) === id) { node.setAttribute(MASK, id); masked.add(node) }
  }
  if ((source.element.innerText ?? source.element.textContent ?? '') === source.text) mask(source.element)
  const releaseSource = () => {
    if (source.element.getAttribute(MASK) === id) source.element.removeAttribute(MASK)
    masked.delete(source.element)
  }
  // A new draft must never inherit a source mask from the sent draft.
  const observer = new MutationObserver(releaseSource)
  observer.observe(source.element, { childList: true, characterData: true, subtree: true })
  source.element.addEventListener('beforeinput', releaseSource)
  let target: GlyphSnapshot | null = null
  let targetNodes: HTMLSpanElement[] = []
  let targetDone: boolean[] = []
  let arrival: { x: number; y: number } | null = null
  let landingStart = FLIGHT_START
  let targetDirty = false
  let frame = 0, disposed = false
  let sourceHidden = false
  let lastBlur = -1
  let lastFrame = 0
  let slowFrames = 0
  let degraded = false
  const started = performance.now()
  const cleanup = () => {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frame); observer.disconnect()
    source.element.removeEventListener('beforeinput', releaseSource)
    for (const node of masked) if (node.getAttribute(MASK) === id) node.removeAttribute(MASK)
    masked.clear()
    if (card?.getAttribute('data-lumina-transfer') === id) card.removeAttribute('data-lumina-transfer')
    root.remove()
    targetNodes = []; sourceNodes.length = 0; source.glyphs.length = 0
  }
  const onMotion = () => { if (media.matches) stop() }
  media.addEventListener('change', onMotion)
  const stop = (code: TransferStatusCode = 'canceled') => {
    if (!disposed) reportTransferStatus(code)
    cleanup(); media.removeEventListener('change', onMotion)
    window.removeEventListener('scroll', onScroll, true)
  }
  const onScroll = (event: Event) => {
    if (event.target === document || (performance.now() - started) * TRANSFER_TIME / duration >= landingStart) stop()
    else targetDirty = true
  }
  window.addEventListener('scroll', onScroll, true)
  const local = (x: number, y: number) => `${x - origin.x} ${y - origin.y}`
  const draw = (now: number) => {
    try {
      if (disposed) return
      if (document.documentElement.dataset.lumina !== 'on' || media.matches || !card?.isConnected) { stop(); return }
      // Frame budget guard: the liquid filter is the only expensive layer, so
      // it is dropped rather than letting the whole send animation stutter.
      if (lastFrame !== 0) {
        const cost = now - lastFrame
        if (cost > 38) slowFrames += 1
        else slowFrames = Math.max(0, slowFrames - 1)
        if (!degraded && slowFrames >= 3) {
          degraded = true
          liquid.setAttribute('filter', 'none')
          root.setAttribute('data-lumina-transfer-quality', 'reduced')
          console.warn('[ratel-lumina] send transfer filter disabled: frame budget exceeded')
        }
      }
      lastFrame = now
      const t = (now - started) * TRANSFER_TIME / duration
      // DOM lookup has no text observation; glyph geometry is measured once per mount.
      if (!target || !target.element.isConnected || targetDirty) {
        const element = request.target()
        const next = element ? snapshotGlyphs(element) : null
        if (!next && target && !target.element.isConnected) {
          if (t >= landingStart) { stop(); return }
          target = null; arrival = null
          for (const node of targetNodes) node.remove()
          targetNodes = []
        }
        if (next) {
          const nextCenter = center(next)
          if (arrival && t >= landingStart && Math.hypot(nextCenter.x - arrival.x, nextCenter.y - arrival.y) > 8) { stop(); return }
          for (const node of targetNodes) node.remove()
          target = next; arrival = nextCenter; targetDirty = false; mask(next.element)
          targetNodes = next.glyphs.map((g) => glyphNode(g, ink))
          targetDone = new Array(next.glyphs.length).fill(false)
          for (const node of targetNodes) node.style.opacity = '0'
          origin.x = Math.max(0, Math.min(source.box.left, next.box.left) - pad)
          origin.y = Math.max(0, Math.min(source.box.top, edge.y, next.box.top) - pad)
          root.style.left = `${origin.x + scrollX}px`
          root.style.top = `${origin.y + scrollY}px`
          root.style.width = `${Math.min(innerWidth - origin.x, Math.max(source.box.right, next.box.right) - origin.x + pad)}px`
          root.style.height = `${Math.min(innerHeight - origin.y, Math.max(source.box.bottom, next.box.bottom) - origin.y + pad)}px`
        }
      }
      if (!target && t > 1000) { request.fallback(); stop('timeout'); return }
      if (!arrival) landingStart = Math.max(FLIGHT_START, t + 120)
      const state = liquidFrame(t, hub, edge, arrival ?? edge, landingStart)
      const { flight, unfold, absorb, emerge, radius, x: dx, y: dy } = state
      const gather = clamp(t / 240)
      root.setAttribute('data-phase', state.phase)
      root.setAttribute('data-liquid-radius', radius.toFixed(3))
      root.setAttribute('data-liquid-connected', String(state.connected))
      root.setAttribute('data-liquid-edge', `${edge.x},${edge.y}`)
      ink.style.opacity = String(1 - .26 * smooth((t - 150) / 120) * (1 - smooth(unfold)))
      for (let i = 0; i < sourceNodes.length && t < 250; i++) {
        const g = source.glyphs[i]!, node = sourceNodes[i]!
        const p = smooth((gather - (i % 7) * .014) / .916)
        const x = mix(g.x + g.width / 2, hub.x, p)
        const y = mix(g.y + g.height / 2, hub.y, p) - Math.sin(p * Math.PI) * (8 + (i % 3) * 5)
        const scale = Math.max(.001, (1 - p) * .66 + .34 * (1 - smooth((t - 180) / 100)))
        node.style.transform = `translate(${x - origin.x - g.width / 2}px, ${y - origin.y - g.height / 2}px) scale(${scale}) rotate(${Math.sin(p * Math.PI) * ((i % 2) ? 10 : -10)}deg)`
        node.style.color = `color-mix(in srgb, ${g.color} ${100 - smooth((t - 80) / 140) * 100}%, var(--lumina-water-depth))`
        node.style.opacity = '1'
      }
      if (t >= 250 && !sourceHidden) {
        // One write, then the source layer costs nothing for the rest of the run.
        for (const node of sourceNodes) node.style.opacity = '0'
        sourceHidden = true
      }
      const stretch = Math.sin(flight * Math.PI) * 6 + Math.sin(emerge * Math.PI) * 3
      const rx = radius * (1 + 1.2 * Math.sin(unfold * Math.PI))
      const ry = radius * (1 - .62 * Math.sin(unfold * Math.PI))
      const dropPath = radius > .01 ? `M ${local(dx, dy - ry - stretch)} C ${local(dx + rx * 1.2, dy - ry * .75)} ${local(dx + rx * 1.25, dy + ry)} ${local(dx, dy + ry)} C ${local(dx - rx * 1.25, dy + ry)} ${local(dx - rx * 1.2, dy - ry * .75)} ${local(dx, dy - ry - stretch)} Z` : ''
      drop.setAttribute('d', dropPath)
      dropLine.setAttribute('d', dropPath)
      dropLine.style.opacity = String((state.connected ? 0 : .7) * (1 - smooth((t - 950) / 150)))
      glint.setAttribute('d', radius > 2 ? `M ${local(dx - rx * .6, dy - ry * .1)} Q ${local(dx - rx * .63, dy - ry * .65)} ${local(dx - rx * .13, dy - ry * .72)}` : '')
      glint.style.opacity = String(.85 * smooth((t - 170) / 70) * (1 - unfold))
      const join = radius * .72
      const waist = state.neckWidth
      const half = state.baseWidth
      neck.setAttribute('d', state.connected
        ? `M ${local(edge.x - half, edge.y + 2)} C ${local(edge.x - waist, edge.y)} ${local(dx - waist, (edge.y + dy) / 2)} ${local(dx - join, dy)} L ${local(dx + join, dy)} C ${local(dx + waist, (edge.y + dy) / 2)} ${local(edge.x + waist, edge.y)} ${local(edge.x + half, edge.y + 2)} Z` : '')
      const line: string[] = []
      const underside: string[] = []
      const depth = 3.5 + 3.5 * absorb * (1 - emerge)
      for (let i = 0; i <= 12; i++) {
        const u = (i / 12 * 2 - 1) * surfaceHalf
        const envelope = Math.exp(-Math.pow(u / 31, 2))
        const wave = Math.sin(u * .12 - t * .025) * Math.exp(-Math.abs(u) / 65) * 2.3 * Math.sin(absorb * Math.PI)
        const taper = Math.max(0, 1 - Math.pow(u / surfaceHalf, 2))
        const profile = (wave + 3.5 * Math.sin(absorb * Math.PI) * envelope - state.crest * envelope) * taper
        underside.unshift(`L ${local(edge.x + u, edge.y + depth * Math.sqrt(taper))}`)
        line.push(`${i === 0 ? 'M' : 'L'} ${local(edge.x + u, edge.y + profile)}`)
      }
      const topLine = line.join(' ')
      surface.setAttribute('d', `${topLine} ${underside.join(' ')} Z`)
      surface.style.opacity = String(state.surfaceOpacity)
      surfaceLine.setAttribute('d', topLine)
      surfaceLine.style.opacity = String(.9 * state.surfaceOpacity)
      const blurAmount = t < 250 ? 2 * smooth((t - 150) / 100) : unfold > 0 ? 2 * (1 - smooth(unfold * 1.7)) : 2
      const quantizedBlur = Math.round(blurAmount * 4) / 4
      if (quantizedBlur !== lastBlur) {
        blur.setAttribute('stdDeviation', String(quantizedBlur))
        lastBlur = quantizedBlur
      }
      if (target && unfold > 0) {
        for (let i = 0; i < targetNodes.length; i++) {
          if (targetDone[i]) continue
          const g = target.glyphs[i]!, node = targetNodes[i]!
          const p = smooth((unfold - (i % 5) * .012) / .952)
          const x = mix(dx, g.x + g.width / 2, p), y = mix(dy, g.y + g.height / 2, p)
          node.style.opacity = '1'
          node.style.transform = `translate(${x - origin.x - g.width / 2}px, ${y - origin.y - g.height / 2}px) scale(${Math.max(.001, p)})`
          node.style.color = `color-mix(in srgb, var(--lumina-water-depth) ${100 - p * 100}%, ${g.color})`
          if (p >= 1) targetDone[i] = true
        }
      }
      if (t >= 710 && card.getAttribute('data-lumina-transfer') === id) card.removeAttribute('data-lumina-transfer')
      if (unfold >= 1) { stop('done'); return }
      frame = requestAnimationFrame(draw)
    } catch { stop('failed') }
  }
  reportTransferStatus('playing')
  frame = requestAnimationFrame(draw)
  return () => stop()
}

export function installSendTransfer(services: TransferServices, intensity: Intensity = 'normal'): TransferBridge {
  const disposeStyle = installStyle('sendTransfer', transferCss())
  let bridge: TransferBridge
  try { bridge = installTransferBridge(services, (request) => animateTransfer(request, durationMs(intensity, 'transfer'))) }
  catch { reportTransferStatus('failed'); disposeStyle(); return { ownsGesture: () => false, onFallback: () => () => {}, dispose() {} } }
  return { ownsGesture: bridge.ownsGesture, onFallback: bridge.onFallback, dispose: () => { bridge.dispose(); disposeStyle() } }
}
