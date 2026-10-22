import { describe, expect, it } from 'vitest'
import { composerCss } from '../src/client/effects/composer.ts'
import { heroCss } from '../src/client/effects/hero.ts'
import { pressCss } from '../src/client/effects/press.ts'
import { sessionCss } from '../src/client/effects/session.ts'

describe('effect stylesheets', () => {
  it('keeps a static mixed rim and blends a broad wash on focus', () => {
    const css = composerCss()
    expect(css).toContain('background-size: 240% 100%, 100% 100%')
    expect(css).toContain('mask-composite: exclude')
    expect(css).not.toContain('offset-path')
    expect(css).toContain(':focus-within')
    expect(css).toContain('content: none')
    expect(css).toContain('::before')
  })

  it('keeps send feedback local and adds a scoped menu fade', () => {
    const css = pressCss()
    expect(css).toContain(':active')
    expect(css).not.toContain('lumina-send-flash')
    expect(css).toContain('[data-menu-material="translucent"]')
    expect(css).toContain('data-lumina-send-pulse')
    expect(css).toContain('lumina-send-button-flash')
    expect(css).toContain('lumina-send-ripple')
    expect(css).toContain('scale: .96')
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
