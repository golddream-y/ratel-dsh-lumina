/** Ephemeral diagnostic metadata. Never includes text, identities or errors. */
export type TransferStatusCode = 'disabled' | 'unavailable' | 'waiting' | 'ready' | 'captured' | 'confirmed'
  | 'playing' | 'done' | 'snapshot' | 'binding' | 'unmatched' | 'timeout' | 'canceled' | 'failed' | 'reduced'
let current = { code: 'disabled' as TransferStatusCode, starts: 0 }
const listeners = new Set<() => void>()
export function reportTransferStatus(code: TransferStatusCode): void {
  current = { code, starts: current.starts + (code === 'playing' ? 1 : 0) }
  for (const listener of listeners) listener()
}
export const getTransferStatus = () => current
export function subscribeTransferStatus(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
