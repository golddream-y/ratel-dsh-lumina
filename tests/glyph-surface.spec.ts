/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest'
import { snapshotSurface } from '../src/client/adapter/glyphs.ts'

const rect = (left: number, top: number, width: number, height: number) => ({
  x: left, y: top, left, top, width, height, right: left + width, bottom: top + height, toJSON() {},
})
afterEach(() => document.body.replaceChildren())

describe('visible flow landing surfaces', () => {
  it('keeps a partially clipped bubble without requiring complete visible glyphs', () => {
    const scroll = document.createElement('div'), bubble = document.createElement('div'), text = document.createElement('span')
    scroll.style.overflowY = 'auto'
    scroll.getBoundingClientRect = () => rect(20, 20, 400, 200)
    bubble.getBoundingClientRect = () => rect(100, 210, 200, 60)
    text.textContent = 'message'.repeat(100)
    bubble.append(text); scroll.append(bubble); document.body.append(scroll)
    const snapshot = snapshotSurface(text, bubble)
    expect(snapshot?.box).toEqual({ left: 100, top: 210, right: 300, bottom: 220 })
    expect(snapshot?.glyphs).toEqual([])
    expect(snapshot?.element).toBe(text)
    bubble.getBoundingClientRect = () => rect(100, 230, 200, 60)
    expect(snapshotSurface(text, bubble)).toBeNull()
  })

  it('does not clip to a display-contents wrapper with no layout box', () => {
    const wrapper = document.createElement('div'), bubble = document.createElement('div')
    wrapper.style.display = 'contents'; wrapper.style.overflow = 'hidden'
    wrapper.getBoundingClientRect = () => rect(0, 0, 0, 0)
    bubble.getBoundingClientRect = () => rect(40, 80, 200, 40)
    wrapper.append(bubble); document.body.append(wrapper)
    expect(snapshotSurface(bubble)?.box).toEqual({ left: 40, top: 80, right: 240, bottom: 120 })
  })
})
