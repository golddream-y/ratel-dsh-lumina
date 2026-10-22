/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installTransferBridge, nodeForRequest, type ChatSnapshot, type ReadFace, type TransferRequest } from '../src/client/adapter/send-transfer.ts'
import { parseConfig } from '../src/client/core/config.ts'

vi.mock('../src/client/adapter/glyphs.ts', () => ({ snapshotGlyphs: (element: HTMLElement) => ({ element, text: element.textContent, glyphs: [{ text: 'same', x: 0, y: 0, width: 40, height: 20, font: '16px sans-serif', color: 'black', letterSpacing: 'normal' }], box: { left: 0, top: 0, right: 100, bottom: 80 } }) }))
function face<T>(initial: T) {
  let value = initial
  const listeners = new Set<() => void>()
  return { getSnapshot: () => value, subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn) } },
    set: (next: T) => { value = next; listeners.forEach((fn) => fn()) }, count: () => listeners.size }
}
const box = (left: number) => ({ x: left, y: 0, left, top: 0, right: left + 40, bottom: 40, width: 40, height: 40, toJSON() {} })
let dispose: (() => void) | undefined
function setup(options: { empty?: boolean; deferred?: boolean } = {}) {
  document.documentElement.dataset.lumina = 'on'
  document.body.innerHTML = '<div data-composer-card><div data-composer-input contenteditable="true">same</div><button>menu</button><button>send</button></div><div data-conversation-content data-conversation-region="chat" data-conversation-session="one"><div data-chat-node-key="first"><span>same</span></div><div data-chat-node-key="second"><span>same</span></div></div>'
  document.querySelectorAll('button').forEach((button, i) => { button.getBoundingClientRect = () => box(i * 50) })
  const editor = document.querySelector<HTMLElement>('[data-composer-input]')!
  editor.getBoundingClientRect = () => box(0)
  const current = face<{ key?: string }>({ key: options.empty ? undefined : 'one' })
  let bindingReady = !options.deferred
  const session = face({ pendingSubmissions: [] as { requestId: string; placement: string; text: string }[] })
  const nodes = new Map([['first', { data: { source: { kind: 'user', rpcId: 'r1' } } }], ['second', { data: { source: { kind: 'user', rpcId: 'r2' } } }]])
  const chat = face<ChatSnapshot | undefined>({ order: ['first', 'second'], nodes })
  const jobs: TransferRequest[] = [], stop = vi.fn()
  const bridge = installTransferBridge({ sessions: { binding: () => ({ session }) }, uiSession: { current }, uiConversation: { binding: () => { if (!bindingReady) throw new Error('binding not ready'); return { target: () => chat as ReadFace<ChatSnapshot | undefined> } } } }, (job) => { jobs.push(job); return stop })
  dispose = bridge.dispose
  return { current, session, chat, jobs, stop, bridge, editor, ready: () => { bindingReady = true; current.set({ key: 'one' }) }, send: document.querySelectorAll('button')[1]! }
}
afterEach(() => { dispose?.(); dispose = undefined; document.body.innerHTML = ''; vi.useRealTimers() })

