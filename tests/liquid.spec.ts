/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest'
import { createLiquidRenderer } from '../src/client/effects/transfer/liquid.ts'
import type { TransferStage } from '../src/client/effects/transfer/types.ts'

function fixture(count = 8) {
  const root = document.createElement('div'), ink = document.createElement('div')
  const sourceLayer = document.createElement('div'), targetLayer = document.createElement('div')
  ink.append(sourceLayer, targetLayer); root.append(ink); document.body.append(root)
  const element = document.createElement('div')
  const glyphs = Array.from({ length: count }, (_, i) => ({ text: '字', x: 80 + (i % 30) * 12, y: 350 + Math.floor(i / 30) * 20, width: 12, height: 18, font: '14px sans-serif', color: 'black', letterSpacing: 'normal' }))
  const copyGlyphs = glyphs.map((g, i) => ({ ...g, x: 500 + (i % 30) * 12, y: 170 + Math.floor(i / 30) * 20 }))
  const sourceNodes = glyphs.map(() => { const n = document.createElement('span'); sourceLayer.append(n); return n })
  const targetNodes = copyGlyphs.map(() => { const n = document.createElement('span'); n.style.opacity = '0'; targetLayer.append(n); return n })
  const stage: TransferStage = { root, ink, sourceLayer, targetLayer, sourceNodes, targetNodes, copyGlyphs,
    source: { element, text: '字'.repeat(count), glyphs, box: { left: 80, top: 350, right: 450, bottom: 520 } },
    target: { element, text: '字'.repeat(count), glyphs: copyGlyphs, box: { left: 500, top: 170, right: 870, bottom: 340 } },
    arrival: { x: 650, y: 200 }, hub: { x: 150, y: 370 }, edge: { x: 192, y: 330 }, origin: { x: 0, y: 0 }, pad: 64, duration: 1265, intensity: 'normal', mask() {} }
  const renderer = createLiquidRenderer(); renderer.enter?.(stage)
  return { stage, renderer }
}
afterEach(() => { document.body.innerHTML = '' })

describe('liquid text stays a coherent block', () => {
  it('gathers a 240-glyph paragraph without per-glyph scatter, blur or rotation', () => {
    const { renderer, stage } = fixture(240)
    renderer.render(0, stage)
    const positions = stage.sourceNodes.map(node => node.style.transform)
    renderer.render(160, stage)
    expect(stage.sourceNodes.map(node => node.style.transform)).toEqual(positions)
    expect(stage.sourceNodes.every(node => node.style.opacity === '1')).toBe(true)
    expect(stage.sourceLayer.style.transform).toMatch(/^scale\(0\./)
    expect(stage.sourceLayer.style.filter).toBe('')
    expect(stage.targetLayer.style.opacity).toBe('0')
    renderer.render(280, stage)
    expect(stage.sourceNodes.every(node => node.style.opacity === '0')).toBe(true)
  })
  it('unfolds the entire message from the drop with no glyph staggering or blur', () => {
    const { renderer, stage } = fixture(240)
    renderer.render(840, stage)
    expect(stage.targetLayer.style.opacity).toBe('0')
    renderer.render(980, stage)
    const positions = stage.targetNodes.map(node => node.style.transform)
    const block = stage.targetLayer.style.transform
    expect(stage.targetNodes.every(node => node.style.opacity === '1')).toBe(true)
    renderer.render(1060, stage)
    expect(stage.targetNodes.map(node => node.style.transform)).toEqual(positions)
    expect(stage.targetLayer.style.transform).not.toBe(block)
    expect(stage.targetLayer.style.filter).toBe('')
    expect(stage.sourceNodes.every(node => node.style.filter === '' && node.style.color === '')).toBe(true)
    expect(renderer.render(1150, stage)).toBe(true)
    expect(stage.targetLayer.style.transform).toContain('scale(1)')
    renderer.dispose?.(stage)
    expect(stage.ink.querySelectorAll('svg')).toHaveLength(0)
  })
})
