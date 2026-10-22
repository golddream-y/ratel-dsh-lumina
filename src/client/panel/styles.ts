/**
 * The settings page stylesheet.
 *
 * The chrome uses the client's semantic tokens (`--dsw-alias-*`) so the page
 * follows the active theme in both color schemes without a second rule set.
 * The preview block reuses the shared keyframes, so what the user sees in the
 * panel is what the live effect does.
 */

import { BORDER_BREATHE, BORDER_SPIN, CARET_BREATHE, WORDMARK_SWEEP } from '../core/keyframes.ts'
import { composerCss } from '../effects/composer.ts'

/**
 * The stylesheet of the Lumina settings page.
 *
 * @returns the stylesheet text.
 */
export function panelCss(): string {
  return `
.lumina-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px 24px 24px;
  max-width: 640px;
  color: var(--dsw-alias-label-primary);
}

.lumina-panel-header { display: flex; flex-direction: column; gap: 6px; }
.lumina-panel-title { margin: 0; font-size: 17px; font-weight: 600; }
.lumina-panel-intro { margin: 0; font-size: 13px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }

.lumina-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1);
}
.lumina-section-title { font-size: 13px; font-weight: 600; }

.lumina-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  cursor: pointer;
}
.lumina-row-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.lumina-row-title { font-size: 13px; }
.lumina-row-hint { font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-tertiary); }

.lumina-field { display: flex; flex-direction: column; gap: 4px; }

.lumina-segmented {
  display: inline-flex;
  gap: 2px;
  margin-top: 8px;
  padding: 2px;
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2);
}
.lumina-segment {
  appearance: none;
  border: 0;
  border-radius: 6px;
  padding: 5px 12px;
  font: inherit;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary);
  background: transparent;
  cursor: pointer;
}
.lumina-segment:hover { color: var(--dsw-alias-label-primary); }
.lumina-segment[data-active='true'] {
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-4);
}

.lumina-switch { accent-color: var(--lumina-brand); width: 16px; height: 16px; flex-shrink: 0; }
.lumina-switch:disabled { opacity: .45; }

.lumina-preview {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 10px;
  padding: 16px;
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2);
}

/* The miniature composer shares the continuous mixed rim and broad light wash. */
.lumina-preview-composer {
  position: relative;
  width: 150px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  display: flex;
  align-items: center;
  padding: 0 10px;
}
${composerCss(
  ".lumina-preview-composer[data-active='true']",
  ".lumina-preview-composer[data-active='true']",
)}
.lumina-preview-caret {
  display: inline-block;
  width: 2px;
  height: 14px;
  border-radius: 1px;
  background: var(--dsw-alias-label-primary);
}
.lumina-preview-caret[data-active='true'] { animation: lumina-caret-breathe 1.15s ease-in-out infinite; }

/* The miniature brand mark: a sweep of light across the accent bar. */
.lumina-preview-mark {
  position: relative;
  width: 72px;
  height: 20px;
  border-radius: 5px;
  overflow: hidden;
  background: var(--lumina-brand);
}
.lumina-preview-mark[data-brand='ratel'] { background: var(--lumina-brand-ratel); }
.lumina-preview-mark[data-brand='deepseek'] { background: var(--lumina-brand-deepseek); }
.lumina-preview-mark::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(100deg, transparent 30%, var(--lumina-hi, #fff) 50%, transparent 70%);
  mix-blend-mode: overlay;
  animation: lumina-sweep 3.6s cubic-bezier(.45, 0, .55, 1) infinite;
  pointer-events: none;
}
.lumina-preview-mark[data-brand='deepseek'] { background: var(--lumina-brand-deepseek); }

.lumina-panel-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
}
.lumina-panel-spacer { flex: 1; }
.lumina-panel-message { font-size: 12px; color: var(--dsw-alias-label-tertiary); }

.lumina-button {
  appearance: none;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 8px;
  padding: 6px 14px;
  font: inherit;
  font-size: 13px;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-layer-1);
  cursor: pointer;
}
.lumina-button:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); }
.lumina-button:disabled { opacity: .45; cursor: default; }
.lumina-button[data-primary='true'] {
  border-color: transparent;
  color: var(--dsw-alias-label-primary-foreground);
  background: var(--dsw-alias-brand-primary);
}

${BORDER_BREATHE}
${BORDER_SPIN}
${CARET_BREATHE}
${WORDMARK_SWEEP}
`
}
