/**
 * The send transition entry point.
 *
 * One effect, several modes: the runtime owns the takeover, the landing and
 * the cleanup; a mode only draws. The mode is selected in the settings.
 */

import { installTransferBridge, type TransferBridge, type TransferRequest, type TransferServices } from '../adapter/send-transfer.ts'
import { transferCss } from './transfer/styles.ts'
export { transferCss } from './transfer/styles.ts'
import { installStyle } from '../core/styles.ts'
import { reportTransferStatus } from '../core/transfer-status.ts'
import type { Intensity } from '../core/config.ts'
import { runTransfer } from './transfer/runtime.ts'
import type { TransferMode } from './transfer/types.ts'

export type { TransferMode } from './transfer/types.ts'

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
