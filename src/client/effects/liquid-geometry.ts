/** Finite liquid geometry in viewport coordinates. No DOM or business state. */
export interface Point { x: number; y: number }
export const TRANSFER_TIME = 1150
export const FLIGHT_START = 710
export const clamp = (value: number) => Math.max(0, Math.min(1, value))
export const smooth = (value: number) => { const p = clamp(value); return p * p * (3 - 2 * p) }
/** Smootherstep: zero velocity and zero acceleration at both ends. */
export const smoother = (value: number) => { const p = clamp(value); return p * p * p * (p * (p * 6 - 15) + 10) }
export const mix = (a: number, b: number, p: number) => a + (b - a) * p

export function liquidFrame(t: number, hub: Point, edge: Point, arrival: Point, landingStart = FLIGHT_START, size = 1) {
  const approach = smooth((t - 220) / 140)
  const absorb = smooth((t - 340) / 110)
  const emerge = smooth((t - 510) / 140)
  const sever = smooth((t - 650) / 60)
  const flight = smooth((t - landingStart) / 240)
  const unfold = clamp((t - landingStart - 240) / 200)
  const baseRadius = 16 * size * smooth((t - 100) / 130)
  const radius = (t < 510 ? baseRadius * (1 - absorb) : 16 * size * emerge) * (1 - smooth(unfold))
  const direction = Math.sign(arrival.x - edge.x) || 1
  const departure = { x: edge.x + 16 * size * emerge * emerge * direction, y: edge.y - size * (24 * emerge + 3 * sever) }
  const x = t < 510 ? mix(hub.x, edge.x, approach)
    : mix(departure.x, arrival.x, flight) + Math.sin(flight * Math.PI) * Math.min(45, Math.abs(arrival.x - departure.x) * .1)
  const y = t < 510 ? mix(hub.y, edge.y + 2, approach)
    : mix(departure.y, arrival.y, flight) - Math.sin(flight * Math.PI) * 46 * size
  const phase = t < 160 ? 'gather' : t < 220 ? 'fuse' : t < 340 ? 'edge-approach'
    : t < 450 ? 'edge-merge' : t < 510 ? 'edge-rest' : t < 650 ? 'emerge'
      : t < landingStart ? 'detach' : flight < 1 ? 'fly' : 'unfold'
  const merging = t >= 310 && t < 450
  const emerging = t > 510 && t < 710
  const baseWidth = merging ? 18 * size * smooth((t - 310) / 40) : 18 * size * emerge * (1 - sever * .65)
  const neckWidth = merging ? Math.min(radius * .72, baseWidth) * .65
    : Math.min(radius * .72, baseWidth) * (1 - sever) * .65
  const surfaceOpacity = smooth((t - 240) / 80) * (1 - smooth((t - 710) / 150))
  const crest = 9 * size * emerge * (1 - sever)
  return { phase, approach, absorb, emerge, sever, flight, unfold, radius, x, y,
    baseWidth, neckWidth, connected: (merging || emerging) && radius > .01 && neckWidth > .01,
    surfaceOpacity, crest }
}
