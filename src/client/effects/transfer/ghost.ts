/**
 * The ghost mode: a small translucent red ghost rises from the composer edge,
 * flies to the message and dissolves into the text.
 */

import { mix, smooth } from '../liquid-geometry.ts'
import { arcPoint } from './shared.ts'
import type { Point, TransferRenderer, TransferStage } from './types.ts'

/** The ghost silhouette: round head, wavy hem, two soft eyes. */
const GHOST_PATH = 'M30 5 C16 5 7 15 7 28 C7 38 11 44 14 49 L17 42 L21 50 L25 42 L29 50 L33 42 L37 50 L41 42 L44 49 C47 44 53 38 53 28 C53 15 44 5 30 5 Z'

/** Build the ghost mode renderer. */
export function createGhostRenderer(): TransferRenderer {
  let sprite: SVGSVGElement | null = null
  let sourceHidden = false
  let resolveStart: number | null = null

  const enter = (stage: TransferStage) => {
    const ns = 'http://www.w3.org/2000/svg'
    const svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('class', 'lumina-transfer-ghost')
    svg.setAttribute('viewBox', '0 0 60 60')
    svg.setAttribute('width', '46')
    svg.setAttribute('height', '46')
    const defs = document.createElementNS(ns, 'defs')
    const gradient = document.createElementNS(ns, 'radialGradient')
    gradient.id = 'lumina-ghost-fill'
    gradient.setAttribute('cx', '35%')
    gradient.setAttribute('cy', '28%')
    const stops: Array<[string, string, string]> = [
      ['0%', '#ffffff', '.85'],
      ['45%', '#ff6b63', '.72'],
      ['100%', '#e8322a', '.5'],
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
    body.setAttribute('d', GHOST_PATH)
    body.setAttribute('fill', 'url(#lumina-ghost-fill)')
    const eyeLeft = document.createElementNS(ns, 'circle')
    eyeLeft.setAttribute('cx', '24'); eyeLeft.setAttribute('cy', '26'); eyeLeft.setAttribute('r', '2.6')
    eyeLeft.setAttribute('fill', '#7a0f0c'); eyeLeft.setAttribute('opacity', '.55')
    const eyeRight = document.createElementNS(ns, 'circle')
    eyeRight.setAttribute('cx', '36'); eyeRight.setAttribute('cy', '26'); eyeRight.setAttribute('r', '2.6')
    eyeRight.setAttribute('fill', '#7a0f0c'); eyeRight.setAttribute('opacity', '.55')
    svg.append(defs, body, eyeLeft, eyeRight)
    stage.ink.append(svg)
    sprite = svg
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

    const target: Point = stage.arrival ?? { x: edge.x, y: edge.y - 40 }
    const start: Point = { x: edge.x, y: edge.y - 4 }
    const via: Point = { x: (start.x + target.x) / 2, y: Math.min(start.y, target.y) - 64 }
    const rise = smooth((t - 80) / 160)
    const fly = smooth((t - 240) / 560)
    const point = t < 240 ? start : arcPoint(start, via, target, fly)
    const wobble = Math.sin((t - 240) / 120) * (t < 240 ? 0 : 6)
    const stretch = Math.sin(fly * Math.PI) * 0.16
    const arrive = smooth((t - 800) / 200)
    const scale = (0.4 + 0.6 * rise) * (1 - 0.55 * arrive)
    sprite.style.opacity = String((0.95 * rise) * (1 - arrive))
    sprite.style.transform = `translate(${point.x - origin.x - 23}px, ${point.y - origin.y - 23}px) rotate(${wobble}deg) scale(${scale * (1 + stretch)}, ${scale * (1 - stretch)})`
    sprite.style.filter = `drop-shadow(0 6px 12px rgba(232, 50, 42, ${(.35 * (1 - arrive)).toFixed(2)}))`

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
      node.style.transform = `translate(${x - origin.x - glyph.width / 2}px, ${y - origin.y - glyph.height / 2}px) scale(${1.08 - .08 * p})`
    }
    return arrive >= 1 && resolve >= 1
  }

  const dispose = (stage: TransferStage) => {
    sprite?.remove()
    sprite = null
    stage.targetLayer.style.filter = ''
  }

  return { enter, render, dispose }
}
