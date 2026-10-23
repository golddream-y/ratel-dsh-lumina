/** @vitest-environment jsdom */
import { act, StrictMode, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installTypeWave, insertedRange } from '../src/client/effects/type-wave.ts'
import { assemblyProgress, particleOffset, particleColor } from '../src/client/effects/hero-particles.ts'
import { prepareHeroEcho } from '../src/client/effects/hero-echo.ts'
import { heroHeadline, heroAccessories } from '../src/client/adapter/targets.ts'
import { installHero } from '../src/client/effects/hero.ts'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); document.body.innerHTML = '' })

function waveFixture() {
  vi.useFakeTimers()
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((fn) => window.setTimeout(() => fn(0), 16))
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => window.clearTimeout(id))
  const box = { left: 0, top: 0, right: 600, bottom: 100, width: 600, height: 100, x: 0, y: 0, toJSON() {} }
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(box)
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => ({ ...box, width: 16, height: 24, right: 16, bottom: 24 }) })
  document.body.innerHTML = '<div data-composer-input contenteditable="true">已有文字</div><div data-streaming>答</div>'
  const editor = document.body.firstElementChild as HTMLElement
  const dispose = installTypeWave()
  const input = (text: string) => {
    editor.dispatchEvent(new Event('beforeinput', { bubbles: true }))
    editor.textContent = text
    editor.dispatchEvent(new Event('input', { bubbles: true }))
    vi.advanceTimersByTime(20)
  }
  return { editor, input, dispose, lights: () => [...document.querySelectorAll('.lumina-wave')].map((e) => e.textContent) }
}

describe('client compose motion', () => {
  it('diffs middle replacements and complete graphemes', () => {
    expect(insertedRange('前后', '前👩‍💻后')).toEqual({ from: 1, to: 6 })
    expect(insertedRange('前字后', '前新后')).toEqual({ from: 1, to: 2 })
    expect(insertedRange('前字后', '前后')).toBeNull()
  })
  it('lights new glyphs, leaves drafts intact, and cleans up timers on disposal', () => {
    const f = waveFixture()
    f.input('已有👩‍💻文字')
    expect(f.lights()).toEqual(['👩‍💻'])
    expect(f.editor.textContent).toBe('已有👩‍💻文字')
    f.dispose()
    expect(f.lights()).toEqual([])
    expect(vi.getTimerCount()).toBe(0)
  })
  it('waits for IME commit and deduplicates the following input', () => {
    const f = waveFixture()
    f.editor.dispatchEvent(new Event('compositionstart', { bubbles: true }))
    f.input('已有文字拼')
    expect(f.lights()).toEqual([])
    f.editor.textContent = '已有文字平'
    f.editor.dispatchEvent(new Event('compositionend', { bubbles: true }))
    f.editor.dispatchEvent(new Event('input', { bubbles: true }))
    vi.advanceTimersByTime(20)
    expect(f.lights()).toEqual(['平'])
    f.dispose()
  })
  it('clears on scrolling and bounds long paste bursts', () => {
    const f = waveFixture()
    f.input('已有文字一二三四五六七八九十')
    expect(f.lights()).toHaveLength(8)
    document.dispatchEvent(new Event('scroll'))
    expect(f.lights()).toHaveLength(0)
    f.dispose()
  })
  it('gives only streaming text deltas a cool light', async () => {
    const f = waveFixture()
    document.querySelector('[data-streaming]')!.firstChild!.textContent = '答案'
    await Promise.resolve()
    vi.advanceTimersByTime(20)
    expect(f.lights()).toEqual(['案'])
    expect(document.querySelector('.lumina-wave')?.getAttribute('data-tone')).toBe('reply')
    f.dispose()
  })
  it('plays committed hero entrances across sessions and survives render retries', async () => {
    const mount = document.createElement('div')
    document.body.append(mount)
    let Component: any
    let key = 'motion-test-a'
    const subscribers = new Set<() => void>()
    const dispose = installHero({
      slots: { register: (_options, component) => { Component = component; return () => {} }, inject: () => () => {} },
      uiSession: { current: { getSnapshot: () => ({ key }), subscribe: (fn) => { subscribers.add(fn); return () => { subscribers.delete(fn) } } } },
    })
    const root = createRoot(mount)
    await act(async () => root.render(createElement(StrictMode, null, createElement(Component))))
    expect(mount.querySelector('[data-play="true"]')).not.toBeNull()
    await act(async () => root.render(createElement(StrictMode, null, createElement(Component))))
    expect(mount.querySelector('[data-play="true"]')).not.toBeNull()
    await act(async () => { key = 'motion-test-b'; subscribers.forEach((fn) => fn()) })
    expect(mount.querySelector('[data-play="true"]')).not.toBeNull()
    await act(async () => { key = 'motion-test-a'; subscribers.forEach((fn) => fn()) })
    expect(mount.querySelector('[data-play="true"]')).toBeNull()
    await act(async () => root.unmount())
    dispose()
    expect(subscribers.size).toBe(0)
  })
})

