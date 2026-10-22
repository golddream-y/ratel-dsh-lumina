/**
 * The ghost mode: a small translucent red ghost rises from the composer edge,
 * floats straight to the message trailing a puff of mist, and dissolves into
 * the text.
 *
 * The silhouette is a classic little ghost: a soft dome, a scalloped hem, two
 * big eyes and a highlight. The flight is a plain eased drift — no wobble, no
 * squash and no bouncing curve.
 */

import { mix, smoother, smooth } from '../liquid-geometry.ts'
import { arcPoint } from './shared.ts'
import type { Point, TransferRenderer, TransferStage } from './types.ts'

/** The soft top highlight. */
const GHOST_HIGHLIGHT = 'M19 15 C23 11 29 9 34 10 C30 13 25 16 21 21 C20 19 19 17 19 15 Z'

/** The hem sample points, right to left, at the scallop tips and valleys. */
const HEM = [
  [51, 48], [46.5, 44.5], [42, 48], [37.5, 44.5], [33, 48],
  [28.5, 44.5], [24, 48], [19.5, 44.5], [16, 48], [13, 45.5],
] as const

/**
 * The wind-blown silhouette.
 *
 * The dome stays stable while the hem travels on a slow sine, so the body
 * ripples like cloth in a breeze instead of bouncing. The whole figure also
 * leans a hair with the gust.
 *
 * @param t - the normalized timeline position.
 * @returns the path data.
 */
function ghostPath(t: number): string {
  const phase = t * .012
  const lean = Math.sin(phase * .7) * 2.2
  const dome = `M 8 30 C 8 14 18 5 32 5 C 46 5 56 14 56 30 L 56 42`
  const hem = HEM.map(([x, y], index) => {
    const wave = Math.sin(phase + (index / (HEM.length - 1)) * Math.PI * 2.2)
    const lift = Math.cos(phase * 1.1 + index * .55) * 2.1
    const wx = x + wave * 3.2 + lean
    const wy = y + lift
    return `L ${wx.toFixed(2)} ${wy.toFixed(2)}`
  }).join(' ')
  return `${dome} ${hem} L 8 42 Z`
}

/** The blobs of the mist trail that follows the ghost. */
const TRAIL = [
  { x: 16, y: 22, w: 30, h: 26, delay: '0s', duration: '2.4s' },
  { x: 4, y: 28, w: 24, h: 22, delay: '-1.1s', duration: '3s' },
  { x: 28, y: 30, w: 22, h: 20, delay: '-1.8s', duration: '2.2s' },
]

