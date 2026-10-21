/**
 * Selector assembly for L1.
 *
 * Effects never write selectors. They ask for a target id and receive either a
 * scoped CSS selector (for stylesheets) or a live element (for the few effects
 * that need one).
 */

import { TARGETS, type TargetId } from './targets.ts'

/** The root scope that gates every effect stylesheet. */
const ROOT_SCOPE = '[data-lumina="on"]'

/**
 * Build the scoped CSS selector list for a target.
 *
 * Multiple selectors are comma-joined so a stylesheet can match any known
 * variant without a runtime decision.
 *
 * @param id - the target id.
 * @returns the scoped selector list.
 */
export function cssSelector(id: TargetId): string {
  return TARGETS[id].selectors
    .map((selector) => `${ROOT_SCOPE} ${selector}`)
    .join(',\n')
}

/**
 * Append a pseudo-element to every selector in a list.
 *
 * @param selector - a comma/newline separated selector list.
 * @param pseudo - the pseudo-element name.
 * @returns the selector list with the pseudo-element appended to each entry.
 */
export function withPseudo(selector: string, pseudo: 'before' | 'after'): string {
  return splitSelectorList(selector)
    .map((part) => `${part}::${pseudo}`)
    .join(',\n')
}

/**
 * Split a selector list on commas that are not nested in `:is(...)` or an
 * attribute selector.
 *
 * Naive `split(',')` would turn `:is(p, h1)` into two selectors and attach the
 * pseudo-element to the wrong tokens.
 *
 * @param selector - the selector list.
 * @returns the top-level selectors, trimmed.
 */
function splitSelectorList(selector: string): string[] {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let index = 0; index < selector.length; index += 1) {
    const character = selector[index]
    if (character === '(' || character === '[') depth += 1
    else if (character === ')' || character === ']') depth -= 1
    else if (character === ',' && depth === 0) {
      parts.push(selector.slice(start, index).trim())
      start = index + 1
    }
  }
  parts.push(selector.slice(start).trim())
  return parts.filter((part) => part.length > 0)
}

/**
 * Query the first matching element for a target.
 *
 * Used only by JavaScript-driven effects and diagnostics; CSS effects do not
 * call this.
 *
 * @param id - the target id.
 * @param root - the subtree to search.
 * @returns the first validated match, or null.
 */
export function queryTarget(
  id: TargetId,
  root: ParentNode = document,
): Element | null {
  const target = TARGETS[id]
  for (const selector of target.selectors) {
    const element = root.querySelector(selector)
    if (element === null) continue
    if (target.validate !== undefined && !target.validate(element)) continue
    return element
  }
  return null
}
