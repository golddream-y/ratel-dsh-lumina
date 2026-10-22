/** Read-only public-service bridge. No submission methods or private stores. */
import { cssSelector, queryTarget } from './selector.ts'
import { compactText, conversationRoot, pendingEchoes, sendControl, userNode, userTextRoot } from './targets.ts'
import { snapshotGlyphs, type GlyphSnapshot } from './glyphs.ts'
import { prefersReducedMotion } from '../core/motion.ts'
import { reportTransferStatus } from '../core/transfer-status.ts'

export interface ReadFace<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}
interface Submission { requestId: string; placement: string; text: string; time?: number }
interface SessionSnapshot { pendingSubmissions?: readonly Submission[] }
export interface ChatSnapshot {
  order: readonly string[]
  nodes: { get(key: string): { data?: { source?: { kind?: string; rpcId?: string } } } | undefined }
}
export interface TransferServices {
  sessions?: {
    binding(id: string): { session: ReadFace<SessionSnapshot> } | undefined
  }
  /**
   * The current Session binding source. `sessions.list` has no `current`
   * field — the only public current-session identity is `uiSession.current`,
   * whose snapshot key is the Session id.
   */
  uiSession?: {
    current: ReadFace<{ key?: string }>
  }
  uiConversation?: {
    binding(id: string): { target(name: 'chat'): ReadFace<ChatSnapshot | undefined> } | undefined
  }
}
export interface TransferRequest {
  requestId: string
  source: GlyphSnapshot
  target(): HTMLElement | null
  fallback(): void
}
export interface TransferBridge {
  ownsGesture(): boolean
  onFallback(listener: () => void): () => void
  dispose(): void
}

/** Request metadata is the sole durable-message identity. */
export function nodeForRequest(chat: ChatSnapshot | undefined, requestId: string): string | null {
  if (!chat) return null
  const keys = chat.order.filter((key) => {
    const source = chat.nodes.get(key)?.data?.source
    return source?.kind === 'user' && source.rpcId === requestId
  })
  return keys.length === 1 ? keys[0]! : null
}

