/** One source for rendering budgets and the settings explanations. */
export const PERFORMANCE_PROFILES = ['performance', 'balanced', 'quality', 'ultra'] as const
export type PerformanceProfile = typeof PERFORMANCE_PROFILES[number]
export interface RenderBudget {
  readonly backgroundFps: number
  readonly interactionFps: number
  readonly galaxyDpr: number
  readonly stars: number
  readonly filaments: number
  readonly ribbonDpr: number
  readonly ribbonPixels: number
  readonly ribbonSamples: 1 | 4
  readonly ribbonColumns: number
  readonly heroParticles: number
  readonly heroDpr: number
}
export const RENDER_BUDGETS: Readonly<Record<PerformanceProfile, Readonly<RenderBudget>>> = {
  performance: { backgroundFps: 30, interactionFps: 60, galaxyDpr: 1, stars: 28, filaments: 6, ribbonDpr: 1, ribbonPixels: 1_000_000, ribbonSamples: 1, ribbonColumns: 128, heroParticles: 1000, heroDpr: 1 },
  balanced: { backgroundFps: 40, interactionFps: 60, galaxyDpr: 1.25, stars: 44, filaments: 10, ribbonDpr: 1.5, ribbonPixels: 1_600_000, ribbonSamples: 4, ribbonColumns: 192, heroParticles: 1600, heroDpr: 1.5 },
  quality: { backgroundFps: 60, interactionFps: 90, galaxyDpr: 1.5, stars: 56, filaments: 12, ribbonDpr: 2, ribbonPixels: 2_400_000, ribbonSamples: 4, ribbonColumns: 256, heroParticles: 2400, heroDpr: 1.5 },
  ultra: { backgroundFps: 90, interactionFps: 120, galaxyDpr: 2, stars: 72, filaments: 14, ribbonDpr: 2, ribbonPixels: 3_200_000, ribbonSamples: 4, ribbonColumns: 320, heroParticles: 3000, heroDpr: 2 },
}
export function readPerformanceProfile(value: unknown): PerformanceProfile {
  return PERFORMANCE_PROFILES.includes(value as PerformanceProfile) ? value as PerformanceProfile : 'balanced'
}
let current: Readonly<RenderBudget> = RENDER_BUDGETS.balanced
export const renderBudget = () => current
export function setRenderBudget(profile: PerformanceProfile) { current = RENDER_BUDGETS[profile] }
