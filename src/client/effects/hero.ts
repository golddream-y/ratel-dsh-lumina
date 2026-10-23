/**
 * M5 · new-session hero entrance.
 *
 * The official conversation hero owns `conversation.hero.brand.mark`. Lumina
 * replaces only that occupant and plays the entrance once per page load; later
 * sessions see the same mark without replaying.
 */

import { HeroMark } from '../brand/artwork.tsx'
import { occupySlot, type SlotRegistryLike } from '../core/slots.ts'
import { installStyle } from '../core/styles.ts'

/** The conversation slot carrying the hero mark. */
const HERO_SLOT = 'conversation.hero.brand.mark'

/** The hero entrance stylesheet. */
export function heroCss(): string {
  return `
.lumina-hero-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.lumina-hero-mark[data-play="true"] {
  animation: lumina-hero-in var(--lumina-hero) cubic-bezier(.22, 1, .36, 1) both;
}

.lumina-hero-mark[data-play="true"] svg {
  animation: lumina-hero-glow var(--lumina-hero-glow) ease-out;
}

/* Our own element: a one-shot brand light over the hero screen. The host DOM
   is never wrapped or restyled, so the entrance cannot fight its layout. */
.lumina-hero-veil {
  position: fixed;
  inset: 0;
  z-index: 30;
  pointer-events: none;
  background: radial-gradient(
    62% 52% at 50% 40%,
    rgba(var(--lumina-brand-rgb), .18),
    rgba(var(--lumina-brand-rgb), .05) 45%,
    transparent 72%
  );
  animation: lumina-hero-veil var(--lumina-hero-glow) ease-out both;
}

@media (prefers-reduced-motion: reduce) {
  .lumina-hero-mark[data-play="true"],
  .lumina-hero-mark[data-play="true"] svg,
  .lumina-hero-veil {
    animation: none;
  }
  .lumina-hero-veil { display: none; }
}
`
}

/**
 * Install the hero mark.
 *
 * @param ctx - the client context carrying the slot registry.
 * @returns a disposer releasing the slot, stylesheet, and marker.
 */
export function installHero(ctx: { slots: SlotRegistryLike }): () => void {
  const disposeStyle = installStyle('hero', heroCss())
  const release = occupySlot(ctx.slots, HERO_SLOT, { priority: -20 }, HeroMark)
  return () => {
    release()
    disposeStyle()
  }
}