describe('particle and stroke boundaries', () => {
  it('converges without overshoot, drift or a spring tail', () => {
    for (const delay of [0, .1, .2]) {
      const samples = [-1, 0, .25, .5, .75, 1, 2].map(t => assemblyProgress(t, delay))
      expect(samples[0]).toBe(0)
      expect(samples.at(-1)).toBe(1)
      expect(samples.every((n, i) => n >= 0 && n <= 1 && (i === 0 || n >= samples[i - 1]!))).toBe(true)
    }
    expect(particleOffset(12)).toEqual(particleOffset(12))
    for (let i = 0; i < 3600; i++) {
      const p = particleOffset(i)
      expect(Math.abs(p.dx)).toBeLessThan(110)
      expect(Math.abs(p.dy)).toBeLessThan(72)
    }
  })
  it('only uses the verified title structure next to the mark', () => {
    document.body.innerHTML = '<div><span><i id="mark"></i></span><span><span>探索未至之境</span><span>预览版</span></span></div>'
    expect(heroHeadline(document.querySelector('#mark')!)?.textContent).toBe('探索未至之境')
    document.body.innerHTML = '<div><span><i id="mark"></i></span><button>不能当成标题</button></div>'
    expect(heroHeadline(document.querySelector('#mark')!)).toBeNull()
  })
})

it('finds the headline through the real display:contents SlotOutlet anchor', () => {
  document.body.innerHTML = '<div><span><div data-slot="conversation.hero.brand.mark" style="display:contents"><i id="mark"></i></div></span><span><span>探索未至之境</span><span>预览版</span></span></div>'
  expect(heroHeadline(document.querySelector('#mark')!)?.textContent).toBe('探索未至之境')
})

it('bounds the particle palette for batched fills', () => {
  const palette = new Set<string>()
  for (let value = 0; value < 256; value++) palette.add(particleColor(value, value, value))
  expect(palette.size).toBeLessThanOrEqual(5)
  expect(particleColor(255, 0, 0)).toBe('rgb(255,0,0)')
})

it('finds hero accessories through semantic outlets without capturing unrelated buttons', () => {
  document.body.innerHTML = '<section data-phase="hero"><div><span><div data-slot="conversation.hero.brand.mark"><i id="mark"></i></div></span><span><span>标题</span><span id="badge">预览版</span></span></div><button id="workspace">手册</button><div data-slot="conversation.hero.workspace"></div><div data-slot="conversation.hero.agentPreset"><button id="preset">创造模式</button></div><button id="unrelated">发送</button></section>'
  expect(heroAccessories(document.querySelector('#mark')!).map(e => e.id)).toEqual(['workspace', 'preset', 'badge'])
})

it('keeps the real control and cleans echo wait states and decorative text', () => {
  vi.useFakeTimers()
  const box = { left: 10, top: 10, width: 80, height: 24, right: 90, bottom: 34, x: 10, y: 10, toJSON() {} }
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(box)
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => box })
  const control = document.createElement('button')
  control.textContent = '手册'
  document.body.append(control)
  const click = vi.fn()
  control.addEventListener('click', click)
  const echo = prepareHeroEcho([control], 480)
  expect(control.dataset.luminaEcho).toBe('waiting')
  expect(control.children.length).toBe(0)
  echo.play()
  expect(control.dataset.luminaEcho).toBe('playing')
  expect(control.querySelectorAll('.lumina-echo-trail').length).toBe(2)
  expect(document.querySelectorAll('button').length).toBe(1)
  vi.advanceTimersByTime(600)
  expect(control.hasAttribute('data-lumina-echo')).toBe(false)
  expect(control.textContent).toBe('手册')
  control.click()
  expect(click).toHaveBeenCalledOnce()
  echo.dispose()
  expect(vi.getTimerCount()).toBe(0)
})

