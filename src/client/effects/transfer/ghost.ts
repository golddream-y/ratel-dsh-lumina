/**
 * A three-quarter hooded ghost carries the text up and right. Its heading is
 * fixed; only the torn lower cloak catches the wind. No whole-body wobble.
 */
import { mix, smoother } from '../liquid-geometry.ts'
import { revealFade } from './reveal.ts'
import type { Point, TransferRenderer, TransferStage } from './types.ts'

const HOOD = 'M20 31 C18 24 22 13 33 7 C39 3 44 5 44 10 C48 13 51 18 52 24 C53 30 48 35 42 37 C32 39 24 36 20 31 Z'
const FACE = 'M33 18 C37 14 44 15 48 21 C51 26 47 32 42 33 C36 34 31 30 31 25 C31 22 31 20 33 18 Z'
const HIGHLIGHT = 'M23 23 C24 17 30 10 37 8 C32 13 29 17 27 25 Z'
const TEAR_LENGTHS = [2.5, 4.5, 2, 4, 3, 6, 3, 4.5, 2.5, 7, 3.5, 5]
const FLIGHT_AT = 300
const FLIGHT_MS = 540
const LAND_MS = 240
let sequence = 0

/** A travelling wind with a small independent flutter per cloth tip. */
function flutter(index: number, phase: number): number {
  const strength = .65 + .35 * Math.abs(Math.sin(index * 1.7))
  return strength * (Math.sin(phase * (1 + (index % 4) * .07) - index * .58)
    + .35 * Math.sin(phase * (1.6 + (index % 3) * .09) + index * 2.1))
}

/** Twelve curved, unequal tears behind the shoulder; the hood is separate. */
function cloakPath(t: number): string {
  const phase = t * .006
  const path = ['M22 28 C15 28 8 33 6 39 C4 43 3 46 2 49']
  // Draw left to right so every curled tip stays inside its own cloth strip.
  const width = 47 / TEAR_LENGTHS.length
  for (let i = 0; i < TEAR_LENGTHS.length; i++) {
    const x = 2 + i * width
    const y = 49 - 6 * i / (TEAR_LENGTHS.length - 1)
    const wind = flutter(i, phase)
    const tipX = x + width * .5 + Math.max(-.8, Math.min(.8, flutter(i + 3, phase) * .7))
    const tipY = y + TEAR_LENGTHS[TEAR_LENGTHS.length - 1 - i]! + wind * 2.2
    const curl = flutter(i + 2, phase) * .9
    path.push(`C ${(x + .3).toFixed(2)} ${(y + 4).toFixed(2)} ${(tipX + curl).toFixed(2)} ${(tipY - 2).toFixed(2)} ${tipX.toFixed(2)} ${tipY.toFixed(2)}`)
    path.push(`C ${(tipX - curl).toFixed(2)} ${(tipY - 1).toFixed(2)} ${(x + width - .4).toFixed(2)} ${(y + 3).toFixed(2)} ${(x + width).toFixed(2)} ${(y - .18).toFixed(2)}`)
  }
  path.push('C51 37 47 32 43 30 C36 26 27 25 22 28 Z')
  return path.join(' ')
}

