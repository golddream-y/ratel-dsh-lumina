/** @vitest-environment jsdom */
import { afterEach, expect, it, vi } from 'vitest'
import { installPress } from '../src/client/effects/press.ts'

let dispose: (() => void) | undefined
function fixture() {
  document.documentElement.dataset.lumina = 'on'
  document.body.innerHTML = '<div data-composer-card><div data-composer-input contenteditable="true"></div><button>menu</button><button>send</button></div>'
  document.querySelector('[data-composer-card]')!.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, right: 150, top: 0, bottom: 80, width: 150, height: 80, toJSON: () => ({}) })
  const buttons = document.querySelectorAll('button')
  buttons.forEach((button, index) => {
    button.getBoundingClientRect = () => ({ x: index * 50, y: 0, left: index * 50, right: index * 50 + 40, top: 0, bottom: 40, width: 40, height: 40, toJSON: () => ({}) })
  })
  let listener = (_active: boolean) => {}
  const unsubscribe = vi.fn()
  dispose = installPress({ subscribe: (fn) => { listener = fn; return unsubscribe }, dispose: () => {} }, 'normal')
  const ring = document.querySelector('.lumina-send-ripple')!
  const writes = vi.spyOn(ring, 'setAttribute')
  return { send: buttons[1]!, menu: buttons[0]!, start: () => listener(true), stop: () => listener(false), writes, unsubscribe }
}
afterEach(() => {
  dispose?.()
  dispose = undefined
  document.documentElement.removeAttribute('data-lumina')
  document.body.innerHTML = ''
  document.head.innerHTML = ''
})

it('acknowledges click once even when streaming starts after the ring finishes', () => {
  vi.useFakeTimers()
  const f = fixture()
  f.send.click()
  expect(f.writes).toHaveBeenCalledTimes(1)
  vi.advanceTimersByTime(6000)
  f.start()
  expect(f.writes).toHaveBeenCalledTimes(1)
  expect(document.querySelector('[data-lumina-sent]')).toBeNull()
  vi.useRealTimers()
})
it('acknowledges a keyboard send at stream start, then ignores the running stop control', () => {
  const f = fixture()
  f.start()
  expect(f.writes).toHaveBeenCalledTimes(1)
  f.send.click()
  f.start()
  expect(f.writes).toHaveBeenCalledTimes(1)
  f.stop()
  f.start()
  expect(f.writes).toHaveBeenCalledTimes(2)
})
it('does not pulse ordinary or disabled buttons and removes listeners on disposal', () => {
  const f = fixture()
  f.menu.click()
  f.send.disabled = true
  f.send.click()
  expect(f.writes).not.toHaveBeenCalled()
  dispose?.()
  expect(f.unsubscribe).toHaveBeenCalledTimes(1)
  expect(document.querySelector('.lumina-send-ripple')).toBeNull()
  f.send.disabled = false
  f.send.click()
  expect(f.writes).not.toHaveBeenCalled()
})
it('uses the next keyboard stream after a click that did not start a stream', () => {
  const f = fixture()
  f.send.click()
  document.querySelector('[data-composer-input]')!.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}))
  f.start()
  expect(f.writes).toHaveBeenCalledTimes(2)
})
