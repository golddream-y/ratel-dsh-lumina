/** The liquid mode: gather, fuse, edge merge, detach, arc flight, unfold. */

import { cssSelector } from '../../adapter/selector.ts'
import { clamp, liquidFrame, smooth } from '../liquid-geometry.ts'
import type { TransferRenderer, TransferStage } from './types.ts'

let sequence = 0

interface LiquidNodes {
  svg: SVGElement
  group: SVGGElement
  surface: SVGPathElement
  neck: SVGPathElement
  drop: SVGPathElement
  surfaceLine: SVGPathElement
  dropLine: SVGPathElement
  glint: SVGPathElement
  blur: SVGFEGaussianBlurElement
  surfaceHalf: number
  sourceHidden: boolean
  lastBlur: number
}

/** Build the liquid mode renderer. */
export function createLiquidRenderer(): TransferRenderer {
  let nodes: LiquidNodes | null = null

  const enter = (stage: TransferStage) => {
    const ns = 'http://www.w3.org/2000/svg'
    const id = `lumina-goo-${++sequence}`
    const card = stage.source.element.closest(cssSelector('composerCard'))
    const cardRect = card?.getBoundingClientRect()
    const corner = card ? Math.max(28, parseFloat(getComputedStyle(card).borderTopLeftRadius) || 28) : 28
    const surfaceHalf = cardRect
      ? Math.max(24, Math.min(96, stage.edge.x - cardRect.left - corner, cardRect.right - corner - stage.edge.x))
      : 48

    const svg = document.createElementNS(ns, 'svg')
    svg.classList.add('lumina-transfer-liquid')
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '100%')
    const defs = document.createElementNS(ns, 'defs')
    const filter = document.createElementNS(ns, 'filter')
    filter.id = id
    filter.setAttribute('x', '-12%')
    filter.setAttribute('y', '-12%')
    filter.setAttribute('width', '124%')
    filter.setAttribute('height', '124%')
    filter.setAttribute('color-interpolation-filters', 'sRGB')
    const blur = document.createElementNS(ns, 'feGaussianBlur')
    blur.setAttribute('stdDeviation', '0')
    const matrix = document.createElementNS(ns, 'feColorMatrix')
    matrix.setAttribute('type', 'matrix')
    matrix.setAttribute('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7')
    filter.append(blur, matrix)
    const gradient = document.createElementNS(ns, 'linearGradient')
    gradient.id = `${id}-liquid`
    gradient.setAttribute('x1', '0%')
    gradient.setAttribute('y1', '0%')
    gradient.setAttribute('x2', '100%')
    gradient.setAttribute('y2', '100%')
    for (const [offset, color] of [
      ['0%', 'var(--lumina-water-light)'],
      ['55%', 'var(--lumina-water-body)'],
      ['100%', 'var(--lumina-water-depth)'],
    ]) {
      const stop = document.createElementNS(ns, 'stop')
      stop.setAttribute('offset', offset!)
      stop.style.stopColor = color!
      gradient.append(stop)
    }
    defs.append(filter, gradient)
    svg.append(defs)

    const surface = document.createElementNS(ns, 'path')
    const neck = document.createElementNS(ns, 'path')
    const drop = document.createElementNS(ns, 'path')
    surface.setAttribute('data-liquid-part', 'surface')
    neck.setAttribute('data-liquid-part', 'neck')
    drop.setAttribute('data-liquid-part', 'drop')
    // The goo filter stays on the shape group: a filter region follows the
    // filtered element's box, so the buffer is the droplet, not the screen.
    const group = document.createElementNS(ns, 'g')
    group.setAttribute('filter', `url(#${id})`)
    group.setAttribute('data-liquid-filter', '')
    for (const shape of [surface, neck, drop]) {
      shape.setAttribute('fill', `url(#${id}-liquid)`)
      group.append(shape)
    }
    svg.append(group)
    stage.ink.append(svg)

    const glass = document.createElementNS(ns, 'svg')
    glass.classList.add('lumina-transfer-liquid')
    glass.setAttribute('width', '100%')
    glass.setAttribute('height', '100%')
    const surfaceLine = document.createElementNS(ns, 'path')
    const dropLine = document.createElementNS(ns, 'path')
    const glint = document.createElementNS(ns, 'path')
    for (const path of [surfaceLine, dropLine, glint]) {
      path.setAttribute('fill', 'none')
      path.setAttribute('stroke-linecap', 'round')
      glass.append(path)
    }
    surfaceLine.setAttribute('stroke', 'var(--lumina-hi)')
    surfaceLine.setAttribute('stroke-width', '1.4')
    dropLine.setAttribute('stroke', 'var(--lumina-water-line)')
    dropLine.setAttribute('stroke-width', '.85')
    glint.setAttribute('stroke', 'var(--lumina-hi)')
    glint.setAttribute('stroke-width', '1.8')
    stage.ink.append(glass)

    // Text is a coherent block in liquid mode. Only the liquid shapes use goo.
    stage.sourceLayer.style.filter = ''
    stage.targetLayer.style.filter = ''
    stage.targetLayer.style.opacity = '0'
    nodes = {
      svg, group, surface, neck, drop, surfaceLine, dropLine, glint, blur,
      surfaceHalf, sourceHidden: false, lastBlur: -1,
    }
  }

  const render = (t: number, stage: TransferStage): boolean => {
    const n = nodes
    if (n === null) return false
    const { hub, edge, origin, arrival } = stage
    const local = (x: number, y: number) => `${x - origin.x} ${y - origin.y}`
    const state = liquidFrame(t, hub, edge, arrival ?? edge)
    const { flight, unfold, absorb, emerge, radius, x: dx, y: dy } = state
    const gather = clamp(t / 240)
    stage.root.setAttribute('data-phase', state.phase)
    stage.root.setAttribute('data-liquid-radius', radius.toFixed(3))
    stage.root.setAttribute('data-liquid-connected', String(state.connected))
    stage.root.setAttribute('data-liquid-edge', `${edge.x},${edge.y}`)
    stage.ink.style.opacity = '1'

    // Preserve layout within the paragraph while the entire copy folds into
    // the drop. Per-glyph scatter/rotation belongs to other modes.
    stage.sourceLayer.style.transformOrigin = `${hub.x - origin.x}px ${hub.y - origin.y}px`
    stage.sourceLayer.style.transform = `scale(${1 - smooth(gather)})`
    for (let i = 0; i < stage.sourceNodes.length && !n.sourceHidden; i++) {
      const g = stage.source.glyphs[i]!, node = stage.sourceNodes[i]!
      node.style.transform = `translate(${g.x - origin.x}px, ${g.y - origin.y}px)`
      node.style.opacity = '1'
    }
    if (t >= 250 && !n.sourceHidden) {
      for (const node of stage.sourceNodes) node.style.opacity = '0'
      n.sourceHidden = true
    }

    const stretch = Math.sin(flight * Math.PI) * 6 + Math.sin(emerge * Math.PI) * 3
    const rx = radius * (1 + 1.2 * Math.sin(unfold * Math.PI))
    const ry = radius * (1 - .62 * Math.sin(unfold * Math.PI))
    const dropPath = radius > .01
      ? `M ${local(dx, dy - ry - stretch)} C ${local(dx + rx * 1.2, dy - ry * .75)} ${local(dx + rx * 1.25, dy + ry)} ${local(dx, dy + ry)} C ${local(dx - rx * 1.25, dy + ry)} ${local(dx - rx * 1.2, dy - ry * .75)} ${local(dx, dy - ry - stretch)} Z`
      : ''
    n.drop.setAttribute('d', dropPath)
    n.dropLine.setAttribute('d', dropPath)
    n.dropLine.style.opacity = String((state.connected ? 0 : .7) * (1 - smooth((t - 950) / 150)))
    n.glint.setAttribute('d', radius > 2
      ? `M ${local(dx - rx * .6, dy - ry * .1)} Q ${local(dx - rx * .63, dy - ry * .65)} ${local(dx - rx * .13, dy - ry * .72)}`
      : '')
    n.glint.style.opacity = String(.85 * smooth((t - 170) / 70) * (1 - unfold))

    const join = radius * .72
    const waist = state.neckWidth
    const half = state.baseWidth
    n.neck.setAttribute('d', state.connected
      ? `M ${local(edge.x - half, edge.y + 2)} C ${local(edge.x - waist, edge.y)} ${local(dx - waist, (edge.y + dy) / 2)} ${local(dx - join, dy)} L ${local(dx + join, dy)} C ${local(dx + waist, (edge.y + dy) / 2)} ${local(edge.x + waist, edge.y)} ${local(edge.x + half, edge.y + 2)} Z`
      : '')

    const line: string[] = []
    const underside: string[] = []
    const depth = 3.5 + 3.5 * absorb * (1 - emerge)
    for (let i = 0; i <= 12; i++) {
      const u = (i / 12 * 2 - 1) * n.surfaceHalf
      const envelope = Math.exp(-Math.pow(u / 31, 2))
      const wave = Math.sin(u * .12 - t * .025) * Math.exp(-Math.abs(u) / 65) * 2.3 * Math.sin(absorb * Math.PI)
      const taper = Math.max(0, 1 - Math.pow(u / n.surfaceHalf, 2))
      const profile = (wave + 3.5 * Math.sin(absorb * Math.PI) * envelope - state.crest * envelope) * taper
      underside.unshift(`L ${local(edge.x + u, edge.y + depth * Math.sqrt(taper))}`)
      line.push(`${i === 0 ? 'M' : 'L'} ${local(edge.x + u, edge.y + profile)}`)
    }
    const topLine = line.join(' ')
    n.surface.setAttribute('d', `${topLine} ${underside.join(' ')} Z`)
    n.surface.style.opacity = String(state.surfaceOpacity)
    n.surfaceLine.setAttribute('d', topLine)
    n.surfaceLine.style.opacity = String(.9 * state.surfaceOpacity)

    const blurAmount = t < 250 ? 2 * smooth((t - 150) / 100) : unfold > 0 ? 2 * (1 - smooth(unfold * 1.7)) : 2
    const quantizedBlur = Math.round(blurAmount * 4) / 4
    if (quantizedBlur !== n.lastBlur) {
      n.blur.setAttribute('stdDeviation', String(quantizedBlur))
      n.lastBlur = quantizedBlur
    }

    if (stage.target && arrival && unfold > 0) {
      const p = smooth(unfold)
      stage.targetLayer.style.opacity = '1'
      stage.targetLayer.style.transformOrigin = `${arrival.x - origin.x}px ${arrival.y - origin.y}px`
      stage.targetLayer.style.transform = `translate(${dx - arrival.x}px, ${dy - arrival.y}px) scale(${p})`
      for (let i = 0; i < stage.targetNodes.length; i++) {
        const g = stage.copyGlyphs[i]!, node = stage.targetNodes[i]!
        node.style.opacity = '1'
        node.style.transform = `translate(${g.x - origin.x}px, ${g.y - origin.y}px)`
      }
    }
    const card = stage.source.element.closest(cssSelector('composerCard'))
    if (t >= 710 && card !== null && card.hasAttribute('data-lumina-transfer')) card.removeAttribute('data-lumina-transfer')
    return unfold >= 1
  }

  const dispose = (stage: TransferStage) => {
    nodes?.group.remove()
    nodes?.svg.remove()
    stage.ink.querySelectorAll('.lumina-transfer-liquid').forEach((node) => node.remove())
    nodes = null
  }

  return { enter, render, dispose }
}