export function createGhostRenderer(): TransferRenderer {
  let sprite: SVGSVGElement | null = null
  let cloak: SVGPathElement | null = null
  let trail: HTMLElement | null = null
  let flightStart: number | null = null
  let sourceDone = false

  const enter = (stage: TransferStage) => {
    const ns = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('class', 'lumina-transfer-ghost')
    svg.setAttribute('viewBox', '0 0 72 72')
    svg.setAttribute('width', '68'); svg.setAttribute('height', '68')
    Object.assign(svg.style, { position: 'absolute', left: '0', top: '0', overflow: 'visible', transformOrigin: '35.889px 21.72px', filter: 'drop-shadow(0 4px 7px color-mix(in srgb, var(--lumina-ghost-tint) 16%, transparent))' })
    const defs = document.createElementNS(ns, 'defs')
    const fill = document.createElementNS(ns, 'linearGradient')
    const id = `lumina-ghost-fill-${++sequence}`
    fill.id = id
    fill.setAttribute('x1', '90%'); fill.setAttribute('y1', '0%')
    fill.setAttribute('x2', '0%'); fill.setAttribute('y2', '100%')
    for (const [offset, color, opacity] of [
      ['0%', 'var(--lumina-ghost-soft)', '.8'],
      ['45%', 'var(--lumina-ghost-tint)', '.62'],
      ['100%', 'var(--lumina-ghost-shade)', '.4'],
    ]) {
      const stop = document.createElementNS(ns, 'stop')
      stop.setAttribute('offset', offset!); stop.setAttribute('stop-color', color!); stop.setAttribute('stop-opacity', opacity!)
      fill.append(stop)
    }
    defs.append(fill); svg.append(defs)
    const path = (part: string, d: string, color: string, opacity = '1') => {
      const node = document.createElementNS(ns, 'path')
      node.setAttribute('data-ghost-part', part); node.setAttribute('d', d)
      node.setAttribute('fill', color); node.setAttribute('opacity', opacity)
      return node
    }
    const cloth = path('cloak', cloakPath(0), `url(#${id})`)
    cloth.setAttribute('data-cloak-tips', '12')
    cloth.setAttribute('stroke', 'color-mix(in srgb, var(--lumina-hi) 32%, transparent)')
    cloth.setAttribute('stroke-width', '.6')
    const folds = path('folds', 'M19 40 Q16 44 15 48 M33 43 Q29 45 28 49', 'none', '.24')
    folds.setAttribute('stroke', 'var(--lumina-ghost-shade)'); folds.setAttribute('stroke-width', '.9')
    const hood = path('hood', HOOD, `url(#${id})`)
    const face = path('face', FACE, 'var(--lumina-ghost-void)', '.66')
    const edge = path('hood-rim', 'M32 18 C37 14 44 15 48 21', 'none', '.4')
    edge.setAttribute('stroke', 'var(--lumina-hi)'); edge.setAttribute('stroke-width', '1')
    const tool = document.createElementNS(ns, 'g')
    tool.setAttribute('data-ghost-part', 'scythe')
    const handle = path('handle', 'M60 33 L50 59', 'none', '.62')
    handle.setAttribute('stroke', 'var(--lumina-ghost-shade)'); handle.setAttribute('stroke-width', '1.5'); handle.setAttribute('stroke-linecap', 'round')
    const blade = path('blade', 'M60 33 C65 24 60 17 51 19 C58 21 60 26 56 31 Z', 'var(--lumina-hi)', '.72')
    blade.setAttribute('stroke', 'var(--lumina-ghost-shade)'); blade.setAttribute('stroke-width', '.65')
    tool.append(handle, blade)
    const collar = path('loose-collar', 'M17 31 C23 35 33 39 42 37 Q47 36 49 33 Q47 41 39 42 C29 42 21 38 17 34 Z', 'var(--lumina-ghost-soft)', '.22')
    const smile = path('smile', 'M38.5 29 Q41 31 43.5 28.5', 'none', '.65')
    smile.setAttribute('stroke', 'var(--lumina-hi)'); smile.setAttribute('stroke-width', '.85'); smile.setAttribute('stroke-linecap', 'round')
    svg.append(tool, cloth, folds, hood, collar, face, edge, path('highlight', HIGHLIGHT, 'var(--lumina-hi)', '.28'), smile)
    for (const [cx, cy, rx, ry, part] of [[34.5, 28.5, 2.4, 1.25, 'blush'], [47.5, 27.5, 1.6, 1, 'blush'], [53.5, 49.5, 2.5, 2, 'hand']] as const) {
      const detail = document.createElementNS(ns, 'ellipse')
      detail.setAttribute('data-ghost-part', part)
      detail.setAttribute('cx', String(cx)); detail.setAttribute('cy', String(cy))
      detail.setAttribute('rx', String(rx)); detail.setAttribute('ry', String(ry))
      detail.setAttribute('fill', 'var(--lumina-ghost-soft)'); detail.setAttribute('opacity', part === 'hand' ? '.7' : '.25')
      svg.append(detail)
    }
    for (const [cx, cy, rx, ry] of [[38, 23.5, 2.2, 2.7], [45.5, 23, 1.6, 2.2]]) {
      const eye = document.createElementNS(ns, 'ellipse')
      eye.setAttribute('cx', String(cx)); eye.setAttribute('cy', String(cy))
      eye.setAttribute('rx', String(rx)); eye.setAttribute('ry', String(ry))
      eye.setAttribute('fill', 'var(--lumina-hi)'); eye.setAttribute('opacity', '.88')
      svg.append(eye)
    }
    const puff = document.createElement('div')
    puff.className = 'lumina-transfer-mist'
    for (const [x, y, size, delay] of [[10, 23, 27, 0], [2, 31, 23, -1.1], [22, 33, 21, -1.8]]) {
      const blob = document.createElement('span')
      blob.className = 'lumina-transfer-mist-blob'
      Object.assign(blob.style, { left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${size}px`, animationDelay: `${delay}s` })
      puff.append(blob)
    }
    stage.ink.append(puff, svg)
    sprite = svg; cloak = cloth; trail = puff
    stage.targetLayer.style.opacity = '0'
  }

  const render = (t: number, stage: TransferStage): boolean => {
    if (!sprite) return false
    if (stage.arrival && flightStart === null) flightStart = Math.max(FLIGHT_AT, t)
    const rise = smoother(t / 160)
    const start: Point = { x: stage.hub.x, y: stage.edge.y + 2 - rise * 20 }
    const fly = flightStart === null ? 0 : smoother((t - flightStart) / FLIGHT_MS)
    const landingAt = flightStart === null ? Infinity : flightStart + FLIGHT_MS
    const arrive = smoother((t - landingAt) / LAND_MS)
    const target = stage.arrival ?? start
    const point = { x: mix(start.x, target.x, fly), y: mix(start.y, target.y, fly) + Math.sin(fly * Math.PI * 2) * 1.6 }
    stage.root.setAttribute('data-phase', t < FLIGHT_AT ? 'pickup' : flightStart === null ? 'waiting' : fly < 1 ? 'flight' : 'landing')

    if (!sourceDone) {
      const count = Math.max(1, stage.sourceNodes.length - 1)
      for (let i = 0; i < stage.sourceNodes.length; i++) {
        const node = stage.sourceNodes[i]!, glyph = stage.source.glyphs[i]!
        const p = smoother((t - (i / count) * 80) / 200)
        const x = mix(glyph.x + glyph.width / 2, point.x + 3, p)
        const y = mix(glyph.y + glyph.height / 2, point.y + 7, p) - Math.sin(p * Math.PI) * (5 + (i % 3) * 3)
        node.style.transform = `translate(${x - stage.origin.x - glyph.width / 2}px, ${y - stage.origin.y - glyph.height / 2}px) scale(${1 - .95 * p})`
        node.style.opacity = String(1 - smoother((p - .42) / .58))
      }
      // Every glyph has naturally finished its own curve, including 240 glyphs.
      sourceDone = t >= 280
    }
    cloak?.setAttribute('d', cloakPath(t))
    sprite.style.opacity = String(.9 * rise * (1 - arrive))
    sprite.style.transform = `translate(${point.x - stage.origin.x - 35.889}px, ${point.y - stage.origin.y - 21.72}px) rotate(6deg)`
    if (trail) {
      const lag = flightStart === null ? 0 : smoother((t - flightStart - 85) / FLIGHT_MS)
      trail.style.opacity = String(.2 * rise * (1 - arrive))
      trail.style.transform = `translate(${mix(start.x, target.x, lag) - stage.origin.x - 46}px, ${mix(start.y, target.y, lag) - stage.origin.y + 4}px) scale(.7)`
    }
    if (!stage.target) { stage.targetLayer.style.opacity = '0'; return false }
    const resolve = revealFade(t, stage, landingAt, LAND_MS)
    return arrive >= 1 && resolve >= 1
  }

  const dispose = (stage: TransferStage) => {
    sprite?.remove(); trail?.remove()
    sprite = null; cloak = null; trail = null
    stage.targetLayer.style.filter = ''
  }
  return { enter, render, dispose }
}
