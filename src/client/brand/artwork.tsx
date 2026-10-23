/**
 * Inline brand artwork.
 *
 * The bundle path cannot read files and must not require Harness Client
 * packages, so the wordmark and whale are rendered from generated path data.
 * Every instance gets a unique id via `useId`; otherwise the mask and gradient
 * references would all point at the first instance.
 */

import { useLayoutEffect, useId, useRef, useState } from 'react'
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
  water?: boolean
  periodic?: boolean
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
export function BrandMark({ size = 24, className, periodic = true, water = periodic }: BrandArtworkProps) {
  const uid = safeId(useId())
  const clipId = `${uid}-whale`
  const bodyId = `${uid}-enamel`
  const lightId = `${uid}-light`
  return (
    <span
      className={['lumina-mark', periodic && 'lumina-whale-periodic', className].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      <svg
        className="lumina-whale-body"
        viewBox={WHALE_VIEWBOX}
        width={size}
        height={size}
        role="presentation"
        focusable="false"
      >
        <defs>
          <linearGradient id={bodyId} x1="0.18" y1="0" x2="0.72" y2="1">
            <stop offset="0" stopColor="var(--lumina-brand-soft)" />
            <stop offset="0.28" stopColor="var(--lumina-brand)" />
            <stop offset="0.62" stopColor="var(--lumina-brand)" />
            <stop offset="1" stopColor="var(--lumina-brand-deep)" />
          </linearGradient>
          <radialGradient id={lightId} cx="28%" cy="18%" r="76%">
            <stop offset="0" stopColor="var(--lumina-hi)" stopOpacity=".62" />
            <stop offset=".35" stopColor="var(--lumina-hi)" stopOpacity=".12" />
            <stop offset=".72" stopColor="var(--lumina-hi)" stopOpacity="0" />
          </radialGradient>
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
          pathLength={1}
          clipPath={`url(#${clipId})`}
          fill={`url(#${bodyId})`}
          stroke="var(--lumina-brand-deep)"
          strokeWidth=".16"
        />
        <path d={WHALE_PATH} className="lumina-mark-light" pathLength={1}
          clipPath={`url(#${clipId})`} fill={`url(#${lightId})`}
          stroke="var(--lumina-brand-soft)" strokeOpacity=".48" strokeWidth=".16" />
      </svg>
      {water && <svg className="lumina-whale-water" viewBox="0 0 52 41" width={size} height={size} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${uid}-water-tone`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--lumina-brand)" stopOpacity=".85" />
            <stop offset=".45" stopColor="var(--lumina-brand-soft)" stopOpacity=".75" />
            <stop offset="1" stopColor="var(--lumina-brand)" stopOpacity=".9" />
          </linearGradient>
          <clipPath id={`${uid}-water-clip`}>
            <path d="M13.5 7 C14 2 12.5 -1 13 -3 C13 -5 9 -5 10 -7 C11 -9 14 -7 15 -5 C16 -8 19 -9 20 -7 C21 -5 17 -5 17 -3 C16 -1 17 3 16.5 7 Z" />
          </clipPath>
        </defs>
        <g className="lumina-water-jet" clipPath={`url(#${uid}-water-clip)`}>
          <rect x="9" y="-10" width="13" height="18" fill={`url(#${uid}-water-tone)`} />
          <g className="lumina-water-flow" fill="var(--lumina-hi)" opacity=".7">
            <ellipse cx="15" cy="5" rx=".7" ry="2.5" />
            <ellipse cx="14.5" cy="12" rx=".6" ry="2" />
            <ellipse cx="15.5" cy="19" rx=".7" ry="2.5" />
          </g>
        </g>
        <g fill="var(--lumina-brand-soft)">
          <ellipse className="lumina-water-fall lumina-water-fall-left" cx="11" cy="-6" rx="1" ry="1.5" />
          <ellipse className="lumina-water-fall lumina-water-fall-right" cx="19" cy="-7" rx=".9" ry="1.4" />
        </g>
      </svg>}
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

/** The sessions whose hero entrance already played. */
const heroPlayed = new Set<string>()

/**
 * Whether the hero entrance should play for a session.
 *
 * Playing once per page load loses the entrance for every later new session:
 * the home screen consumes it during startup. The key is the session, so every
 * new session gets its entrance and going back to one does not replay it.
 *
 * @param sessionKey - the current conversation session id, or '' when unknown.
 * @param played - the played set (injectable for tests).
 * @returns whether to play.
 */
export function heroPlayFor(sessionKey: string, played: Set<string> = heroPlayed): boolean {
  if (sessionKey === '') return true
  if (played.has(sessionKey)) return false
  played.add(sessionKey)
  return true
}

/** Committed playback: render retries cannot consume a session's entrance. */
export function HeroMark({ size = 34, className, sessionKey = '', onEntrance }: BrandArtworkProps & {
  sessionKey?: string
  onEntrance?: (mark: HTMLElement) => void
}) {
  const [play, setPlay] = useState(false)
  const element = useRef<HTMLSpanElement>(null)
  const claimed = useRef<boolean | null>(null)
  useLayoutEffect(() => {
    if (claimed.current === null) claimed.current = heroPlayFor(sessionKey)
    if (!claimed.current) return
    setPlay(true)
    if (element.current) onEntrance?.(element.current)
  }, [sessionKey, onEntrance])
  return (
    <span ref={element} className={['lumina-hero-mark', className].filter(Boolean).join(' ')} aria-hidden="true">
      <span className="lumina-hero-art" data-play={play ? 'true' : undefined}><BrandMark size={size} periodic={false} water /></span>
    </span>
  )
}
