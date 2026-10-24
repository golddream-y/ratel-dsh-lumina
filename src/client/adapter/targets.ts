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
  // Queue-dock rows also carry `data-submission-echo`; only chat-region
  // echoes are message landing targets.
  return [...root.querySelectorAll('[data-submission-echo]')]
    .filter((node) => node.closest('[data-conversation-region="composer"]') === null)
}

/** Match layout only after request identity is known; never establishes identity. */
export function userTextRoot(node: Element, text: string): HTMLElement | null {
  const expected = compactText(text)
  if (!expected) return null
  const candidates = [...node.querySelectorAll<HTMLElement>('span, p, div')]
    .filter((element) => !element.closest('[data-message-attachments], button') && compactText(element.innerText ?? element.textContent ?? '') === expected)
  if (!candidates.length) return null
  // The deepest match is the text run; the outermost one is the message bubble.
  // Masking the bubble would leave its background behind in the transcript.
  const deepest = candidates.filter((element) => !candidates.some((other) => other !== element && element.contains(other)))
  const area = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    return rect.width * rect.height
  }
  return deepest.sort((a, b) => area(a) - area(b))[0] ?? null
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

/** Semantic text-motion boundaries; never infer streaming from text content. */
export function composerEditor(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>('[data-composer-input]') : null
}

export function streamingText(node: Node): boolean {
  const parent = node.parentElement
  return !!parent?.closest('[data-streaming]') && !parent.closest('[data-composer-input], [aria-hidden="true"]')
}

export function currentHeroSession(): string {
  return document.querySelector('[data-conversation-session]')?.getAttribute('data-conversation-session') ?? ''
}

export function composerEditors(doc: Document): HTMLElement[] {
  return [...doc.querySelectorAll<HTMLElement>('[data-composer-input]')]
}

/** Verified HeroShell structure next to our own mark; no translated text or hash selectors. */
export function heroHeadline(mark: Element): HTMLElement | null {
  const outlet = mark.closest('[data-slot="conversation.hero.brand.mark"]')
  const hitbox = outlet?.parentElement ?? mark.parentElement
  const group = hitbox?.nextElementSibling
  if (hitbox?.tagName !== 'SPAN' || group?.tagName !== 'SPAN') return null
  const title = group.firstElementChild
  if (!(title instanceof HTMLElement) || title.tagName !== 'SPAN' || [...title.children].some(child => !child.classList.contains('lumina-hero-title-stroke')) || !title.textContent?.trim()) return null
  return title
}

/** Auxiliary hero controls, scoped to the current hero and official outlet anchors. */
export function heroAccessories(mark: Element): HTMLElement[] {
  const root = heroAccessoryRoot(mark)
  const targets = new Set<HTMLElement>()
  const addControl = (element: Element | null | undefined) => {
    if (!(element instanceof HTMLElement)) return
    if (element.matches('button, [role="button"], [aria-haspopup]')) targets.add(element)
    else for (const control of element.querySelectorAll<HTMLElement>('button, [role="button"], [aria-haspopup]')) targets.add(control)
  }
  const workspace = root.querySelector('[data-slot="conversation.hero.workspace"]')
  addControl(workspace?.previousElementSibling)
  for (const slot of ['conversation.hero.agentPreset', 'conversation.hero.options']) {
    addControl(root.querySelector(`[data-slot="${slot}"]`))
  }
  const badge = heroHeadline(mark)?.nextElementSibling
  if (badge instanceof HTMLElement && badge.tagName === 'SPAN' && badge.textContent?.trim()) targets.add(badge)
  return [...targets].filter(element => ![...targets].some(other => other !== element && other.contains(element))).slice(0, 8)
}

/** Scope the late-content gate to the current new-conversation surface. */
export function heroAccessoryRoot(mark: Element): HTMLElement {
  return mark.closest<HTMLElement>('[data-phase="hero"], [data-content-phase="hero"]') ?? mark.ownerDocument.documentElement
}

/** Gates cover future slot children too; display:contents anchors have no box themselves. */
export function heroAccessoryGateSelector(): string {
  return ['conversation.hero.agentPreset', 'conversation.hero.options'].map(slot =>
    `[data-lumina="on"][data-lumina-echo-gate="waiting"] [data-slot="${slot}"] > *,\n[data-lumina="on"] [data-lumina-echo-gate="waiting"] [data-slot="${slot}"] > *`,
  ).join(',\n')
}

/** Verified workspace group headers and their native AnimatedRows boundary. */
export function sidebarGroupHeader(node: Element): boolean {
  return node.matches('[data-row-key^="workspace:"][aria-expanded], [data-row-key^="overflow:"][aria-expanded]')
    && node.closest('[data-lumina="on"]') !== null
}
export function sidebarMotionRoot(header: Element): HTMLElement | null {
  return header.closest<HTMLElement>('[role="tree"]')?.parentElement ?? null
}
export function sidebarMotionTarget(target: Element): 'row' | 'exit' | null {
  if (target.matches('[data-row-key][role="treeitem"], [data-row-key^="overflow:"]')) return 'row'
  if (target.matches('[inert][role="treeitem"]')) return 'exit'
  return null
}

/** Verified AppFrame: three grid columns with the official rightbar seat. */
export function panelFrames(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-lumina="on"] [data-rightbar-col]')]
    .map(column => column.parentElement)
    .filter((frame): frame is HTMLElement => !!frame && frame.style.gridTemplateColumns !== '' && getComputedStyle(frame).display === 'grid')
}
export function panelFrameState(frame: HTMLElement) {
  return {
    left: frame.hasAttribute('data-sidebar-collapsed'),
    right: frame.hasAttribute('data-rightbar-collapsed'),
    blocked: ['data-dragging','data-rightbar-fullscreen','data-rightbar-instant'].some(key => frame.hasAttribute(key)),
  }
}

/** Native hero seat and AppFrame center column bound the page ribbon. */
export function composerRibbonScene(): { card: HTMLElement; area: HTMLElement; mark: HTMLElement } | null {
  const mark = document.querySelector<HTMLElement>('[data-slot="conversation.hero.brand.mark"]')
  const card = document.querySelector<HTMLElement>('[data-composer-card]')
  if (!mark || !card) return null
  const frame = panelFrames().find(frame => frame.contains(card))
  const area = frame?.children[1]
  const fallback = mark.closest<HTMLElement>('[data-phase="hero"], [data-content-phase="hero"]')
  const region = area instanceof HTMLElement ? area : fallback
  if (!region || !region.contains(card)) return null
  return { card, area: region, mark }
}

/** Only the plugin's own entrance artifacts gate decoration; no message inspection. */
export function composerRibbonReady(scene: { card: HTMLElement; area: HTMLElement; mark: HTMLElement }): boolean {
  if (scene.card.hasAttribute('data-lumina-assembling')) return false
  if (document.querySelector('[data-lumina-echo-gate="waiting"], [data-lumina-echo="waiting"], [data-lumina-echo="playing"]')) return false
  return !scene.mark.getAnimations({ subtree: true }).some(animation =>
    animation instanceof CSSAnimation && animation.animationName === 'lumina-hero-stroke' && animation.playState === 'running')
}
