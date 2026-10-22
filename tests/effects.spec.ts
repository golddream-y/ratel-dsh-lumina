import { describe, expect, it } from 'vitest'
import { composerCss } from '../src/client/effects/composer.ts'
import { heroCss } from '../src/client/effects/hero.ts'
import { pressCss } from '../src/client/effects/press.ts'
import { sessionCss } from '../src/client/effects/session.ts'

describe('effect stylesheets', () => {
  it('draws the composer glow as a masked conic ring', () => {
    const css = composerCss()
    expect(css).toContain('@property --lumina-angle')
    expect(css).toContain('conic-gradient')
    expect(css).toContain('mask-composite: exclude')
    expect(css).toContain('::before')
  })

  it('keeps press feedback and the send flash scoped to the composer', () => {
    const css = pressCss()
    expect(css).toContain(':active')
    expect(css).toContain('lumina-send-flash')
    expect(css).toContain('data-lumina-sent')
    expect(css).toContain('data-lumina-send-pulse')
    expect(css).toContain('lumina-send-button-flash')
    expect(css).toContain('scale: .88')
  })

  it('plays the hero entrance with a brand glow', () => {
    const css = heroCss()
    expect(css).toContain('lumina-hero-in')
    expect(css).toContain('lumina-hero-glow')
    expect(css).toContain('lumina-hero-mark')
  })

  it('recolors the official session spinner without changing its structure', () => {
    const css = sessionCss()
    expect(css).toContain('data-state="ongoing"')
    expect(css).toContain('lumina-session-pulse')
    expect(css).toContain('lumina-session-spin')
    expect(css).not.toContain('width:')
  })
})
