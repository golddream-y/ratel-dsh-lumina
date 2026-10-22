/**
 * The mist mode: a puff of red mist drifts from the composer edge to the
 * message and dissolves into the text.
 */

import { mix, smoother, smooth } from '../liquid-geometry.ts'
import { arcPoint } from './shared.ts'
import type { Point, TransferRenderer, TransferStage } from './types.ts'

/** The blob layout of one mist puff. */
const BLOBS = [
  { x: 14, y: 20, w: 34, h: 30, delay: '0s', duration: '2.6s' },
  { x: 30, y: 12, w: 28, h: 26, delay: '-.8s', duration: '3.1s' },
  { x: 8, y: 30, w: 26, h: 24, delay: '-1.4s', duration: '2.3s' },
  { x: 34, y: 30, w: 24, h: 22, delay: '-.4s', duration: '2.9s' },
  { x: 22, y: 26, w: 20, h: 20, delay: '-1.9s', duration: '2.1s' },
]

/** Build the mist mode renderer. */
export function createMistRenderer(): TransferRenderer {
  let puff: HTMLElement | null = null
  let sourceHidden = false
  let resolveStart: number | null = null

  const enter = (stage: TransferStage) => {
    const wrapper = document.createElement('div')
    wrapper.className = 'lumina-transfer-mist'
    for (const blob of BLOBS) {
      const node = document.createElement('span')
      node.className = 'lumina-transfer-mist-blob'
      node.style.left = `${blob.x}px`
      node.style.top = `${blob.y}px`
      node.style.width = `${blob.w}px`
      node.style.height = `${blob.h}px`
      node.style.animationDelay = blob.delay
      node.style.animationDuration = blob.duration
      wrapper.append(node)
    }
    stage.ink.append(wrapper)
    puff = wrapper
  }

  const render = (t: number, stage: TransferStage): boolean => {
    const { origin, edge } = stage
    // The source text is taken in by the mist.
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
    if (puff === null) return false

    const target: Point = stage.arrival ?? { x: edge.x, y: edge.y - 40 }
    const start: Point = { x: edge.x, y: edge.y - 6 }
    const via: Point = { x: (start.x + target.x) / 2, y: Math.min(start.y, target.y) - 58 }
    const appear = smoother((t - 90) / 190)
    const fly = smoother((t - 250) / 560)
    const disperse = smoother((t - 800) / 240)
    const point = t < 250 ? start : arcPoint(start, via, target, fly)
    const wobble = Math.sin((t - 250) / 160) * 5
    const stretch = Math.sin(fly * Math.PI) * 0.12
    const scale = (0.35 + 0.65 * appear) * (1 + 0.75 * disperse)
    puff.style.opacity = String(0.92 * appear * (1 - disperse))
    puff.style.transform = `translate(${point.x - origin.x - 32}px, ${point.y - origin.y - 32}px) rotate(${wobble}deg) scale(${scale * (1 + stretch)}, ${scale * (1 - stretch)})`

    if (stage.target === null) return false
    if (resolveStart === null) resolveStart = t
    const resolve = smooth((t - resolveStart - 40) / 380)
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
    return disperse >= 1 && resolve >= 1
  }

  const dispose = (stage: TransferStage) => {
    puff?.remove()
    puff = null
    stage.targetLayer.style.filter = ''
  }

  return { enter, render, dispose }
}
