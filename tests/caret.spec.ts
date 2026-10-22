/**
 * @vitest-environment jsdom
 *
 * The caret effect: streaming-tail styles plus the custom input overlay.
 *
 * The overlay is the risky half: it hides the native caret only while it can
 * position itself, and gives the native caret back on blur, range selection,
 * and IME composition.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { caretCss, createCaretOverlay, installCaret } from '../src/client/effects/caret.ts'

/**
 * Build a DOMRect-like value for jsdom.
 *
 * @param left - horizontal origin.
 * @param top - vertical origin.
 * @param width - width.
 * @param height - height.
 * @returns the rect.
 */
function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  } as DOMRect
}

/**
 * Build the composer fixture with non-zero boxes.
 *
 * @returns the card and input elements.
 */
function composerFixture(): { card: HTMLDivElement; input: HTMLDivElement } {
  const card = document.createElement('div')
  card.setAttribute('data-composer-card', '')
  card.style.position = 'relative'

  const input = document.createElement('div')
  input.setAttribute('data-composer-input', '')
  input.setAttribute('contenteditable', 'true')
  input.tabIndex = 0
  input.textContent = 'hello'
  card.append(input)
  document.body.append(card)

  card.getBoundingClientRect = () => rect(0, 0, 400, 80)
  input.getBoundingClientRect = () => rect(0, 0, 400, 40)
  return { card, input }
}

describe('caret effect', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    document.body.innerHTML = ''
    document.documentElement.removeAttribute('data-lumina')
    document.documentElement.removeAttribute('data-lumina-streaming')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.head.innerHTML = ''
    document.body.innerHTML = ''
  })

  it('styles the streaming tail and the reduced-motion fallback', () => {
    const css = caretCss()
    expect(css).toContain(
      '[data-lumina="on"] [data-streaming] > div > :is(p, h1, h2, h3, h4, h5, h6):last-child::after',
    )
    expect(css).toContain('animation: lumina-caret-breathe')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
    expect(css).toContain('[data-lumina-caret="overlay"]')
    expect(css).toContain('--dsw-alias-brand-primary-new-colorprimary-new-color')
    expect(css).toContain('position: fixed')
    expect(css).not.toContain('lumina-typing-ripple')
    expect(css).toContain('data-lumina-typing')
    expect(css).not.toContain(':root')
  })

  it('installs and removes its stylesheet', () => {
    const dispose = installCaret(document, window)
    const tag = document.querySelector('style[data-plugin="ratel-lumina"][data-effect="caret"]')
    expect(tag).not.toBeNull()
    expect(document.querySelector('.lumina-typing-ripple')).toBeNull()
    dispose()
    expect(document.querySelector('style[data-effect="caret"]')).toBeNull()
    expect(document.querySelector('.lumina-typing-ripple')).toBeNull()
  })

  it('shows the overlay for a focused collapsed selection and restores the native caret on blur', () => {
    const { input } = composerFixture()
    input.focus()

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    const range = document.createRange()
    const text = input.firstChild
    expect(text).not.toBeNull()
    range.setStart(text as Node, 2)
    range.collapse(true)
    Object.defineProperty(range, 'getBoundingClientRect', {
      value: () => rect(12, 10, 0, 18),
    })
    const selection = {
      rangeCount: 1,
      isCollapsed: true,
      getRangeAt: () => range,
    } as unknown as Selection
    vi.spyOn(window, 'getSelection').mockReturnValue(selection)

    const dispose = createCaretOverlay({
      document,
      window,
      getInput: () => input,
    })

    document.dispatchEvent(new Event('selectionchange'))

    const overlay = document.body.querySelector('.lumina-caret-overlay')
    expect(overlay).not.toBeNull()
    expect(input.getAttribute('data-lumina-caret')).toBe('overlay')
    expect((overlay as HTMLElement).style.transform).toContain('translate3d')

    document.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))

    expect(document.body.querySelector('.lumina-caret-overlay')).toBeNull()
    expect(input.hasAttribute('data-lumina-caret')).toBe(false)

    dispose()
  })

  it('does not show the overlay during IME composition', () => {
    const { input } = composerFixture()
    input.focus()
    input.setAttribute('data-composer-composing', '')

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })
    vi.spyOn(window, 'getSelection').mockReturnValue({
      rangeCount: 1,
      isCollapsed: true,
      getRangeAt: () => {
        throw new Error('should not be reached during composition')
      },
    } as unknown as Selection)

    const dispose = createCaretOverlay({
      document,
      window,
      getInput: () => input,
    })

    document.dispatchEvent(new Event('selectionchange'))

    expect(document.body.querySelector('.lumina-caret-overlay')).toBeNull()
    expect(input.hasAttribute('data-lumina-caret')).toBe(false)

    dispose()
  })
})
