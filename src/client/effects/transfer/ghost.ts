/**
 * The ghost mode: a small translucent red ghost rises from the composer edge,
 * floats straight to the message trailing a puff of mist, and dissolves into
 * the text.
 *
 * The silhouette is a little ghost with a torn cloak: a stable dome and a
 * ragged hem whose tips flutter independently. The body floats on a steady
 * line; the restlessness lives in the cloth, not in the route.
 */

import { mix, smoother, smooth } from '../liquid-geometry.ts'
import { revealFade } from './reveal.ts'
import type { Point, TransferRenderer, TransferStage } from './types.ts'

/** The soft top highlight. */
const GHOST_HIGHLIGHT = 'M19 15 C23 11 29 9 34 10 C30 13 25 16 21 21 C20 19 19 17 19 15 Z'

/**
 * The ragged cloak hem, right to left. The tips have different lengths so the
 * edge reads as torn cloth rather than a regular scallop.
 */
const HEM = [
  [52, 49], [48.5, 43.5], [45, 52], [41, 45], [37, 53.5], [33, 44.5],
  [29, 52], [25, 46], [21, 54.5], [17, 45.5], [14, 50], [11.5, 46.5],
] as const

/**
 * One cloak point's wind flutter: two out-of-phase sines with a per-tip
 * amplitude, so neighbouring tips never move together.
 *
 * @param index - the hem index.
 * @param phase - the wind phase.
 * @param amplitude - the base amplitude.
 * @returns the offset.
 */
function flutter(index: number, phase: number, amplitude: number): number {
  const strength = .55 + .45 * Math.sin(index * 2.3)
  return (Math.sin(phase * 1.15 + index * 1.9) + Math.sin(phase * 2.35 + index * 3.1) * .45) * amplitude * strength
}

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
  const phase = t * .014
  // The body barely leans; the cloth is what moves.
  const lean = Math.sin(phase * .55) * 1.1
  const dome = `M 8 30 C 8 14 18 5 32 5 C 46 5 56 14 56 30`
  const right = `L 56 36 ${`L ${(55.2 + flutter(1, phase, 1.4)).toFixed(2)} ${(41 + flutter(2, phase, 1.6)).toFixed(2)}`}`
  const hem = HEM.map(([x, y], index) => {
    const wx = x + flutter(index, phase, 2.6) + lean
    const wy = y + flutter(index + 4, phase, 3.1)
    return `L ${wx.toFixed(2)} ${wy.toFixed(2)}`
  }).join(' ')
  const left = `L ${(8.8 + flutter(2, phase, 1.3)).toFixed(2)} ${(40.5 + flutter(1, phase, 1.5)).toFixed(2)} L 8 34 Z`
  return `${dome} ${right} ${hem} ${left}`
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
      ['0%', '#ffe9e7', '.8'],
      ['38%', '#ff7a71', '.62'],
      ['100%', '#e3261c', '.4'],
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
    body.setAttribute('stroke', 'rgba(255, 235, 232, .32)')
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
    // The source text is drawn towards the release point, without blur: the
    // ghost takes it in rather than dissolving it.
    const release: Point = { x: edge.x, y: edge.y - 8 }
    for (let i = 0; i < stage.sourceNodes.length; i++) {
      const node = stage.sourceNodes[i]!
      const glyph = stage.source.glyphs[i]!
      const p = smooth((t - i * 4) / 240)
      const x = mix(glyph.x + glyph.width / 2, release.x, p * .24)
      const y = mix(glyph.y + glyph.height / 2, release.y, p * .24)
      node.style.transform = `translate(${x - origin.x - glyph.width / 2}px, ${y - origin.y - glyph.height / 2}px) scale(${1 - .3 * p})`
      node.style.opacity = String(1 - p)
    }
    if (t >= 260 && !sourceHidden) {
      for (const node of stage.sourceNodes) node.style.opacity = '0'
      sourceHidden = true
    }
    if (sprite === null) return false
    bodyPath?.setAttribute('d', ghostPath(t))

    const target: Point = stage.arrival ?? { x: edge.x, y: edge.y - 40 }
    const start: Point = { x: edge.x, y: edge.y - 8 }
    const rise = smoother((t - 80) / 200)
    const fly = smoother((t - 200) / 640)
    const arrive = smoother((t - 840) / 240)
    // The ghost floats on a steady line; all of the restlessness lives in the
    // cloak. Only a barely visible bob keeps it from feeling mechanical.
    const point = {
      x: mix(start.x, target.x, fly),
      y: mix(start.y, target.y, fly) + Math.sin(fly * Math.PI * 2) * 1.6,
    }
    const scale = (0.55 + 0.45 * rise) * (1 - 0.18 * arrive)
    sprite.style.opacity = String((0.9 * rise) * (1 - arrive))
    sprite.style.transform = `translate(${point.x - origin.x - 28}px, ${point.y - origin.y - 28}px) scale(${scale})`
    sprite.style.filter = `drop-shadow(0 8px 14px rgba(232, 50, 42, ${(.24 * (1 - arrive)).toFixed(2)}))`
    if (trail !== null) {
      trail.style.opacity = String((0.22 * rise) * (1 - arrive))
      trail.style.transform = `translate(${mix(start.x, target.x, Math.max(0, fly - .12)) - origin.x - 32}px, ${mix(start.y, target.y, Math.max(0, fly - .12)) - origin.y - 32}px) scale(${(0.5 + 0.3 * rise) * (1 + 0.25 * arrive)})`
    }

    if (stage.target === null) return false
    if (resolveStart === null) resolveStart = t
    const resolve = revealFade(t, stage, resolveStart + 40, 260)
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
