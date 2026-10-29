/** Native tool semantics only; never inspect arguments, outputs or translated labels. */
export const TOOL_ROW_SELECTOR = '[data-tool][data-variant][data-state], [data-sample="bash"][data-variant="bash"][data-state]'
const CHAT = '[data-conversation-content][data-conversation-region="chat"][data-conversation-session]'
const CALL = '[data-chat-flow-kind="tool-call"][data-chat-node-key]'
const variants = new Set(['read','search','write','edit','code','bash'])
export type ToolState = 'preparing' | 'running' | 'ok' | 'error' | 'stopped'
const states = new Set(['preparing','running','ok','error','stopped'])
export interface ToolTarget {
  row: HTMLElement; header: HTMLElement; body: HTMLElement | null
  call: HTMLElement; chat: HTMLElement; key: string; state: ToolState; open: boolean
}
export function toolRows(node: Node): HTMLElement[] {
  if (!(node instanceof Element || node instanceof Document)) return []
  return [...(node instanceof HTMLElement && node.matches(TOOL_ROW_SELECTOR) ? [node] : []), ...node.querySelectorAll<HTMLElement>(TOOL_ROW_SELECTOR)]
}
export function toolRowOwner(node: Node): HTMLElement | null {
  return node instanceof Element ? node.closest<HTMLElement>(TOOL_ROW_SELECTOR) : node.parentElement?.closest<HTMLElement>(TOOL_ROW_SELECTOR) ?? null
}
export function toolTarget(row: HTMLElement): ToolTarget | null {
  if (!row.isConnected || !row.matches(TOOL_ROW_SELECTOR) || !variants.has(row.dataset.variant ?? '') || !states.has(row.dataset.state ?? '') || row.dataset.tool === 'ask_user_question') return null
  const chat=row.closest<HTMLElement>(CHAT), call=row.closest<HTMLElement>(CALL)
  if (!chat || chat!==document.querySelector(CHAT) || !call || !chat.contains(call) || !chat.dataset.conversationSession) return null
  // Nested calls may have several native rows but no per-row stable call id.
  if (call.querySelectorAll(TOOL_ROW_SELECTOR).length !== 1) return null
  const bash=row.dataset.sample === 'bash'
  const header=bash ? row : row.querySelector<HTMLElement>('[data-disclosure-header]')
  if (!header || toolRowOwner(header) !== row) return null
  const trigger=bash ? row : header.querySelector<HTMLElement>('[data-disclosure-row][aria-expanded]')
  const open=trigger?.getAttribute('aria-expanded') === 'true'
  const sibling=header.nextElementSibling
  const body=open && sibling instanceof HTMLElement && call.contains(sibling) && !sibling.matches(TOOL_ROW_SELECTOR) ? sibling : null
  return {row,header,body,call,chat,key:JSON.stringify([chat.dataset.conversationSession,call.dataset.chatNodeKey]),state:row.dataset.state as ToolState,open}
}
export function toolHeaderVisible(target: ToolTarget): DOMRect | null {
  if (document.hidden || target.header.closest('[hidden], [inert], [aria-hidden="true"], [data-turn-process-hidden="true"]')) return null
  const rect=target.header.getBoundingClientRect()
  if (rect.width<=0 || rect.height<=0 || rect.bottom<=0 || rect.top>=innerHeight || rect.right<=0 || rect.left>=innerWidth) return null
  let parent: HTMLElement | null=target.header
  while(parent && parent!==document.body) {
    const style=getComputedStyle(parent)
    if(style.display==='none' || style.visibility==='hidden' || style.visibility==='collapse') return null
    if(parent!==target.header && /(auto|scroll|hidden|clip)/.test(style.overflowY+style.overflowX)) {
      const box=parent.getBoundingClientRect()
      if(rect.bottom<=box.top || rect.top>=box.bottom || rect.right<=box.left || rect.left>=box.right) return null
    }
    parent=parent.parentElement
  }
  return rect
}
export function toolMutationRelevant(record: MutationRecord): boolean {
  if(record.type==='attributes') return !!toolRowOwner(record.target) || (record.target instanceof Element && (record.target.matches(CHAT) || (['hidden','aria-hidden','data-turn-process-hidden'].includes(record.attributeName ?? '') && toolRows(record.target).length>0)))
  return [...record.addedNodes,...record.removedNodes].some(node=>toolRows(node).length>0 || (node instanceof Element && (node.matches(CHAT) || node.matches('[data-disclosure-header]') || !!node.querySelector('[data-disclosure-header]'))))
}
