#!/usr/bin/env node
/**
 * Hook and slot probe.
 *
 * Paste the body of this file into the client console (or run it through a
 * CDP Runtime.evaluate call) to check which of the assumptions the effects
 * rely on still hold after a client upgrade.
 *
 * The failure mode this guards against is silent: a renamed `data-*` hook does
 * not throw, it just makes the effect do nothing. A probe that prints MISSING
 * turns that silence into a report.
 */

/** The semantic hooks the Tier 2 effects select on. */
const HOOKS = [
  'data-composer-card',
  'data-composer-input',
  'data-composer-overlay',
  'data-lexical-cursor',
  'data-streaming',
  'data-ds-theme',
  'data-ds-dark-theme',
  'data-row-key',
]

/** The official slots the Tier 1 effects occupy. */
const SLOTS = [
  'sidebar.brand.mark',
  'sidebar.brand.name',
  'conversation.hero.brand.mark',
  'settings.section',
]

/**
 * Count the elements carrying a given attribute.
 *
 * @param {string} attribute - the attribute name.
 * @returns {number} the number of matching elements.
 */
function countAttribute(attribute) {
  return document.querySelectorAll(`[${attribute}]`).length
}

/**
 * Count the session rows the activity indicator targets.
 *
 * @returns {number} the number of session rows.
 */
function countSessionRows() {
  return document.querySelectorAll('[data-row-key^="session:"]').length
}

/**
 * Count the session rows currently showing the native running spinner.
 *
 * @returns {number} the number of running session rows.
 */
function countRunningSessionRows() {
  return document.querySelectorAll('[data-row-key^="session:"] svg[data-state="ongoing"]').length
}

/**
 * Report the state of every hook and slot.
 *
 * @returns {object} the probe result.
 */
export function probe() {
  const hooks = Object.fromEntries(HOOKS.map((hook) => [hook, countAttribute(hook)]))
  const missing = Object.entries(hooks)
    .filter(([, count]) => count === 0)
    .map(([hook]) => hook)

  const boot = globalThis.__DSH_BOOT__
  const entries = Array.isArray(boot?.entries) ? boot.entries.map((entry) => entry.id) : []

  return {
    hooks,
    missing,
    luminaLoaded: entries.includes('@ratel/dsh-lumina'),
    bootEntries: entries,
    luminaStyles: document.querySelectorAll('style[data-plugin="ratel-lumina"]').length,
    sessionRows: countSessionRows(),
    runningSessionRows: countRunningSessionRows(),
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  }
}

const result = probe()
console.table(result.hooks)
console.log('missing hooks :', result.missing.length ? result.missing : '(none)')
console.log('lumina loaded :', result.luminaLoaded)
console.log('lumina styles :', result.luminaStyles)
console.log('session rows  :', result.sessionRows)
console.log('running rows  :', result.runningSessionRows)
console.log('boot entries  :', result.bootEntries.join(', ') || '(empty)')
console.log('reduced motion:', result.reducedMotion)