it('reveals waiting controls immediately when disposed before echo starts', () => {
  const box = { left: 0, top: 0, width: 80, height: 24, right: 80, bottom: 24, x: 0, y: 0, toJSON() {} }
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(box)
  const control = document.createElement('button')
  control.textContent = '创造模式'
  document.body.append(control)
  const echo = prepareHeroEcho([control], 480)
  echo.dispose()
  echo.play()
  expect(control.hasAttribute('data-lumina-echo')).toBe(false)
  expect(control.children.length).toBe(0)
})

it('keeps entrances alive through autofocus, same-session notifications and unrelated keys', async () => {
  vi.useFakeTimers()
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(fn => window.setTimeout(() => fn(0), 16))
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => window.clearTimeout(id))
  const box = { left: 0, top: 0, width: 80, height: 24, right: 80, bottom: 24, x: 0, y: 0, toJSON() {} }
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(box)
  document.body.innerHTML = '<section data-phase="hero"><div><span><div id="mount" data-slot="conversation.hero.brand.mark"></div></span><span><span>标题</span><span id="badge">预览版</span></span></div><button>手册</button><div data-slot="conversation.hero.workspace"></div><div data-composer-card><div data-composer-input contenteditable="true"></div></div></section><button id="outside">侧栏</button>'
  let Component: any
  let key = 'autofocus-regression-a'
  const listeners = new Set<() => void>()
  const dispose = installHero({ slots: { register: (_options, component) => { Component = component; return () => {} }, inject: () => () => {} }, uiSession: { current: { getSnapshot: () => ({ key }), subscribe: fn => { listeners.add(fn); return () => { listeners.delete(fn) } } } } })
  const root = createRoot(document.querySelector('#mount')!)
  await act(async () => root.render(createElement(Component)))
  vi.advanceTimersByTime(20)
  expect(document.querySelector('.lumina-hero-title-stroke')).not.toBeNull()
  expect(document.querySelector('#badge')?.getAttribute('data-lumina-echo')).toBe('waiting')
  const editor = document.querySelector('[contenteditable]') as HTMLElement
  editor.focus()
  await act(async () => listeners.forEach(fn => fn()))
  document.querySelector('#outside')!.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }))
  document.dispatchEvent(new Event('scroll'))
  expect(document.querySelector('.lumina-hero-title-stroke')).not.toBeNull()
  expect(document.querySelector('#badge')?.getAttribute('data-lumina-echo')).toBe('waiting')
  editor.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }))
  expect(document.querySelector('.lumina-hero-title-stroke')).toBeNull()
  expect(document.querySelector('[data-lumina-echo]')).toBeNull()
  await act(async () => { key = 'autofocus-regression-b'; listeners.forEach(fn => fn()) })
  vi.advanceTimersByTime(20)
  expect(document.querySelector('.lumina-hero-title-stroke')).not.toBeNull()
  await act(async () => { key = 'autofocus-regression-a'; listeners.forEach(fn => fn()) })
  expect(document.querySelector('.lumina-hero-title-stroke')).toBeNull()
  await act(async () => root.unmount())
  dispose()
  expect(vi.getTimerCount()).toBe(0)
})

it('holds asynchronously mounted preset controls until the echo barrier opens', async () => {
  vi.useFakeTimers()
  const box = { left: 0, top: 0, width: 80, height: 24, right: 80, bottom: 24, x: 0, y: 0, toJSON() {} }
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(box)
  Object.defineProperty(Range.prototype, 'getBoundingClientRect', { configurable: true, value: () => box })
  document.body.innerHTML = '<section data-phase="hero"><div data-slot="conversation.hero.agentPreset"></div></section>'
  const scope = document.querySelector('section')!
  const outlet = scope.firstElementChild!
  const echo = prepareHeroEcho([], 480, { root: scope, targets: () => [...outlet.querySelectorAll('button')] })
  expect(scope.getAttribute('data-lumina-echo-gate')).toBe('waiting')
  const control = document.createElement('button')
  control.textContent = '创造模式'
  outlet.append(control)
  await Promise.resolve()
  expect(control.dataset.luminaEcho).toBe('waiting')
  echo.play()
  expect(control.dataset.luminaEcho).toBe('playing')
  expect(scope.hasAttribute('data-lumina-echo-gate')).toBe(false)
  expect(control.querySelectorAll('.lumina-echo-trail')).toHaveLength(2)
  vi.advanceTimersByTime(600)
  expect(control.hasAttribute('data-lumina-echo')).toBe(false)
  echo.dispose()
})