describe('send transfer identity and lifecycle', () => {
  it('uses rpcId even for identical messages, never transcript position', () => {
    const f = setup()
    f.send.click(); f.session.set({ pendingSubmissions: [{ requestId: 'r2', placement: 'transcript', text: 'same' }] })
    expect(f.jobs).toHaveLength(1)
    expect(f.jobs[0]!.target()?.parentElement?.getAttribute('data-chat-node-key')).toBe('second')
    f.chat.set({ order: ['second', 'first'], nodes: f.chat.getSnapshot()!.nodes })
    expect(f.jobs[0]!.target()?.parentElement?.getAttribute('data-chat-node-key')).toBe('second')
    expect(nodeForRequest(f.chat.getSnapshot(), 'unknown')).toBeNull()
  })
  it('associates two identical batched admissions with their two captured gestures', () => {
    const f = setup()
    f.send.click(); f.send.click()
    f.session.set({ pendingSubmissions: [
      { requestId: 'r1', placement: 'transcript', text: 'same' },
      { requestId: 'r2', placement: 'transcript', text: 'same' },
    ] })
    expect(f.jobs.map((job) => job.requestId)).toEqual(['r1', 'r2'])
    expect(f.jobs[0]!.target()?.parentElement?.getAttribute('data-chat-node-key')).toBe('first')
    expect(f.jobs[1]!.target()?.parentElement?.getAttribute('data-chat-node-key')).toBe('second')
  })
  it('does not animate an Enter newline, composition, or an unconfirmed gesture', () => {
    const f = setup()
    f.editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }))
    f.session.set({ pendingSubmissions: [{ requestId: 'r1', placement: 'transcript', text: 'same' }] })
    expect(f.jobs).toHaveLength(0)
    f.editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }))
    expect(f.bridge.ownsGesture()).toBe(false)
    f.send.click()
    expect(f.jobs).toHaveLength(0)
  })
  it('expires snapshots and cancels jobs on session changes and unload', () => {
    vi.useFakeTimers()
    const f = setup()
    f.send.click(); vi.advanceTimersByTime(1600)
    f.session.set({ pendingSubmissions: [{ requestId: 'r1', placement: 'transcript', text: 'same' }] })
    expect(f.jobs).toHaveLength(0)
    f.send.click(); f.session.set({ pendingSubmissions: [{ requestId: 'r2', placement: 'transcript', text: 'same' }] })
    expect(f.jobs).toHaveLength(1)
    f.current.set({ key: 'two' })
    expect(f.stop).toHaveBeenCalledTimes(1)
    dispose!(); dispose = undefined
    expect(f.current.count()).toBe(0)
    expect(f.session.count()).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })
  it('resolves the current session only from uiSession.current, never from a session list', () => {
    const f = setup()
    // A list-shaped snapshot without a `current` field must not be mistaken
    // for the current Session; uiSession.current is the only public identity.
    f.send.click()
    f.session.set({ pendingSubmissions: [{ requestId: 'r1', placement: 'transcript', text: 'same' }] })
    expect(f.jobs.map((job) => job.requestId)).toEqual(['r1'])
  })
  it('lands on the text run, not on the message bubble', () => {
    const f = setup()
    document.querySelector('[data-chat-node-key="first"]')!.innerHTML = '<div class="bubble"><span>same</span></div>'
    f.chat.set({ order: ['first'], nodes: new Map([['first', { data: { source: { kind: 'user', rpcId: 'r1' } } }]]) })
    f.send.click()
    f.session.set({ pendingSubmissions: [{ requestId: 'r1', placement: 'transcript', text: 'same' }] })
    const target = f.jobs[0]!.target()!
    expect(target.tagName).toBe('SPAN')
    expect(target.closest('.bubble')).not.toBeNull()
  })
  it('uses the unique chat echo and ignores queue-dock echoes', () => {
    const f = setup()
    document.querySelector('[data-conversation-content]')!.insertAdjacentHTML('beforeend',
      '<div data-conversation-region="composer"><div data-submission-echo="">same</div></div><div data-submission-echo=""><span>same</span></div>')
    f.send.click()
    f.session.set({ pendingSubmissions: [{ requestId: 'r1', placement: 'transcript', text: 'same' }] })
    const target = f.jobs[0]!.target()!
    expect(target.closest('[data-conversation-region="composer"]')).toBeNull()
    expect(target.textContent).toBe('same')
  })
  it('hides the local echo before the submission is confirmed', async () => {
    const f = setup()
    f.send.click()
    // The host paints the local echo on the submit frame, before any pending
    // entry is confirmed. It must not be visible in the meantime.
    document.querySelector('[data-conversation-content]')!.insertAdjacentHTML('beforeend', '<div data-submission-echo=""><span>same</span></div>')
    await new Promise((resolve) => setTimeout(resolve, 0))
    const echo = document.querySelector('[data-submission-echo]')!
    expect(echo.hasAttribute('data-lumina-transfer-pending')).toBe(true)
  })
  it('never selects an ambiguous pending echo or an ambiguous rpcId', () => {
    const f = setup()
    f.chat.set({ order: [], nodes: new Map() })
    document.querySelector('[data-conversation-content]')!.insertAdjacentHTML('beforeend', '<div data-submission-echo><span>same</span></div><div data-submission-echo><span>same</span></div>')
    f.send.click(); f.session.set({ pendingSubmissions: [{ requestId: 'r2', placement: 'transcript', text: 'same' }] })
    expect(f.jobs[0]!.target()).toBeNull()
    const same = { data: { source: { kind: 'user', rpcId: 'r2' } } }
    expect(nodeForRequest({ order: ['a', 'b'], nodes: new Map([['a', same], ['b', same]]) }, 'r2')).toBeNull()
  })
  it('preserves the first-send snapshot while a new session is created', () => {
    const f = setup({ empty: true })
    f.send.click()
    f.session.set({ pendingSubmissions: [{ requestId: 'r1', placement: 'transcript', text: 'same' }] })
    expect(f.jobs).toHaveLength(0)
    f.current.set({ key: 'one' })
    expect(f.jobs.map((job) => job.requestId)).toEqual(['r1'])
  })
  it('recovers from a binding that throws during plugin installation', () => {
    const f = setup({ deferred: true })
    expect(f.current.count()).toBe(1)
    f.send.click()
    f.session.set({ pendingSubmissions: [{ requestId: 'r1', placement: 'transcript', text: 'same' }] })
    f.ready()
    expect(f.jobs.map((job) => job.requestId)).toEqual(['r1'])
  })
  it('retries late binding only while a capture is alive, then cleans timers', () => {
    vi.useFakeTimers()
    const f = setup({ deferred: true })
    f.send.click()
    vi.advanceTimersByTime(1600)
    f.session.set({ pendingSubmissions: [{ requestId: 'r1', placement: 'transcript', text: 'same' }] })
    f.ready()
    expect(f.jobs).toHaveLength(0)
    dispose!(); dispose = undefined
    expect(vi.getTimerCount()).toBe(0)
  })
  it('fills the new default without discarding existing switches', () => {
    expect(parseConfig(JSON.stringify({ version: 1, effects: { press: false } })).effects).toMatchObject({ press: false, sendTransition: 'liquid' })
    // The first release stored a boolean switch: true becomes the liquid mode.
    expect(parseConfig(JSON.stringify({ version: 1, effects: { sendTransfer: true } })).effects.sendTransition).toBe('liquid')
    expect(parseConfig(JSON.stringify({ version: 1, effects: { sendTransfer: false } })).effects.sendTransition).toBe('off')
    expect(parseConfig(JSON.stringify({ version: 1, effects: { sendTransition: 'ghost' } })).effects.sendTransition).toBe('ghost')
    expect(parseConfig(JSON.stringify({ version: 1, effects: { sendTransition: 'nope' } })).effects.sendTransition).toBe('liquid')
  })
})
