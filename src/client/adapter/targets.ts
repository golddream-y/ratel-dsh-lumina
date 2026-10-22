/**
 * The L1 target registry.
 *
 * This is the only file allowed to contain DOM selectors. Effects ask for a
 * target id; the selector texts (and any future legacy variants) live here.
 *
 * Failure is a normal outcome: a missing target means the effect degrades, not
 * that the plugin failed. `validate` is used for JavaScript queries; CSS-only
 * effects get the selector list and let the browser match.
 */

/** The semantic targets the effects can ask for. */
export type TargetId =
  | 'menuSurface'
  | 'composerCard'
  | 'composerInput'
  | 'composerButton'
  | 'lexicalCursor'
  | 'streamingTail'
  | 'streaming'
  | 'sessionRow'
  | 'sessionRunning'

/** A target's selector list and optional JavaScript-side validation. */
export interface TargetDefinition {
  readonly id: TargetId
  readonly kind: 'css' | 'state'
  /** Canonical selector first; later entries are proven historical variants. */
  readonly selectors: readonly string[]
  /** Extra check before a JavaScript caller trusts a matched element. */
  readonly validate?: (element: Element) => boolean
}

/**
 * Whether an element currently has a non-zero box.
 *
 * @param element - the candidate element.
 * @returns true when the element is visible with a size.
 */
function hasBox(element: Element): boolean {
  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

/**
 * The target table.
 *
 * Keep this table free of effect-specific logic. Adding a legacy selector is a
 * one-line change here plus a fixture; effects never change.
 */
export const TARGETS: Readonly<Record<TargetId, TargetDefinition>> = {
  menuSurface: {
    id: 'menuSurface',
    kind: 'css',
    selectors: ['[data-menu-material="translucent"]'],
  },
  composerCard: {
    id: 'composerCard',
    kind: 'css',
    selectors: ['[data-composer-card]'],
    validate: hasBox,
  },
  composerInput: {
    id: 'composerInput',
    kind: 'css',
    selectors: ['[data-composer-input]'],
    validate: (element) =>
      hasBox(element) && element.getAttribute('contenteditable') !== null,
  },
  composerButton: {
    id: 'composerButton',
    kind: 'css',
    selectors: ['[data-composer-card] button:not([disabled])'],
    validate: (element) => element.tagName.toLowerCase() === 'button',
  },
  lexicalCursor: {
    id: 'lexicalCursor',
    kind: 'css',
    selectors: ['[data-lexical-cursor]'],
    validate: (element) => element.getAttribute('contenteditable') === 'false',
  },
  streamingTail: {
    id: 'streamingTail',
    kind: 'css',
    selectors: [
      '[data-streaming] > div > :is(p, h1, h2, h3, h4, h5, h6):last-child',
      '[data-streaming] > div > :is(ul, ol):last-child > li:last-child',
    ],
  },
  streaming: {
    id: 'streaming',
    kind: 'state',
    selectors: ['[data-streaming]'],
  },
  sessionRow: {
    id: 'sessionRow',
    kind: 'css',
    selectors: ['[data-row-key^="session:"]'],
    validate: (element) => element.getAttribute('role') === 'treeitem',
  },
  sessionRunning: {
    id: 'sessionRunning',
    kind: 'css',
    selectors: [
      '[data-row-key^="session:"] svg[data-state="ongoing"]',
    ],
    validate: (element) => element.tagName.toLowerCase() === 'svg',
  },
}

/** Semantic DOM bridge for a request-id-correlated user node. No class names. */
export function conversationRoot(sessionId: string): Element | null {
  return [...document.querySelectorAll('[data-conversation-content][data-conversation-region="chat"]')]
    .find((node) => node.getAttribute('data-conversation-session') === sessionId) ?? null
}

export function userNode(root: Element, key: string): Element | null {
  return [...root.querySelectorAll('[data-chat-node-key], [data-chat-flow-key]')]
    .find((node) => (node.getAttribute('data-chat-node-key') ?? node.getAttribute('data-chat-flow-key')) === key) ?? null
}

export function pendingEchoes(root: Element): Element[] {
  return [...root.querySelectorAll('[data-submission-echo]')]
}

/** Match layout only after request identity is known; never establishes identity. */
export function userTextRoot(node: Element, text: string): HTMLElement | null {
  const expected = compactText(text)
  const candidates = [...node.querySelectorAll<HTMLElement>('span, p, div')]
    .filter((element) => !element.closest('[data-message-attachments], button') && compactText(element.innerText ?? element.textContent ?? '') === expected)
  return candidates.find((element) => !candidates.some((other) => other !== element && element.contains(other))) ?? null
}

export function compactText(text: string): string {
  return text.replace(/\s+/gu, '')
}

/** Rightmost visible control, with disabled controls retaining their position. */
export function sendControl(card: Element): HTMLButtonElement | null {
  const buttons = [...card.querySelectorAll<HTMLButtonElement>('button')]
    .filter((node) => { const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0 })
    .sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right)
  return buttons[0] && !buttons[0].disabled ? buttons[0] : null
}

/** Keep glyph capture out of cursor decorations and accessibility-only text. */
export function isGlyphDecoration(element: Element): boolean {
  return element.closest('[aria-hidden="true"], [data-lexical-cursor]') !== null
}
