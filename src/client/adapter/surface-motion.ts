/** Verified native hooks only; never infer surfaces from generated classes. */
export const surfaceSelector = {
  dialog: '[role="dialog"][aria-modal="true"]',
  menu: '[data-menu-material="translucent"], [role="tooltip"][data-side][data-align]',
} as const
export const selectedSessionSelector = '[data-row-key^="session:"][aria-selected="true"], [data-row-key^="session:"] [role="treeitem"][aria-selected="true"]'
export function sessionTree(row: HTMLElement): HTMLElement | null {
  return row.closest<HTMLElement>('[role="tree"]')
}

export function surfaceTrigger(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>('button, [role="button"], [role="menuitem"]') : null
}
