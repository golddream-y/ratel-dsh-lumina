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
import { revealFade } from './reveal.ts'
import type { Point, TransferRenderer, TransferStage } from './types.ts'

/**
 * A wind-blown position: the straight line from start to target plus two
 * out-of-phase lateral waves and a slow bob, so the route is irregular instead
 * of one clean arc.
 *
 * @param start - the release point.
 * @param target - the landing point.
 * @param fly - the eased flight progress.
 * @param phase - the slow wind phase.
 * @returns the point on the wandering route.
 */
function gust(start: Point, target: Point, fly: number, phase: number): Point {
  const base = { x: mix(start.x, target.x, fly), y: mix(start.y, target.y, fly) }
  const dx = target.x - start.x, dy = target.y - start.y
  const length = Math.hypot(dx, dy) || 1
  const nx = -dy / length, ny = dx / length
  const lateral = Math.sin(fly * Math.PI * 2.6 + phase) * 10 + Math.sin(fly * Math.PI * 4.7 + phase * 1.7) * 5
  const bob = Math.cos(fly * Math.PI * 1.9 + phase * .8) * 5
  return { x: base.x + nx * lateral, y: base.y + ny * lateral + bob }
}

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
    const phase = t * .0035
    const rise = smoother((t - 80) / 200)
    const fly = smoother((t - 200) / 640)
    const arrive = smoother((t - 840) / 240)
    const point = t < 200 ? start : gust(start, target, fly, phase)
    // The body leans into the direction it is being pushed.
    const ahead = gust(start, target, Math.min(1, fly + .04), phase)
    const tilt = Math.max(-14, Math.min(14, Math.atan2(ahead.y - point.y, ahead.x - point.x) * 180 / Math.PI))
    const scale = (0.55 + 0.45 * rise) * (1 - 0.18 * arrive)
    sprite.style.opacity = String((0.9 * rise) * (1 - arrive))
    sprite.style.transform = `translate(${point.x - origin.x - 28}px, ${point.y - origin.y - 28}px) rotate(${tilt.toFixed(2)}deg) scale(${scale})`
    sprite.style.filter = `drop-shadow(0 8px 14px rgba(232, 50, 42, ${(.24 * (1 - arrive)).toFixed(2)}))`
    if (trail !== null) {
      // The mist follows the same wandering route, a little behind.
      const back = gust(start, target, Math.max(0, fly - .15), phase - .4)
      trail.style.opacity = String((0.24 * rise) * (1 - arrive))
      trail.style.transform = `translate(${back.x - origin.x - 32}px, ${back.y - origin.y - 32}px) scale(${(0.5 + 0.3 * rise) * (1 + 0.25 * arrive)})`
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