export function installTransferBridge(
  services: TransferServices,
  start: (request: TransferRequest) => (() => void) | null,
): TransferBridge {
  const sessions = services.sessions, conversation = services.uiConversation, ui = services.uiSession
  if (!sessions || !conversation || !ui) {
    reportTransferStatus('unavailable')
    return { ownsGesture: () => false, onFallback: () => () => {}, dispose() {} }
  }
  const fallbacks = new Set<() => void>()
  const fallback = () => { for (const notify of fallbacks) notify() }
  let sessionId: string | undefined
  let face: ReadFace<SessionSnapshot> | undefined
  let chat: ReadFace<ChatSnapshot | undefined> | undefined
  let releaseSession = () => {}
  const candidates: { source: GlyphSnapshot; time: number; wallTime: number }[] = []
  let ownsUntil = 0
  let candidateTimer: ReturnType<typeof setTimeout> | undefined
  let bindingTimer: ReturnType<typeof setTimeout> | undefined
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const seen = new Set<string>()
  const active = new Set<() => void>()
  const cancel = () => {
    candidates.length = 0; ownsUntil = 0
    clearTimeout(candidateTimer)
    clearTimeout(bindingTimer)
    for (const timer of timers) clearTimeout(timer)
    timers.clear()
    for (const stop of active) stop()
    active.clear()
  }
  const expireCandidates = () => {
    clearTimeout(candidateTimer)
    const now = performance.now()
    while (candidates[0] && now - candidates[0].time >= 1500) candidates.shift()
    if (candidates[0]) candidateTimer = setTimeout(expireCandidates, Math.max(1, 1500 - (now - candidates[0].time)))
  }
  const update = () => {
    if (!face || !sessionId) return
    const submissions = face.getSnapshot().pendingSubmissions ?? []
    for (const submission of submissions) {
      if (seen.has(submission.requestId)) continue
      seen.add(submission.requestId)
      if (seen.size > 200) seen.delete(seen.values().next().value!)
      expireCandidates()
      if (submission.placement !== 'transcript') continue
      // The public pending array preserves admission order; consume captured gestures
      // in the same order, including repeated identical submissions in one batch.
      const index = candidates.findIndex((entry) => (submission.time === undefined || submission.time >= entry.wallTime) && compactText(submission.text) === compactText(entry.source.text))
      if (index < 0) { if (candidates.length) reportTransferStatus('unmatched'); continue }
      const prepared = candidates.splice(index, 1)[0]!
      expireCandidates()
      if (active.size >= 2) { fallback(); continue }
      if (prefersReducedMotion()) continue
      const owner = sessionId
      const requestId = submission.requestId
      reportTransferStatus('confirmed')
      const stop = start({ requestId, source: prepared.source, fallback, target: () => {
        if (sessionId !== owner) return null
        const root = conversationRoot(owner)
        if (!root) return null
        // Authoritative identity first: the durable user node carries rpcId.
        const key = nodeForRequest(chat?.getSnapshot(), requestId)
        if (key) {
          const node = userNode(root, key)
          const text = node ? userTextRoot(node, submission.text) : null
          if (text) return text
        }
        // Local echo fallback. Echoes carry no request-id hook, so it is only
        // used for a single transcript pending whose unique chat-region echo
        // carries the same text.
        const pending = face?.getSnapshot().pendingSubmissions?.filter((entry) => entry.placement === 'transcript') ?? []
        if (pending.length !== 1 || pending[0]?.requestId !== requestId) return null
        const expected = compactText(submission.text)
        const echoes = pendingEchoes(root)
          .filter((echo) => compactText((echo as HTMLElement).innerText ?? echo.textContent ?? '') === expected)
        return echoes.length === 1 ? userTextRoot(echoes[0]!, submission.text) : null
      } })
      if (!stop) fallback()
      if (stop) {
        active.add(stop)
        const timer = setTimeout(() => { stop(); active.delete(stop); timers.delete(timer) }, 2100)
        timers.add(timer)
      }
    }
  }
  const bind = () => {
    try {
      const current = ui.current.getSnapshot().key
      if (current === sessionId && face && chat) return
      // A newly-created session inherits the first-send capture. Switching away
      // from an already-known session must never carry another draft across.
      if (sessionId !== undefined && current !== sessionId) {
        cancel()
        reportTransferStatus('canceled')
      }
      releaseSession(); releaseSession = () => {}
      seen.clear()
      sessionId = current
      face = undefined; chat = undefined
      if (!current) { reportTransferStatus('waiting'); return }
      const nextFace = sessions.binding(current)?.session
      if (!nextFace) { reportTransferStatus('binding'); return }
      const nextChat = conversation.binding(current)?.target('chat')
      if (!nextChat) { reportTransferStatus('binding'); return }
      face = nextFace; chat = nextChat
      if (!candidates.length) {
        for (const entry of face.getSnapshot().pendingSubmissions ?? []) seen.add(entry.requestId)
      }
      releaseSession = face.subscribe(() => {
        try { update() } catch { reportTransferStatus('failed') }
      })
      reportTransferStatus('ready')
      update()
    } catch {
      face = undefined; chat = undefined
      reportTransferStatus('binding')
    }
  }
  const retryBinding = () => {
    clearTimeout(bindingTimer)
    expireCandidates()
    if (!candidates.length) return
    bind()
    if ((!face || !chat) && candidates.length) bindingTimer = setTimeout(retryBinding, 40)
  }
  const prepare = (event: Event) => {
    if (prefersReducedMotion()) { reportTransferStatus('reduced'); return }
    if (document.documentElement.dataset.lumina !== 'on') return
    const target = event.target
    if (!(target instanceof Element)) return
    const card = target.closest(cssSelector('composerCard'))
    if (!card) return
    if (event instanceof KeyboardEvent) {
      if (event.key !== 'Enter' || event.isComposing || event.shiftKey || event.repeat) return
      if (!target.closest(cssSelector('composerInput'))) return
    } else if (target.closest('button') !== sendControl(card)) return
    const editor = queryTarget('composerInput', card)
    if (!(editor instanceof HTMLElement)) { reportTransferStatus('snapshot'); return }
    const source = snapshotGlyphs(editor)
    if (!source) { reportTransferStatus('snapshot'); return }
    expireCandidates()
    if (candidates.length >= 2) { fallback(); return }
    candidates.push({ source, time: performance.now(), wallTime: Date.now() })
    expireCandidates()
    ownsUntil = performance.now() + 1500
    reportTransferStatus('captured')
    retryBinding()
  }
  const releaseCurrent = ui.current.subscribe(bind)
  bind()
  document.addEventListener('click', prepare, true)
  document.addEventListener('keydown', prepare, true)
  window.addEventListener('wheel', cancel, { capture: true, passive: true })
  window.addEventListener('touchmove', cancel, { capture: true, passive: true })
  window.addEventListener('resize', cancel)
  return { ownsGesture: () => performance.now() < ownsUntil, onFallback: (listener) => { fallbacks.add(listener); return () => { fallbacks.delete(listener) } }, dispose: () => {
    cancel(); releaseSession(); releaseCurrent()
    document.removeEventListener('click', prepare, true)
    document.removeEventListener('keydown', prepare, true)
    fallbacks.clear()
    window.removeEventListener('wheel', cancel, true)
    window.removeEventListener('touchmove', cancel, true)
    window.removeEventListener('resize', cancel)
  } }
}
