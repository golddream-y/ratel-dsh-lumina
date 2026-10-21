/**
 * The one streaming-state observer.
 *
 * `[data-streaming]` is not a stable ancestor of the composer or its cursor, so
 * effects that need stream state read a root attribute maintained here. There
 * is exactly one observer for the whole plugin; effects must not create their
 * own.
 */

/** The root attribute that mirrors the stream state. */
export const STREAMING_ATTRIBUTE = 'data-lumina-streaming'

/** The interval that collapses bursts of attribute mutations. */
const DEBOUNCE_MS = 120

/** A subscription to the stream state. */
export type StreamingListener = (streaming: boolean) => void

/** The live stream-state handle. */
export interface StreamingState {
  /** Stop observing and remove the root attribute. */
  dispose: () => void
  /** Observe transition start/end. */
  subscribe: (listener: StreamingListener) => () => void
}

/**
 * Start the single streaming observer.
 *
 * @param doc - the document to observe (injectable for tests).
 * @returns the disposable handle.
 */
export function installStreamingState(doc: Document = document): StreamingState {
  const listeners = new Set<StreamingListener>()
  let streaming = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let disposed = false
  const root = doc.documentElement

  const notify = (next: boolean) => {
    for (const listener of listeners) {
      try {
        listener(next)
      } catch {
        // A broken listener must not take the observer down.
      }
    }
  }

  const evaluate = () => {
    timer = undefined
    if (disposed) return
    const next = doc.querySelector('[data-streaming]') !== null
    if (next === streaming) return
    streaming = next
    if (next) root.setAttribute(STREAMING_ATTRIBUTE, 'on')
    else root.removeAttribute(STREAMING_ATTRIBUTE)
    notify(next)
  }

  const schedule = () => {
    if (disposed) return
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(evaluate, DEBOUNCE_MS)
  }

  const Observer = globalThis.MutationObserver
  const observer =
    typeof Observer === 'function'
      ? new Observer(schedule)
      : undefined
  observer?.observe(doc.documentElement, {
    subtree: true,
    attributes: true,
    attributeFilter: ['data-streaming'],
  })

  // Sync once so a stream already running at apply time is not missed.
  evaluate()

  return {
    dispose: () => {
      disposed = true
      if (timer !== undefined) clearTimeout(timer)
      observer?.disconnect()
      listeners.clear()
      root.removeAttribute(STREAMING_ATTRIBUTE)
      streaming = false
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
