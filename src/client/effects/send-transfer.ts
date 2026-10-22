/**
 * The send transition entry point.
 *
 * One effect, several modes: the runtime owns the takeover, the landing and
 * the cleanup; a mode only draws. The mode is selected in the settings.
 */

import { installTransferBridge, type TransferBridge, type TransferRequest, type TransferServices } from '../adapter/send-transfer.ts'
import { cssSelector } from '../adapter/selector.ts'
import { installStyle } from '../core/styles.ts'
import { reportTransferStatus } from '../core/transfer-status.ts'
import type { Intensity } from '../core/config.ts'
import { runTransfer, MASK } from './transfer/runtime.ts'
import type { TransferMode } from './transfer/types.ts'

export type { TransferMode } from './transfer/types.ts'

/** The stylesheet for every mode. */
export function transferCss(): string {
  return `
[data-lumina="on"] [${MASK}] { opacity: 0 !important; }
[data-lumina="off"] .lumina-transfer { display: none; }
[data-lumina="on"] .lumina-transfer {
  position: absolute; pointer-events: none; user-select: none; z-index: 2147483646;
  --lumina-water-tint: var(--dsw-alias-brand-primary-new-colorprimary-new-color, var(--lumina-brand-ratel));
  --lumina-water-light: color-mix(in srgb, var(--lumina-water-tint) 16%, var(--lumina-hi));
  --lumina-water-body: color-mix(in srgb, var(--lumina-water-tint) 42%, var(--lumina-hi));
  --lumina-water-depth: color-mix(in srgb, var(--lumina-water-tint) 76%, var(--lumina-hi));
  --lumina-water-line: color-mix(in srgb, var(--lumina-water-tint) 70%, transparent);
  contain: layout style; isolation: isolate; color: var(--lumina-water-depth);
}
[data-lumina="on"] .lumina-transfer * { pointer-events: none; }
[data-lumina="on"] .lumina-transfer-ink { position: absolute; inset: 0; }
[data-lumina="on"] .lumina-transfer-layer { position: absolute; inset: 0; }
[data-lumina="on"] .lumina-transfer-glyph {
  position: absolute; left: 0; top: 0; white-space: pre; transform-origin: center;
}
[data-lumina="on"] .lumina-transfer-liquid { position: absolute; inset: 0; overflow: visible; }
[data-lumina="on"] .lumina-transfer-mist {
  position: absolute; left: 0; top: 0; width: 64px; height: 64px;
  will-change: transform, opacity; filter: blur(5px);
}
[data-lumina="on"] .lumina-transfer-mist-blob {
  position: absolute; border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 77, 69, .52), rgba(255, 77, 69, 0) 70%);
  animation: lumina-mist-drift 2.6s ease-in-out infinite alternate;
}
${cssSelector('composerCard')}[data-lumina-transfer]::before,
${cssSelector('composerCard')}[data-lumina-transfer]::after { animation-play-state: paused !important; }
@media (prefers-reduced-motion: reduce) {
  [data-lumina="on"] .lumina-transfer { display: none; }
  [data-lumina="on"] [${MASK}] { opacity: revert !important; }
}
`
}

/**
 * Install the send transition.
 *
 * @param services - the read-only client services.
 * @param mode - the selected mode.
 * @param intensity - the active duration tier.
 * @returns the bridge handle.
 */
export function installSendTransfer(
  services: TransferServices,
  mode: TransferMode,
  intensity: Intensity = 'normal',
): TransferBridge {
  const disposeStyle = installStyle('sendTransfer', transferCss())
  let bridge: TransferBridge
  try {
    bridge = installTransferBridge(
      services,
      (request: TransferRequest) => runTransfer(request, mode, intensity),
    )
  } catch {
    reportTransferStatus('failed')
    disposeStyle()
    return { ownsGesture: () => false, onFallback: () => () => {}, dispose() {} }
  }
  return {
    ownsGesture: bridge.ownsGesture,
    onFallback: bridge.onFallback,
    dispose: () => { bridge.dispose(); disposeStyle() },
  }
}
