/**
 * A neckless, one-piece ghost carries the text up and right. Its face and
 * front stay fixed; only the soft lower hem catches the wind.
 */
import { mix, smoother } from '../liquid-geometry.ts'
import { revealFade } from './reveal.ts'
import type { Point, TransferRenderer, TransferStage } from './types.ts'

// One continuous upper contour: no chin pinch, collar seam or shoulder notch.
const CROWN = 'M43 5 C50 5 55 15 55 28 C55 37 56 49 52 58'
const FACE = 'M36 16 C41 12 48 15 50 21 C52 27 48 32 43 33 C37 34 33 30 33 25 C33 21 33 18 36 16 Z'
const HIGHLIGHT = 'M25 22 C29 13 35 8 42 8 C37 12 34 18 31 24 Q27 24 25 22 Z'
const FLIGHT_AT = 300
const FLIGHT_MS = 540
const LAND_MS = 240
let sequence = 0

/** Wind changes only the lower cloth, never the crown, face or front panel. */
function cloakPath(t: number): string {
  const wave = (phase: number) => Math.sin(t * .006 + phase)
  const a = wave(0), b = wave(1.5), c = wave(3), d = wave(4.5)
  return `${CROWN}
    C51 62 47 64 43 62
    C40 ${61 + a * .7} 41 ${64 + a} 35 ${64 + a}
    C30 ${64 + a} 29 ${62 + b * .6} 28 ${61 + b * .6}
    C26 ${59 + b} 25 ${63 + b} 21 ${62 + b}
    C16 ${62 + b} 14 ${59 + c} 13 ${57 + c}
    C12 ${55 + c} 10 ${59 + c} 8 ${57 + c}
    C4 ${55 + d} 4 ${52 + d} 5 ${51 + d}
    C7 ${48 + d} 2 ${49 + d} 1 ${51 + d}
    C-1 ${48 + d} 2 45 6 43
    C13 39 20 32 24 24
    C29 15 34 5 43 5 Z`
}

/** Broad cloth folds start well below the face, without outlining a neck. */
function foldsPath(t: number): string {
  const wave = Math.sin(t * .006)
  return `M26 38 C22 47 14 ${54 + wave} 6 ${51 + wave}
    C17 ${56 + wave} 23 47 26 38 Z
    M39 41 C34 51 30 ${60 - wave} 25 ${62 - wave}
    C34 ${60 - wave} 37 48 39 41 Z
    M48 47 C48 55 46 ${60 + wave} 43 62
    C49 ${62 + wave} 50 54 48 47 Z`
}

export function createGhostRenderer(): TransferRenderer {
  let sprite: SVGSVGElement | null = null
  let cloak: SVGPathElement | null = null
  let folds: SVGPathElement | null = null
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
    cloth.setAttribute('data-cloak-lobes', '4')
    cloth.setAttribute('stroke', 'color-mix(in srgb, var(--lumina-hi) 32%, transparent)')
    cloth.setAttribute('stroke-width', '.6')
    const drape = path('folds', foldsPath(0), 'var(--lumina-ghost-shade)', '.13')
    const face = path('face', FACE, 'var(--lumina-ghost-void)', '.66')
    const edge = path('hood-rim', 'M36 16 C41 12 48 15 50 21', 'none', '.4')
    edge.setAttribute('stroke', 'var(--lumina-hi)'); edge.setAttribute('stroke-width', '1')
    const tool = document.createElementNS(ns, 'g')
    tool.setAttribute('data-ghost-part', 'scythe')
    const handle = path('handle', 'M60 33 L50 59', 'none', '.62')
    handle.setAttribute('stroke', 'var(--lumina-ghost-shade)'); handle.setAttribute('stroke-width', '1.5'); handle.setAttribute('stroke-linecap', 'round')
    const blade = path('blade', 'M60 33 C65 24 60 17 51 19 C58 21 60 26 56 31 Z', 'var(--lumina-hi)', '.72')
    blade.setAttribute('stroke', 'var(--lumina-ghost-shade)'); blade.setAttribute('stroke-width', '.65')
    tool.append(handle, blade)
    const smile = path('smile', 'M38.5 29 Q41 31 43.5 28.5', 'none', '.65')
    smile.setAttribute('stroke', 'var(--lumina-hi)'); smile.setAttribute('stroke-width', '.85'); smile.setAttribute('stroke-linecap', 'round')
    // Keep the approved full cape width throughout pickup, flight and landing.
    // Widen the continuous cloth around its front edge without stretching the face.
    const body = document.createElementNS(ns, 'g')
    body.setAttribute('data-ghost-part', 'body')
    body.setAttribute('transform', 'translate(-6.6 0) scale(1.12 1)')
    body.append(cloth, drape, path('highlight', HIGHLIGHT, 'var(--lumina-hi)', '.28'))
    svg.append(body, face, edge, smile, tool)
    for (const [cx, cy, rx, ry, part] of [[36.5, 28.5, 2.4, 1.25, 'blush'], [47.5, 27.5, 1.6, 1, 'blush'], [53.5, 49.5, 2.5, 2, 'hand']] as const) {
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
    sprite = svg; cloak = cloth; folds = drape; trail = puff
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
    folds?.setAttribute('d', foldsPath(t))
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
    sprite = null; cloak = null; folds = null; trail = null
    stage.targetLayer.style.filter = ''
  }
  return { enter, render, dispose }
}
