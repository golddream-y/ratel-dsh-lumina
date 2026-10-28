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
  gap: 12px;
  padding: 8px 24px 24px;
  max-width: 640px;
  --lumina-settings-surface: color-mix(in srgb, var(--dsw-alias-label-primary) 5%, var(--dsw-alias-bg-base));
  color: var(--dsw-alias-label-primary);
}

.lumina-panel-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 0 2px; }
.lumina-header-copy { display: flex; flex-direction: column; gap: 3px; }
.lumina-panel-title { margin: 0; font-size: 16px; font-weight: 600; line-height: 1.35; }
.lumina-panel-intro { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--dsw-alias-label-secondary); }

.lumina-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 20px;
  border: 0;
  border-radius: 14px;
  background: var(--lumina-settings-surface);
}
.lumina-section-title { font-size: 13px; font-weight: 600; }
.lumina-group-title { display: flex; align-items: baseline; gap: 8px; }
/* The overall block states its scope once, on the title line, the way a
   section header carries its own note in the rest of the client. */
.lumina-general-title { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.lumina-general-hint { font-size: 12px; font-weight: 400; color: var(--dsw-alias-label-tertiary); }
.lumina-group-subtitle { font-size: 12px; font-weight: 400; color: var(--dsw-alias-label-tertiary); }
/* The overall block carries every global preference, so it reads one level
   stronger than the location groups below it. */
.lumina-section-general {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 5%, var(--lumina-settings-surface, transparent));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-state-business-primary) 16%, transparent);
}
.lumina-section-general .lumina-section-title { color: var(--dsw-alias-state-business-primary); }

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

.lumina-field { display: flex; flex-direction: column; gap: 3px; }
/* A <p> hint inside a block would add a full paragraph margin on both sides,
   which is what opened the gap under the block title. */
.lumina-section > p.lumina-row-hint { margin: 0; }
/* A switch owns the right edge of its row, so a toggle keeps its hint under the
   title. A segmented field leaves the right side empty, so the hint moves there
   instead of stacking under the title. */
.lumina-field-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}
.lumina-field-head .lumina-row-hint {
  margin: 0;
  text-align: right;
  max-width: 62%;
}
.lumina-performance .lumina-field-head { align-items: baseline; }

.lumina-segmented {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 5px;
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
  white-space: nowrap;
  /* Switching a mode used to be a hard cut: the chip and its ring appeared in
     one frame while every other control in the page animated. */
  transition: color 140ms ease, background-color 160ms ease, box-shadow 160ms ease;
}
.lumina-segment:hover { color: var(--dsw-alias-label-primary); }
/* The selected chip is marked with a brand tint and a ring: the theme's own
   layer tokens are too close to the group background to read as selected. */
.lumina-segment[data-active='true'] {
  color: var(--dsw-alias-label-primary);
  font-weight: 600;
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-state-business-primary) 35%, transparent);
}
.lumina-segment:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 60%, transparent);
  outline-offset: 1px;
}
.lumina-segment:disabled { opacity: .45; cursor: default; }

.lumina-switch {
  appearance: none; position: relative; display: inline-block;
  width: 34px; height: 20px; margin: 0; border: 0; border-radius: 999px;
  flex-shrink: 0; cursor: pointer;
  background: var(--dsw-alias-label-tertiary);
  transition: background-color 160ms ease;
}
.lumina-switch::before {
  content: ''; position: absolute; top: 3px; left: 3px;
  width: 14px; height: 14px; border-radius: 50%;
  background: var(--dsw-alias-bg-base);
  transition: transform 160ms ease;
}
.lumina-switch:checked { background: var(--dsw-alias-state-business-primary); }
.lumina-switch:checked::before { transform: translateX(14px); }
.lumina-switch:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 3px; }
.lumina-switch:disabled { opacity: .4; cursor: default; }
@media (prefers-reduced-motion: reduce) { .lumina-switch, .lumina-switch::before, .lumina-segment, .lumina-segmented::before { transition: none; } }

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

.lumina-panel-footer { position: sticky; bottom: 0; z-index: 2; isolation: isolate; padding: 12px 0; flex-wrap: wrap; background: var(--dsw-alias-bg-base); border: 0; }
/* Cover the panel's bottom padding below the sticky action bar. */
.lumina-panel-footer::after {
  content: ''; position: absolute; top: 100%; left: -24px; right: -24px;
  height: 48px; background: var(--dsw-alias-bg-base); pointer-events: none;
}
.lumina-section-title { margin: 0; }
.lumina-diagnostics summary { cursor: pointer; font-weight: 500; }
.lumina-diagnostics[open] summary { margin-bottom: 16px; }
.lumina-row { min-width: 0; padding: 4px 0; }
.lumina-switch { accent-color: var(--dsw-alias-state-business-primary); }
.lumina-segmented { flex-wrap: wrap; position: relative; }
/* One indicator per group slides to the active chip, so switching a mode reads
   as movement rather than as two chips swapping colour. The box comes from
   useSegmentIndicators because the groups have different widths. */
