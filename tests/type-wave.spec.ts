/**
 * @vitest-environment jsdom
 */

import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, parseConfig } from '../src/client/core/config.ts'
import { installTypeWave, newCharRange, typeWaveCss } from '../src/client/effects/type-wave.ts'

describe('character wave', () => {
  it('lights only the characters that were just added', () => {
    expect(newCharRange(3, 3)).toBeNull()
    expect(newCharRange(5, 3)).toBeNull()
    expect(newCharRange(0, 2)).toEqual({ from: 0, to: 2 })
    expect(newCharRange(6, 7)).toEqual({ from: 6, to: 7 })
  })

  it('caps one burst instead of lighting the whole tail', () => {
    const range = newCharRange(0, 40)
    expect(range).not.toBeNull()
    expect(range!.to - range!.from).toBeLessThanOrEqual(8)
    expect(range!.to).toBe(40)
  })

  it('draws the light above the text and never in the reduced-motion path', () => {
    const css = typeWaveCss()
    expect(css).toContain('position: fixed')
    expect(css).toContain('pointer-events: none')
    expect(css).not.toContain('filter: blur')
    expect(css).toContain('text-shadow')
    expect(css).toContain('prefers-reduced-motion')
    expect(css).toContain('display: none')
  })

  it('installs its stylesheet and removes it again', () => {
    const before = document.querySelectorAll('style[data-effect]').length
    const dispose = installTypeWave(document)
    expect(document.querySelectorAll('style[data-effect]').length).toBe(before + 1)
    dispose()
    expect(document.querySelectorAll('style[data-effect]').length).toBe(before)
  })

  it('never touches the text it lights', () => {
    const editor = document.createElement('div')
    editor.setAttribute('data-composer-input', '')
    editor.setAttribute('contenteditable', 'true')
    editor.textContent = '原有文字'
    document.body.append(editor)

    const dispose = installTypeWave(document)
    const original = editor.textContent
    // A synthetic input with unchanged text must not re-light anything.
    editor.dispatchEvent(new Event('input', { bubbles: true }))
    expect(editor.textContent).toBe(original)
    expect(editor.querySelectorAll('.lumina-wave').length).toBe(0)

    dispose()
    editor.remove()
  })

  it('defaults the switch on and keeps a stored value', () => {
    expect(DEFAULT_CONFIG.effects.typeWave).toBe(true)
    expect(parseConfig(null).effects.typeWave).toBe(true)
    expect(parseConfig(JSON.stringify({ version: 1, effects: { typeWave: false } })).effects.typeWave).toBe(false)
    expect(parseConfig(JSON.stringify({ version: 1, effects: { typeWave: 'nope' } })).effects.typeWave).toBe(true)
  })
})
