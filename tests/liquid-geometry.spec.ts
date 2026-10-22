import { describe, expect, it } from 'vitest'
import { liquidFrame } from '../src/client/effects/liquid-geometry.ts'
import { transferCss } from '../src/client/effects/send-transfer.ts'

const hub = { x: 140, y: 450 }, edge = { x: 180, y: 395 }, target = { x: 760, y: 150 }
const at = (time: number) => liquidFrame(time, hub, edge, target)

describe('water merges into the composer edge before detaching', () => {
  it('brings the first droplet into contact with the real edge', () => {
    const before = at(220), contact = at(340)
    expect(Math.abs(contact.y - edge.y)).toBeLessThan(5)
    expect(contact.y - contact.radius).toBeLessThan(edge.y)
    expect(contact.connected).toBe(true)
    expect(Math.abs(contact.x - edge.x)).toBeLessThan(Math.abs(before.x - edge.x))
  })
  it('has a genuine absorbed interval with no standalone droplet', () => {
    for (const time of [455, 475, 500]) {
      expect(at(time).radius).toBe(0)
      expect(at(time).connected).toBe(false)
      expect(at(time).surfaceOpacity).toBe(1)
      expect(at(time).phase).toBe('edge-rest')
    }
  })
  it('pulls the second droplet out of the same liquid edge before breaking the neck', () => {
    const emerging = at(600), stretching = at(680), detached = at(720)
    expect(emerging.x).toBe(edge.x)
    expect(emerging.y).toBeLessThan(edge.y)
    expect(emerging.connected).toBe(true)
    expect(stretching.connected).toBe(true)
    expect(stretching.neckWidth).toBeLessThan(emerging.neckWidth)
    expect(detached.connected).toBe(false)
    expect(detached.radius).toBeGreaterThan(10)
    expect(at(1160).radius).toBe(0)
    expect(at(1160).surfaceOpacity).toBe(0)
  })
  it('uses a separate cool water palette instead of red brand liquid', () => {
    const css = transferCss()
    expect(css).toContain('--lumina-water-tint: var(--dsw-alias-brand-primary')
    expect(css).not.toContain('color: var(--lumina-brand);')
    expect(css).toContain('prefers-reduced-motion')
  })
})
