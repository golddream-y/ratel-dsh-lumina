/** M4 · restrained press, one acknowledgement per send, and menu fade-in. */

import { cssSelector } from '../adapter/selector.ts'
import type { StreamingState } from '../adapter/streaming.ts'
import type { Intensity } from '../core/config.ts'
import { prefersReducedMotion } from '../core/motion.ts'
import { installStyle } from '../core/styles.ts'
import { SEND_RIPPLE } from '../style/tokens.ts'
import { observeSendFeedback } from '../adapter/send-feedback.ts'
import type { TransferServices } from '../adapter/send-transfer.ts'

const PULSE_ATTRIBUTE = 'data-lumina-send-pulse'
const RIPPLE_CLASS = 'lumina-send-ripple'

/** The interaction baseline; menu positioning and native close timing stay owned by DSH. */
export function pressCss(): string {
  const button = cssSelector('composerButton')
  const menu = cssSelector('menuSurface')
  return `
${button} {
  transition: scale var(--lumina-press) cubic-bezier(.22, 1, .36, 1);
  transform-origin: center;
}
${button}:active { scale: .96; }
${menu} {
  animation: lumina-menu-enter var(--lumina-menu) ease-out;
}
@keyframes lumina-menu-enter {
  from { opacity: 0; }
  to { opacity: 1; }
}
[data-lumina="on"] .lumina-send-ripple {
  position: fixed; box-sizing: border-box; aspect-ratio: 1; border-radius: 50%; opacity: 0; pointer-events: none;
  z-index: 2147483647; contain: layout style; -webkit-app-region: no-drag;
  --lumina-ripple-tint: var(--dsw-alias-brand-primary-new-colorprimary-new-color, var(--lumina-brand-deepseek));
}
[data-lumina="on"] .lumina-send-ripple::before,
[data-lumina="on"] .lumina-send-ripple::after {
  content: ""; position: absolute; inset: 0; border-radius: 50%; box-sizing: border-box;
  border: 1px solid color-mix(in srgb, var(--lumina-ripple-tint) 56%, transparent);
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--lumina-hi) 28%, transparent);
  opacity: 0; transform: scale(1.05); pointer-events: none;
}
[data-lumina="on"] .lumina-send-ripple[data-active] { opacity: 1; }
[data-lumina="on"] .lumina-send-ripple[data-active]::before {
  animation: lumina-water-ring var(--lumina-ripple-main) cubic-bezier(.16,.65,.3,1) both;
}
[data-lumina="on"] .lumina-send-ripple[data-active]::after {
  animation: lumina-water-echo var(--lumina-ripple-echo) cubic-bezier(.16,.65,.3,1) var(--lumina-ripple-delay) both;
}
@keyframes lumina-water-ring {
  0% { transform: scale(1.05); opacity: .75; }
  24% { opacity: .58; }
  100% { transform: scale(2.2); opacity: 0; }
}
@keyframes lumina-water-echo {
  0% { transform: scale(1.03); opacity: .38; }
  100% { transform: scale(1.95); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  ${button} { transition: none; }
  ${button}:active { scale: 1; }
  ${button}[${PULSE_ATTRIBUTE}] { outline: 1px solid var(--lumina-brand-soft); outline-offset: 2px; }
  ${button}[${PULSE_ATTRIBUTE}], ${menu}, ${menu}::before, ${menu}::after {
    animation: none;
  }
  [data-lumina="on"] .lumina-send-ripple,
  [data-lumina="on"] .lumina-send-ripple::before,
  [data-lumina="on"] .lumina-send-ripple::after {
    animation: none !important;
    opacity: 0;
  }
}
`
}

/** Install visual listeners only: no submitting, cancelling or request state is changed. */
export function installPress(streaming: StreamingState, intensity: Intensity, services: TransferServices = {}): () => void {
  const disposeStyle = installStyle('press', pressCss())
  const ripple = document.createElement('span')
  ripple.className = RIPPLE_CLASS
  ripple.setAttribute('aria-hidden', 'true')
  document.body.append(ripple)
  const tier = SEND_RIPPLE.tiers[intensity]
  const duration = (SEND_RIPPLE.echo + SEND_RIPPLE.delay) * tier
  ripple.style.setProperty('--lumina-ripple-main', `${SEND_RIPPLE.main * tier}ms`)
  ripple.style.setProperty('--lumina-ripple-echo', `${SEND_RIPPLE.echo * tier}ms`)
  ripple.style.setProperty('--lumina-ripple-delay', `${SEND_RIPPLE.delay * tier}ms`)
  let timer: ReturnType<typeof setTimeout> | undefined
  let pulsed: Element | null = null
  let running = document.documentElement.hasAttribute('data-lumina-streaming')
  const clear = () => {
    clearTimeout(timer); timer=undefined
    pulsed?.removeAttribute(PULSE_ATTRIBUTE);pulsed=null
    ripple.removeAttribute('data-active')
  }
  const pulse = (button: HTMLButtonElement, rect: DOMRect) => {
    if(document.documentElement.dataset.lumina!=='on'||document.hidden)return
    clear()
    pulsed=button
    button.setAttribute(PULSE_ATTRIBUTE, '')
    if(!prefersReducedMotion()) {
      const size=Math.max(rect.width,rect.height)
      Object.assign(ripple.style,{width:`${size}px`,height:`${size}px`,left:`${rect.left+(rect.width-size)/2}px`,top:`${rect.top+(rect.height-size)/2}px`})
      void ripple.offsetWidth
      ripple.setAttribute('data-active','')
    }
    timer=setTimeout(clear,prefersReducedMotion()?SEND_RIPPLE.static:duration)
  }
  const unsubscribe=streaming.subscribe(active=>{running=active})
  const release=observeSendFeedback(services,()=>running,pulse,clear)
  return ()=>{release();unsubscribe();clear();ripple.remove();disposeStyle()}
}
