// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installSessionGalaxy } from '../src/client/effects/session-galaxy.ts'

const state = vi.hoisted(() => ({ drawable: true }))
vi.mock('../src/client/effects/session-cloud-painter.ts', () => ({
  createSessionCloudPainter: () => ({ draw: () => state.drawable, setPalette: vi.fn() }),
  recoverSessionCloudCache: vi.fn(), clearSessionCloudCache: vi.fn(), readSessionCloudPalette: () => ({}),
}))
vi.mock('../src/client/effects/session-galaxy-painter.ts', () => ({ createGalaxyPainter: () => vi.fn() }))
vi.mock('../src/client/core/frame-scheduler.ts', () => ({ requestMotionFrame: vi.fn(() => 1), cancelMotionFrame: vi.fn() }))
vi.mock('../src/client/core/motion.ts', () => ({ prefersReducedMotion: () => false, watchReducedMotion: () => vi.fn() }))

let dispose = () => {}
beforeEach(() => {
  state.drawable = true
  document.body.innerHTML = ''
  document.documentElement.dataset.lumina = 'on'
  vi.spyOn(document, 'hasFocus').mockReturnValue(true)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(250)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(40)
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const icon = this.tagName.toLowerCase() === 'svg'
    return { x: icon ? 12 : 0, y: icon ? 14 : 0, left: icon ? 12 : 0, top: icon ? 14 : 0,
      width: icon ? 12 : 250, height: icon ? 12 : 40, right: icon ? 24 : 250, bottom: icon ? 26 : 40, toJSON: () => ({}) }
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ clearRect: vi.fn(), setTransform: vi.fn() } as never)
  class Observer { observe() {} unobserve() {} disconnect() {} }
  vi.stubGlobal('ResizeObserver', Observer)
  vi.stubGlobal('IntersectionObserver', Observer)
})
afterEach(() => { dispose(); vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; delete document.documentElement.dataset.lumina })
const addRunningRow = () => {
  const row = document.createElement('div')
  row.dataset.rowKey = 'session:handover'
  row.setAttribute('role', 'treeitem')
  row.innerHTML = '<svg data-state="ongoing"></svg>'
  document.body.append(row)
  return row.querySelector('svg')!
}

describe('session first-frame handover', () => {
  it('adopts a newly inserted spinner during microtasks without waiting for any animation frame', async () => {
    dispose = installSessionGalaxy()
    const spinner = addRunningRow()
    for (let i = 0; i < 4; i++) await Promise.resolve()
    expect(spinner.hasAttribute('data-lumina-session-cloud-ready')).toBe(true)
    expect(document.querySelectorAll('.lumina-session-galaxy')).toHaveLength(1)
    dispose()
    expect(spinner.hasAttribute('data-lumina-session-cloud-ready')).toBe(false)
    dispose = () => {}
  })
  it('leaves the native indicator visible when the first cloud draw cannot succeed', async () => {
    state.drawable = false
    dispose = installSessionGalaxy()
    const spinner = addRunningRow()
    for (let i = 0; i < 4; i++) await Promise.resolve()
    expect(spinner.hasAttribute('data-lumina-session-cloud-ready')).toBe(false)
  })
})
