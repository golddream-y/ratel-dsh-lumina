/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest'
import { createGhostRenderer } from '../src/client/effects/transfer/ghost.ts'
import { revealBlur, revealFade } from '../src/client/effects/transfer/reveal.ts'
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
  const renderer = createGhostRenderer(); renderer.enter?.(stage)
  return { stage, renderer }
}
afterEach(() => { document.body.innerHTML = '' })

describe('ghost pickup and handover', () => {
  it('keeps the message invisible until the ghost actually arrives', () => {
    const { renderer, stage } = fixture()
    renderer.render(0, stage); renderer.render(400, stage)
    expect(Number(stage.targetLayer.style.opacity)).toBe(0)
    renderer.render(840, stage)
    expect(Number(stage.targetLayer.style.opacity)).toBe(0)
    renderer.render(960, stage)
    expect(Number(stage.targetLayer.style.opacity)).toBeGreaterThan(0)
    expect(renderer.render(1100, stage)).toBe(true)
  })
  it('finishes all 240 glyphs in the pickup window without resurrection', () => {
    const { renderer, stage } = fixture(240)
    let previous = stage.sourceNodes.map(() => 1)
    for (const t of [0, 80, 160, 240, 260, 280, 300, 400, 700]) {
      renderer.render(t, stage)
      const opacity = stage.sourceNodes.map(n => Number(n.style.opacity))
      opacity.forEach((value, i) => expect(value).toBeLessThanOrEqual(previous[i]! + 1e-6))
      if (t >= 300) expect(Math.max(...opacity)).toBe(0)
      previous = opacity
    }
  })
  it('waits for a late destination before starting the route and reveal', () => {
    const { renderer, stage } = fixture()
    const target = stage.target, arrival = stage.arrival
    stage.target = null; stage.arrival = null
    renderer.render(0, stage); renderer.render(500, stage)
    stage.target = target; stage.arrival = arrival
    renderer.render(600, stage); renderer.render(900, stage)
    expect(Number(stage.targetLayer.style.opacity)).toBe(0)
  })
  it('puts every target glyph at rest and changes only whole-layer opacity', () => {
    const { stage } = fixture()
    revealFade(40, stage, 0, 240)
    const positions = stage.targetNodes.map(n => n.style.transform)
    revealFade(160, stage, 0, 240)
    expect(stage.targetNodes.map(n => n.style.transform)).toEqual(positions)
    stage.targetNodes.forEach((node, i) => {
      expect(node.style.opacity).toBe('1')
      expect(node.style.transform).toBe(`translate(${stage.copyGlyphs[i]!.x}px, ${stage.copyGlyphs[i]!.y}px)`)
    })
    expect(stage.targetLayer.style.filter).toBe('')
  })
  it('also makes the blur-mode glyphs visible inside their fading parent layer', () => {
    const { stage } = fixture()
    revealBlur(300, stage, 0, 560)
    expect(stage.targetNodes.every(n => n.style.opacity === '1')).toBe(true)
  })
  it('keeps the hood fixed while the cloak changes and the trail stays behind', () => {
    const { renderer, stage } = fixture()
    renderer.render(0, stage)
    const hood = stage.root.querySelector('[data-ghost-part="hood"]')!
    const cloak = stage.root.querySelector('[data-ghost-part="cloak"]')!
    expect(hood).not.toBeNull(); expect(cloak).not.toBeNull()
    const hoodPath = hood.getAttribute('d'), cloakPath = cloak.getAttribute('d')
    renderer.render(430, stage)
    expect(hood.getAttribute('d')).toBe(hoodPath)
    expect(cloak.getAttribute('d')).not.toBe(cloakPath)
    const sprite = stage.root.querySelector<SVGSVGElement>('.lumina-transfer-ghost')!
    expect(sprite.style.transform).toContain('rotate(10deg)')
    expect(stage.ink.lastElementChild).toBe(sprite)
    expect(Number(sprite.style.opacity)).toBeLessThan(1)
    renderer.dispose?.(stage)
    expect(stage.root.querySelector('.lumina-transfer-ghost')).toBeNull()
  })
})
