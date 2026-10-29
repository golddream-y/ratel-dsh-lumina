import { SESSION_CLOUD_RESOURCE_BUDGET } from '../core/performance.ts'
import { CLOUD_VERTEX_SHADER, CLOUD_FRAGMENT_SHADER } from './session-cloud-volume-shader.ts'

export interface SessionCloudPalette { cool: string; warm: string; deep: string; light: string }
export interface SessionCloudPainter {
  draw: (context: CanvasRenderingContext2D, x: number, y: number, size: number, time: number, opacity: number) => boolean
  setPalette: (palette: SessionCloudPalette) => void
}
const DEFAULT_PALETTE: SessionCloudPalette = { cool: '#2563eb', warm: '#ff3b30', deep: '#102c82', light: '#ffffff' }
type Budget = { readonly cloudResolution: number; readonly cloudSteps: number }
type Color = readonly [number, number, number]
type Colors = { cool: Color; warm: Color; deep: Color }
type Renderer = {
  canvas: HTMLCanvasElement
  gl: WebGL2RenderingContext
  program: WebGLProgram
  shaders: WebGLShader[]
  uniforms: Record<'time' | 'steps' | 'cool' | 'warmColor' | 'deep', WebGLUniformLocation | null>
  lost: boolean
}
let shared: Renderer | null = null
let unavailable = false

function parseColor(value: string, fallback: string): Color {
  const v = value.trim()
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(v)) {
    const hex = v.length === 4 ? [...v.slice(1)].map(c => c + c).join('') : v.slice(1)
    const n = Number.parseInt(hex, 16)
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]
  }
  const rgb = v.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i)
  if (rgb) return [Number(rgb[1]) / 255, Number(rgb[2]) / 255, Number(rgb[3]) / 255]
  return parseColor(fallback, '#000000')
}
function colors(p: SessionCloudPalette): Colors {
  return { cool: parseColor(p.cool, DEFAULT_PALETTE.cool), warm: parseColor(p.warm, DEFAULT_PALETTE.warm), deep: parseColor(p.deep, DEFAULT_PALETTE.deep) }
}

function renderer(): Renderer | null {
  if (shared) return shared.lost ? null : shared
  if (unavailable) return null
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: false, depth: false, stencil: false })
  if (!gl) { unavailable = true; return null }
  const shaders: WebGLShader[] = []
  let program: WebGLProgram | null = null
  try {
    for (const [type, source] of [[gl.VERTEX_SHADER, CLOUD_VERTEX_SHADER], [gl.FRAGMENT_SHADER, CLOUD_FRAGMENT_SHADER]] as const) {
      const shader = gl.createShader(type)
      if (!shader) throw new Error('Cloud shader allocation failed')
      shaders.push(shader)
      gl.shaderSource(shader, source); gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Cloud shader compilation failed')
    }
    program = gl.createProgram()
    if (!program) throw new Error('Cloud program allocation failed')
    shaders.forEach(s => gl.attachShader(program!, s))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Cloud program link failed')
    const uniforms = Object.fromEntries(['time', 'steps', 'cool', 'warmColor', 'deep'].map(key => [key, gl.getUniformLocation(program!, key)])) as Renderer['uniforms']
    const resource: Renderer = { canvas, gl, program, shaders, uniforms, lost: false }
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault() // Opt in to browser restoration; never draw invalid resources.
      resource.lost = true
    })
    canvas.addEventListener('webglcontextrestored', () => {
      if (shared !== resource) return
      gl.deleteProgram(program); shaders.forEach(shader => gl.deleteShader(shader))
      shared = null // Uniforms and programs are invalid after restoration.
    })
    shared = resource
    return resource
  } catch (error) {
    if (program) gl.deleteProgram(program)
    shaders.forEach(s => gl.deleteShader(s))
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    unavailable = true
    console.warn('[ratel-lumina] running cloud unavailable', error)
    return null
  }
}

/** The session effect owns this shared target; it has no animation clock or DOM overlay. */
export function clearSessionCloudCache(): void {
  if (shared) {
    const { gl, program, shaders, canvas } = shared
    gl.deleteProgram(program); shaders.forEach(s => gl.deleteShader(s))
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    canvas.width = canvas.height = 1
  }
  shared = null
  unavailable = false
}

/** Retry only at a lifecycle boundary, never once per failed frame. */
export function recoverSessionCloudCache(): void {
  if (unavailable || shared?.lost || shared?.gl.isContextLost()) clearSessionCloudCache()
}

export function createSessionCloudPainter(seed = 0, budget: Budget, initialPalette = DEFAULT_PALETTE): SessionCloudPainter {
  let palette = colors(initialPalette)
  return {
    setPalette(next) { palette = colors(next) },
    draw(context, x, y, size, time, opacity) {
      if (size <= 0 || opacity <= .002) return false
      const resource = renderer()
      if (!resource) return false
      const { gl, canvas, program, uniforms } = resource
      const resolution = Math.min(SESSION_CLOUD_RESOURCE_BUDGET.maxTextureSize, Math.max(16, Math.round(budget.cloudResolution)))
      if (canvas.width !== resolution) canvas.width = canvas.height = resolution
      gl.viewport(0, 0, resolution, resolution)
      gl.useProgram(program)
      gl.uniform1f(uniforms.time, time + seed * .71 + 4)
      gl.uniform1i(uniforms.steps, budget.cloudSteps)
      gl.uniform3f(uniforms.cool, ...palette.cool)
      gl.uniform3f(uniforms.warmColor, ...palette.warm)
      gl.uniform3f(uniforms.deep, ...palette.deep)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (gl.isContextLost()) return false
      // The approved volume occupies 57% of the full texture diameter, including a soft halo.
      const width = size / .57
      context.save()
      context.globalAlpha *= opacity
      context.drawImage(canvas, x - width / 2, y - width / 2, width, width)
      context.restore()
      return true
    },
  }
}

export function readSessionCloudPalette(root: HTMLElement = document.documentElement): SessionCloudPalette {
  const style = getComputedStyle(root)
  return {
    cool: style.getPropertyValue('--lumina-brand-ratel').trim() || DEFAULT_PALETTE.cool,
    warm: style.getPropertyValue('--lumina-brand-deepseek').trim() || DEFAULT_PALETTE.warm,
    deep: style.getPropertyValue('--lumina-brand-deep').trim() || DEFAULT_PALETTE.deep,
    light: style.getPropertyValue('--lumina-hi').trim() || DEFAULT_PALETTE.light,
  }
}
