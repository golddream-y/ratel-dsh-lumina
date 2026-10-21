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
