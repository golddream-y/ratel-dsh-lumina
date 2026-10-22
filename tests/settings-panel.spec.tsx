/**
 * @vitest-environment jsdom
 *
 * The settings page behaviour.
 *
 * The page is a staged form: edits land in a draft, the committed snapshot
 * stays untouched until the user saves, and "restore defaults" only changes
 * the draft. Asserting that separation is what keeps the page from silently
 * rewriting the user's settings on every click.
 */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LuminaPanel } from '../src/client/panel/LuminaPanel.tsx'
import { DEFAULT_CONFIG, type LuminaConfig } from '../src/client/core/config.ts'

/** The container the page renders into. */
let container: HTMLDivElement
/** The React root owning the container. */
let root: Root

/**
 * Render the panel with a controlled store.
 *
 * @param initial - the committed snapshot the page starts from.
 * @returns the save calls the page made.
 */
function render(initial: LuminaConfig): LuminaConfig[] {
  const saves: LuminaConfig[] = []
  const copy = (key: string) => key
  act(() => {
    root.render(
      <LuminaPanel
        useSettings={() => initial}
        save={(config) => {
          saves.push(config)
          return config
        }}
        t={copy}
      />,
    )
  })
  return saves
}

/**
 * Find a checkbox by the label text next to it.
 *
 * @param title - the row title.
 * @returns the checkbox element.
 */
function switchFor(title: string): HTMLInputElement {
  const row = [...container.querySelectorAll('label')].find((label) =>
    label.textContent?.includes(title),
  )
  const input = row?.querySelector('input[type="checkbox"]')
  if (!input) throw new Error(`no switch for ${title}`)
  return input as HTMLInputElement
}

/**
 * Click a button by its text.
 *
 * @param title - the button text.
 */
function clickButton(title: string): void {
  const button = [...container.querySelectorAll('button')].find((element) =>
    element.textContent?.trim().includes(title),
  )
  if (!button) throw new Error(`no button ${title}`)
  act(() => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

describe('settings panel', () => {
  beforeEach(() => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('renders the master switch, every effect row and the four send modes', () => {
    render(DEFAULT_CONFIG)
    // The send transition is a mode selector, not a switch, so it has no checkbox.
    expect(container.querySelectorAll('input[type="checkbox"]').length).toBe(7)
    expect(container.textContent).toContain('effectBrand')
    expect(container.textContent).toContain('effectHero')
    expect(container.textContent).toContain('effectSendTransfer')
    expect(container.textContent).toContain('effectSessionActivity')
    for (const mode of ['transferModeOff', 'transferModeLiquid', 'transferModeDissolve', 'transferModeMist']) {
      expect(container.textContent).toContain(mode)
    }
  })

  it('keeps an edit in the draft until the user saves', () => {
    const saves = render(DEFAULT_CONFIG)
    const master = switchFor('master')
    expect(master.checked).toBe(true)

    act(() => {
      master.click()
    })
    expect(master.checked).toBe(false)
    expect(saves.length).toBe(0)

    clickButton('save')
    expect(saves.length).toBe(1)
    expect(saves[0]?.master).toBe(false)
  })

  it('discards the draft on cancel', () => {
    const saves = render(DEFAULT_CONFIG)
    const master = switchFor('master')
    act(() => {
      master.click()
    })
    clickButton('cancel')
    expect(saves.length).toBe(0)
    expect(switchFor('master').checked).toBe(true)
  })

  it('restores the defaults into the draft without saving', () => {
    const saves = render({ ...DEFAULT_CONFIG, brand: 'deepseek', intensity: 'vivid' })
    clickButton('restoreDefaults')
    expect(saves.length).toBe(0)
    expect(switchFor('master').checked).toBe(DEFAULT_CONFIG.master)
  })

  it('switches the brand preset through the segmented control', () => {
    const saves = render(DEFAULT_CONFIG)
    const segments = [...container.querySelectorAll('.lumina-segment')]
    const ratel = segments.find((element) => element.textContent?.includes('brandRatel'))
    act(() => {
      ratel?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    clickButton('save')
    expect(saves[0]?.brand).toBe('ratel')
  })

  it('disables the effect switches while the master switch is off', () => {
    render(DEFAULT_CONFIG)
    const master = switchFor('master')
    act(() => {
      master.click()
    })
    expect(switchFor('effectBrand').disabled).toBe(true)
  })
})