.lumina-segmented::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  z-index: 0;
  width: var(--lumina-chip-w, 0);
  height: var(--lumina-chip-h, 0);
  border-radius: 6px;
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-state-business-primary) 35%, transparent);
  transform: translate(var(--lumina-chip-x, 0), var(--lumina-chip-y, 0));
  transition: transform 200ms cubic-bezier(.22,.7,.3,1), width 200ms cubic-bezier(.22,.7,.3,1), height 200ms ease;
  opacity: 0;
  pointer-events: none;
}
.lumina-segmented[data-chip='ready']::before { opacity: 1; }
/* While the indicator is measured it owns the highlight; before that (first
   paint, no JS) the chip keeps its own tint as a fallback. */
.lumina-segmented[data-chip='ready'] > .lumina-segment[data-active='true'] {
  background: transparent;
  box-shadow: none;
}

.lumina-performance { position: relative; z-index: 1; min-width: 0; }
/* Every block isolates its own stacking context, so a later block paints over
   an earlier one. The detail card hangs below its own block, so while it is open
   that block has to come forward or the next section covers it. */
.lumina-section:has(.lumina-performance-details) { z-index: 3; }
.lumina-performance-intro { margin: 0; }
.lumina-performance-control { position: relative; }
.lumina-performance-options { display: flex; flex-wrap: nowrap; overflow-x: auto; }
.lumina-performance-choice { flex: 1 0 auto; white-space: nowrap; }
.lumina-performance-choice:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: -2px; }
.lumina-performance-details { position: absolute; top: calc(100% + 6px); inset-inline: 0; z-index: 4; padding: 16px; border-radius: 12px; background: var(--dsw-alias-bg-base); color: var(--dsw-alias-label-primary); box-shadow: 0 6px 24px color-mix(in srgb, var(--dsw-alias-label-primary) 15%, transparent), inset 0 0 0 1px var(--dsw-alias-border-l2); font-size: 12px; line-height: 1.6; }
.lumina-performance-details::before { content: ''; position: absolute; inset-inline: 0; top: -8px; height: 8px; }
.lumina-performance-details p { margin: 6px 0; }
.lumina-performance-details dl { display: grid; grid-template-columns: auto minmax(0,1fr); gap: 8px 12px; margin: 12px 0; }
.lumina-performance-details dt { color: var(--dsw-alias-label-secondary); }
.lumina-performance-details dd { margin: 0; overflow-wrap: anywhere; }
.lumina-performance-summary { margin: 2px 0 0; font-size: 12px; line-height: 1.6; color: var(--dsw-alias-label-secondary); }

/* Static layers animate only their opacity; no continuous painted shadows. */
.lumina-section { position: relative; isolation: isolate; }
.lumina-panel[data-settings-motion='on'] .lumina-section::before,
.lumina-panel[data-settings-motion='on'] .lumina-section::after { content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: -1; opacity: 0; transition: opacity 220ms ease; }
.lumina-panel[data-settings-motion='on'] .lumina-section::before { box-shadow: 0 2px 10px color-mix(in srgb, var(--dsw-alias-label-primary) 4%, transparent), inset 0 0 0 1px color-mix(in srgb, var(--lumina-settings-accent, var(--dsw-alias-state-business-primary)) 14%, transparent); }
.lumina-panel[data-settings-motion='on'] .lumina-section::after { background: radial-gradient(ellipse at 18% 0%, color-mix(in srgb, var(--lumina-settings-accent, var(--dsw-alias-state-business-primary)) 4%, transparent), transparent 65%); }
/* Pointing at a block is the first thing a reader does, so the lift follows the
   pointer instead of waiting for a click to land focus inside. */
.lumina-panel[data-settings-motion='on'] .lumina-section:hover::before,
.lumina-panel[data-settings-motion='on'] .lumina-section:hover::after,
.lumina-panel[data-settings-motion='on'] .lumina-section:focus-within::before,
.lumina-panel[data-settings-motion='on'] .lumina-section:focus-within::after { opacity: 1; }
.lumina-panel .lumina-segment, .lumina-panel .lumina-button { position: relative; overflow: hidden; isolation: isolate; }
.lumina-setting-glint { position: absolute; inset: -25% -35%; border-radius: inherit; pointer-events: none; background: linear-gradient(105deg, transparent 25%, color-mix(in srgb, var(--lumina-settings-accent, var(--dsw-alias-state-business-primary)) 14%, var(--dsw-alias-bg-base)) 50%, transparent 75%); }
.lumina-panel[data-settings-motion='on'] .lumina-performance-details { animation: lumina-settings-tip-in 140ms ease-out both; }
@keyframes lumina-settings-tip-in { from { opacity: 0; } to { opacity: 1; } }
html[data-lumina-motion-paused] .lumina-panel[data-settings-motion] .lumina-section { transform: none; }
html[data-lumina-motion-paused] .lumina-panel[data-settings-motion] .lumina-section::before,
html[data-lumina-motion-paused] .lumina-panel[data-settings-motion] .lumina-section::after { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .lumina-panel[data-settings-motion] .lumina-section,
  .lumina-panel[data-settings-motion] .lumina-section:focus-within { transform: none; transition: none; }
  .lumina-panel[data-settings-motion] .lumina-section::before,
  .lumina-panel[data-settings-motion] .lumina-section::after { transition: none; }
  .lumina-panel[data-settings-motion] .lumina-performance-details { animation: none; }
  .lumina-setting-glint { display: none; }
}
${BORDER_BREATHE}
${BORDER_SPIN}
${CARET_BREATHE}
${WORDMARK_SWEEP}
`
}