/** Build the ghost mode renderer. */
export function createGhostRenderer(): TransferRenderer {
  let sprite: SVGSVGElement | null = null
  let bodyPath: SVGPathElement | null = null
  let trail: HTMLElement | null = null
  let sourceHidden = false
  let resolveStart: number | null = null

  const enter = (stage: TransferStage) => {
    const ns = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('class', 'lumina-transfer-ghost')
    svg.setAttribute('viewBox', '0 0 64 64')
    svg.setAttribute('width', '56')
    svg.setAttribute('height', '56')
    const defs = document.createElementNS(ns, 'defs')
    const gradient = document.createElementNS(ns, 'radialGradient')
    gradient.id = 'lumina-ghost-fill'
    gradient.setAttribute('cx', '36%')
    gradient.setAttribute('cy', '26%')
    const stops: Array<[string, string, string]> = [
      ['0%', '#ffe9e7', '.95'],
      ['38%', '#ff7a71', '.82'],
      ['100%', '#e3261c', '.62'],
    ]
    for (const [offset, color, opacity] of stops) {
      const stop = document.createElementNS(ns, 'stop')
      stop.setAttribute('offset', offset)
      stop.setAttribute('stop-color', color)
      stop.setAttribute('stop-opacity', opacity)
      gradient.append(stop)
    }
    defs.append(gradient)
    const body = document.createElementNS(ns, 'path')
    body.setAttribute('d', ghostPath(0))
    body.setAttribute('fill', 'url(#lumina-ghost-fill)')
    body.setAttribute('stroke', 'rgba(255, 235, 232, .5)')
    body.setAttribute('stroke-width', '1')
    const shine = document.createElementNS(ns, 'path')
    shine.setAttribute('d', GHOST_HIGHLIGHT)
    shine.setAttribute('fill', '#ffffff')
    shine.setAttribute('opacity', '.35')
    const eye = (cx: number) => {
      const node = document.createElementNS(ns, 'ellipse')
      node.setAttribute('cx', String(cx))
      node.setAttribute('cy', '27')
      node.setAttribute('rx', '3.2')
      node.setAttribute('ry', '4')
      node.setAttribute('fill', '#5c0d09')
      node.setAttribute('opacity', '.82')
      return node
    }
    const glint = (cx: number) => {
      const node = document.createElementNS(ns, 'circle')
      node.setAttribute('cx', String(cx))
      node.setAttribute('cy', '25.4')
      node.setAttribute('r', '1.05')
      node.setAttribute('fill', '#fff')
      node.setAttribute('opacity', '.9')
      return node
    }
    const blush = (cx: number) => {
      const node = document.createElementNS(ns, 'circle')
      node.setAttribute('cx', String(cx))
      node.setAttribute('cy', '35')
      node.setAttribute('r', '3.1')
      node.setAttribute('fill', '#fff')
      node.setAttribute('opacity', '.16')
      return node
    }
    svg.append(defs, body, shine, eye(24), eye(40), glint(23), glint(39), blush(17), blush(47))
    sprite = svg
    bodyPath = body

    const puff = document.createElement('div')
    puff.className = 'lumina-transfer-mist'
    for (const blob of TRAIL) {
      const node = document.createElement('span')
      node.className = 'lumina-transfer-mist-blob'
      node.style.left = `${blob.x}px`
      node.style.top = `${blob.y}px`
      node.style.width = `${blob.w}px`
      node.style.height = `${blob.h}px`
      node.style.animationDelay = blob.delay
      node.style.animationDuration = blob.duration
      puff.append(node)
    }
    // Trail first, ghost second: the mist must sit behind the silhouette.
    stage.ink.append(puff, svg)
    trail = puff
  }

  const render = (t: number, stage: TransferStage): boolean => {
    const { origin, edge } = stage
    // The source text is taken in by the ghost.
    for (let i = 0; i < stage.sourceNodes.length; i++) {
      const node = stage.sourceNodes[i]!
      const p = smooth((t - i * 4) / 220)
      node.style.opacity = String(1 - p)
      node.style.filter = `blur(${(p * 3).toFixed(2)}px)`
    }
    if (t >= 260 && !sourceHidden) {
      for (const node of stage.sourceNodes) node.style.opacity = '0'
      sourceHidden = true
    }
    if (sprite === null) return false
    bodyPath?.setAttribute('d', ghostPath(t))

    const target: Point = stage.arrival ?? { x: edge.x, y: edge.y - 40 }
    const start: Point = { x: edge.x, y: edge.y - 8 }
    // A slight bow, not a bounce: the ghost floats up and settles forward.
    const via: Point = { x: (start.x + target.x) / 2, y: Math.min(start.y, target.y) - 16 }
    const rise = smoother((t - 80) / 200)
    const fly = smoother((t - 200) / 620)
    const arrive = smoother((t - 820) / 220)
    const point = t < 200 ? start : arcPoint(start, via, target, fly)
    const scale = (0.55 + 0.45 * rise) * (1 - 0.2 * arrive)
    sprite.style.opacity = String(rise * (1 - arrive))
    sprite.style.transform = `translate(${point.x - origin.x - 28}px, ${point.y - origin.y - 28}px) scale(${scale})`
    sprite.style.filter = `drop-shadow(0 8px 14px rgba(232, 50, 42, ${(.32 * (1 - arrive)).toFixed(2)}))`
    if (trail !== null) {
      // The mist follows the same path, a little behind the ghost.
      const back = arcPoint(start, via, target, Math.max(0, fly - .14))
      trail.style.opacity = String((0.26 * rise) * (1 - arrive))
      trail.style.transform = `translate(${back.x - origin.x - 32}px, ${back.y - origin.y - 32}px) scale(${(0.5 + 0.3 * rise) * (1 + 0.25 * arrive)})`
    }

    if (stage.target === null) return false
    if (resolveStart === null) resolveStart = t
    const resolve = smooth((t - resolveStart - 60) / 380)
    stage.targetLayer.style.filter = `blur(${((1 - resolve) * 8).toFixed(2)}px)`
    for (let i = 0; i < stage.targetNodes.length; i++) {
      const node = stage.targetNodes[i]!
      const glyph = stage.copyGlyphs[i]!
      const p = smooth((resolve - (i % 6) * .05) / .95)
      const x = mix(target.x, glyph.x + glyph.width / 2, p)
      const y = mix(target.y, glyph.y + glyph.height / 2, p)
      node.style.opacity = String(p)
      node.style.transform = `translate(${x - origin.x - glyph.width / 2}px, ${y - origin.y - glyph.height / 2}px) scale(${1.06 - .06 * p})`
    }
    return arrive >= 1 && resolve >= 1
  }

  const dispose = (stage: TransferStage) => {
    sprite?.remove()
    sprite = null
    bodyPath = null
    trail?.remove()
    trail = null
    stage.targetLayer.style.filter = ''
  }

  return { enter, render, dispose }
}
