/**
 * Inline brand artwork.
 *
 * The bundle path cannot read files and must not require Harness Client
 * packages, so the wordmark and whale are rendered from generated path data.
 * Every instance gets a unique id via `useId`; otherwise the mask and gradient
 * references would all point at the first instance.
 */

import { useId } from 'react'
import {
  BADGE_PATHS,
  BADGE_RECT,
  WHALE_CLIP,
  WHALE_PATH,
  WHALE_VIEWBOX,
  WORD_PATHS,
  WORD_VIEWBOX,
} from './generated.tsx'

/** Presentation props supplied by the slot owners. */
export interface BrandArtworkProps {
  /** Square edge for the mark. */
  size?: number
  /** Extra class supplied by the host slot owner. */
  className?: string
}

/**
 * Turn the React id into a valid SVG fragment identifier.
 *
 * @param id - the id from `useId`.
 * @returns a safe id fragment.
 */
function safeId(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_-]/g, '')
  return cleaned.length > 0 ? cleaned : 'lumina'
}

/**
 * The whale mark.
 *
 * @param props - size and optional host class.
 * @returns the mark element.
 */
export function BrandMark({ size = 24, className }: BrandArtworkProps) {
  const uid = safeId(useId())
  const clipId = `${uid}-whale`
  return (
    <span
      className={['lumina-mark', className].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      <svg
        viewBox={WHALE_VIEWBOX}
        width={size}
        height={size}
        role="presentation"
        focusable="false"
      >
        <defs>
          <clipPath id={clipId}>
            <rect
              x={WHALE_CLIP.x}
              y={WHALE_CLIP.y}
              width={WHALE_CLIP.width}
              height={WHALE_CLIP.height}
            />
          </clipPath>
        </defs>
        <path
          d={WHALE_PATH}
          clipPath={`url(#${clipId})`}
          style={{ fill: 'var(--lumina-brand)' }}
        />
      </svg>
    </span>
  )
}

/**
 * The wordmark plus the HARNESS badge.
 *
 * @param props - optional host class.
 * @returns the wordmark element.
 */
export function BrandName({ className }: BrandArtworkProps) {
  const uid = safeId(useId())
  const wordId = `${uid}-word`
  const bandId = `${uid}-band`
  const maskId = `${uid}-mask`
  const badgeClipId = `${uid}-badge`

  return (
    <span className={['lumina-name', className].filter(Boolean).join(' ')}>
      <svg
        viewBox={WORD_VIEWBOX}
        className="lumina-name-svg"
        role="presentation"
        focusable="false"
      >
        <defs>
          <linearGradient
            id={wordId}
            x1="105.84"
            y1="0"
            x2="284.92"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" style={{ stopColor: 'var(--dsw-alias-label-primary)' }} />
            <stop offset="0.2" style={{ stopColor: 'var(--lumina-brand-deep)' }} />
            <stop offset="0.36" style={{ stopColor: 'var(--lumina-brand-soft)' }} />
            <stop offset="0.5" style={{ stopColor: 'var(--lumina-brand)' }} />
            <stop offset="0.64" style={{ stopColor: 'var(--lumina-brand-soft)' }} />
            <stop offset="0.8" style={{ stopColor: 'var(--lumina-brand-deep)' }} />
            <stop offset="1" style={{ stopColor: 'var(--dsw-alias-label-primary)' }} />
          </linearGradient>

          <linearGradient id={bandId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--lumina-brand-soft)" stopOpacity="0" />
            <stop offset="0.26" stopColor="var(--lumina-brand-soft)" stopOpacity="0.42" />
            <stop offset="0.46" stopColor="#fff" stopOpacity="0.85" />
            <stop offset="0.54" stopColor="#fff" stopOpacity="0.85" />
            <stop offset="0.74" stopColor="var(--lumina-brand-soft)" stopOpacity="0.42" />
            <stop offset="1" stopColor="var(--lumina-brand-soft)" stopOpacity="0" />
          </linearGradient>

          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="476"
            height="98"
          >
            {WORD_PATHS.map((path, index) => (
              <path key={`${maskId}-${index}`} d={path} fill="#fff" />
            ))}
          </mask>

          <clipPath id={badgeClipId}>
            <rect
              x={BADGE_RECT.x}
              y={BADGE_RECT.y}
              width={BADGE_RECT.width}
              height={BADGE_RECT.height}
              rx={BADGE_RECT.rx}
            />
          </clipPath>
        </defs>

        {WORD_PATHS.map((path, index) => (
          <path key={`${wordId}-${index}`} d={path} fill={`url(#${wordId})`} />
        ))}

        <g mask={`url(#${maskId})`}>
          <g className="lumina-shine">
            <rect x="9.84" y="22" width="96" height="56" fill={`url(#${bandId})`} />
          </g>
        </g>

        <rect
          x={BADGE_RECT.x}
          y={BADGE_RECT.y}
          width={BADGE_RECT.width}
          height={BADGE_RECT.height}
          rx={BADGE_RECT.rx}
          style={{ fill: 'var(--dsw-alias-label-primary)' }}
        />
        <g clipPath={`url(#${badgeClipId})`}>
          {BADGE_PATHS.map((path, index) => (
            <path
              key={`${badgeClipId}-${index}`}
              d={path}
              style={{ fill: 'var(--dsw-alias-label-primary-inverted)' }}
            />
          ))}
        </g>
      </svg>
    </span>
  )
}

/** The hero entrance plays once per page load. */
let heroPlayed = false

/**
 * The hero occurrence of the mark.
 *
 * @param props - size and host class.
 * @returns the hero mark element.
 */
export function HeroMark({ size = 34, className }: BrandArtworkProps) {
  const play = !heroPlayed
  heroPlayed = true
  return (
    <span
      className={['lumina-hero-mark', className].filter(Boolean).join(' ')}
      data-play={play ? 'true' : undefined}
      aria-hidden="true"
    >
      <BrandMark size={size} />
    </span>
  )
}
