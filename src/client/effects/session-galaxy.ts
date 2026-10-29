import { requestMotionFrame, cancelMotionFrame } from '../core/frame-scheduler.ts'
import { renderBudget } from '../core/performance.ts'
/** Bounded local star river and running cloud; state remains owned by the host. */
import { createGalaxyPainter } from './session-galaxy-painter.ts'
import {
  createSessionCloudPainter,
  clearSessionCloudCache,
  recoverSessionCloudCache,
  readSessionCloudPalette,
  type SessionCloudPainter,
} from './session-cloud-painter.ts'
import { cssSelector } from '../adapter/selector.ts'
import { prefersReducedMotion, watchReducedMotion } from '../core/motion.ts'

type ScenePhase = 'enter' | 'running' | 'exit'
interface Scene {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  spinner: SVGSVGElement | null
  position: string
  x: number
  y: number
  cloudSize: number
  w: number
  h: number
  visible: boolean
  dark: boolean
  painted: boolean
  adopted: boolean
  geometryReady: boolean
  phase: ScenePhase
  envelope: number
  motionTime: number
  exit?: ReturnType<typeof setTimeout>
  paint: ReturnType<typeof createGalaxyPainter>
  cloud: SessionCloudPainter
}

const READY_ATTRIBUTE = 'data-lumina-session-cloud-ready'

function stableSeed(row: HTMLElement): number {
  const key = row.dataset.rowKey ?? row.id ?? ''
  let seed = 2166136261
  for (const character of key) {
    seed ^= character.codePointAt(0) ?? 0
    seed = Math.imul(seed, 16777619)
  }
  return Math.abs(seed % 997) / 100
}

export function installSessionGalaxy(): () => void {
  if (typeof ResizeObserver === 'undefined' || typeof IntersectionObserver === 'undefined') return () => {}

  const scenes = new Map<HTMLElement, Scene>()
  const iconRows = new WeakMap<Element, HTMLElement>()
  let frame = 0
  let scanQueued = false
  let disposed = false
  let lastDraw = 0
  let paletteFrame = 0

  const isDark = (row: HTMLElement) => {
    const rgb = getComputedStyle(row).color.match(/[\d.]+/g)?.map(Number) ?? [0, 0, 0]
    return rgb[0]! + rgb[1]! + rgb[2]! > 420
  }

  const releaseHost = (scene: Scene) => {
    scene.adopted = false
    scene.spinner?.removeAttribute(READY_ATTRIBUTE)
  }

  const measureCloud = (row: HTMLElement, scene: Scene): boolean => {
    scene.geometryReady = false
    void row
    const spinner = scene.spinner
    if (!spinner?.isConnected || !spinner.matches(cssSelector('sessionRunning'))) {
      releaseHost(scene)
      return false
    }
    const iconRect = spinner.getBoundingClientRect()
    const canvasRect = scene.canvas.getBoundingClientRect()
    if (!iconRect.width || !iconRect.height || !canvasRect.width || !canvasRect.height) {
      releaseHost(scene)
      return false
    }
    const x = (iconRect.left + iconRect.width / 2 - canvasRect.left) * scene.w / canvasRect.width
    const y = (iconRect.top + iconRect.height / 2 - canvasRect.top) * scene.h / canvasRect.height
    const size = Math.min(Math.max(iconRect.width, iconRect.height, 11), 16)
    const haloRadius = size * .86
    if (x - haloRadius < 0 || x + haloRadius > scene.w || y - haloRadius < 0 || y + haloRadius > scene.h) {
      releaseHost(scene)
      return false
    }
    scene.visible = canvasRect.bottom > 0 && canvasRect.right > 0
      && canvasRect.top < innerHeight && canvasRect.left < innerWidth
    scene.x = x
    scene.y = y
    scene.cloudSize = size
    scene.geometryReady = true
    return true
  }

  const invalidateGeometry = () => {
    for (const [row, scene] of scenes) measureCloud(row, scene)
    start()
  }

  const refreshPalette = () => {
    if (disposed || paletteFrame) return
    paletteFrame = requestAnimationFrame(() => {
      paletteFrame = 0
      const palette = readSessionCloudPalette()
      for (const scene of scenes.values()) {
        scene.dark = isDark(scene.canvas.parentElement as HTMLElement)
        scene.cloud.setPalette(palette)
      }
    })
  }
  const paletteObserver = new MutationObserver(refreshPalette)
  paletteObserver.observe(document.documentElement, { attributes: true })
  paletteObserver.observe(document.body, { attributes: true })
  paletteObserver.observe(document.head, { childList: true, subtree: true, characterData: true, attributes: true })
  const themeMedia = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null
  themeMedia?.addEventListener('change', refreshPalette)

  const resetClock = () => { lastDraw = 0 }
  window.addEventListener('blur', resetClock)
  document.addEventListener('visibilitychange', resetClock)
  window.addEventListener('resize', invalidateGeometry, { passive: true })
  window.addEventListener('scroll', invalidateGeometry, { passive: true, capture: true })

  const resize = new ResizeObserver(entries => {
    for (const entry of entries) {
      const row = entry.target instanceof HTMLElement
        ? entry.target
        : iconRows.get(entry.target)
      const scene = row ? scenes.get(row) : undefined
      if (!scene) continue
      if (entry.target === row) {
        scene.w = entry.contentRect.width
        scene.h = entry.contentRect.height
      }
      scene.geometryReady = false
      measureCloud(row!, scene)
    }
    start()
  })
  const intersection = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const scene = scenes.get(entry.target as HTMLElement)
      if (scene) {
        scene.visible = entry.isIntersecting
        if (!scene.visible) clearFrame(scene)
      }
    }
    start()
  })

  const remove = (row: HTMLElement, scene: Scene) => {
    clearTimeout(scene.exit)
    releaseHost(scene)
    scene.geometryReady = false
    resize.unobserve(row)
    if (scene.spinner) resize.unobserve(scene.spinner)
    intersection.unobserve(row)
    scene.canvas.remove()
    row.style.position = scene.position
    scenes.delete(row)
    if (!scenes.size) clearSessionCloudCache()
  }

  const clearFrame = (scene: Scene) => {
    if (!scene.painted) return
    scene.ctx.clearRect(0, 0, scene.w, scene.h)
    scene.painted = false
    releaseHost(scene)
  }

  const draw = (now: number) => {
    frame = 0
    if (disposed || document.hidden || prefersReducedMotion()) return
    const delta = lastDraw ? Math.min(100, now - lastDraw) / 1000 : 0
    lastDraw = now
    let count = 0
    for (const [row, scene] of scenes) {
      if (!scene.visible || !row.isConnected || !scene.w || !scene.h) continue
      if (count >= 8) {
        clearFrame(scene)
        continue
      }
      count++
      scene.motionTime += delta
      if (scene.phase === 'exit') scene.envelope = Math.max(0, scene.envelope - delta / .42)
      else {
        scene.phase = scene.envelope < .999 ? 'enter' : 'running'
        scene.envelope = Math.min(1, scene.envelope + delta / .24)
      }
      if (scene.envelope <= 0) {
        remove(row, scene)
        continue
      }

      const { ctx: context, canvas, w, h } = scene
      const dpr = Math.min(devicePixelRatio || 1, renderBudget().galaxyDpr)
      const pixelWidth = Math.round(w * dpr)
      const pixelHeight = Math.round(h * dpr)
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      context.clearRect(0, 0, w, h)

      context.globalAlpha = scene.envelope
      scene.paint(context, w, h, scene.motionTime, scene.dark)
      context.globalAlpha = 1
      if (scene.geometryReady && scene.cloudSize > 0) {
        const cloudReady = scene.cloud.draw(
          context,
          scene.x,
          scene.y,
          scene.cloudSize,
          scene.motionTime,
          scene.envelope,
        )
        scene.painted = true
        if (!cloudReady) releaseHost(scene)
        if (cloudReady && !scene.adopted) {
          scene.spinner!.setAttribute(READY_ATTRIBUTE, '')
          scene.adopted = true
        }
      } else {
        clearFrame(scene)
      }
    }
    if (count) frame = requestMotionFrame(draw, 'background')
  }

  function start() {
    if (!disposed && !frame && !document.hidden && !prefersReducedMotion()) {
      frame = requestMotionFrame(draw, 'background')
    }
  }

  const scan = () => {
    scanQueued = false
    if (disposed) return
    let handover = false
    const runningRows = new Map<HTMLElement, SVGSVGElement>()
    if (!prefersReducedMotion()) {
      for (const spinner of document.querySelectorAll<SVGSVGElement>(cssSelector('sessionRunning'))) {
        const row = spinner.closest<HTMLElement>(cssSelector('sessionRow'))
        if (row) runningRows.set(row, spinner)
      }
    }

    for (const [row, scene] of scenes) {
      if (!row.isConnected || prefersReducedMotion()) {
        remove(row, scene)
        continue
      }
      const spinner = runningRows.get(row)
      if (spinner && scene.spinner !== spinner) {
        handover = true
        releaseHost(scene)
        if (scene.spinner) resize.unobserve(scene.spinner)
        scene.spinner = spinner
        iconRows.set(spinner, row)
        resize.observe(spinner)
        measureCloud(row, scene)
      }
      if (!spinner && scene.phase !== 'exit') {
        const state = row.querySelector<SVGSVGElement>('svg[data-state]')?.dataset.state
        if (state && state !== 'ongoing') {
          remove(row, scene)
          continue
        }
        scene.phase = 'exit'
        clearTimeout(scene.exit)
        scene.exit = setTimeout(() => remove(row, scene), 500)
      } else if (spinner && scene.phase === 'exit') {
        clearTimeout(scene.exit)
        scene.exit = undefined
        scene.phase = 'enter'
        handover = true
      }
    }

    for (const [row, spinner] of runningRows) {
      if (scenes.has(row) || scenes.size >= 24) continue
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) continue
      canvas.className = 'lumina-session-galaxy'
      canvas.setAttribute('aria-hidden', 'true')
      const position = row.style.position
      if (getComputedStyle(row).position === 'static') row.style.position = 'relative'
      const scene: Scene = {
        canvas,
        ctx: context,
        spinner,
        position,
        x: 0,
        y: 0,
        cloudSize: 0,
        w: row.clientWidth,
        h: row.clientHeight,
        visible: false,
        dark: isDark(row),
        painted: false,
        adopted: false,
        phase: 'enter',
        envelope: .35,
        motionTime: 0,
        paint: createGalaxyPainter(scenes.size, renderBudget()),
        geometryReady: false,
        cloud: createSessionCloudPainter(stableSeed(row), renderBudget(), readSessionCloudPalette()),
      }
      handover = true
      scenes.set(row, scene)
      row.append(canvas)
      iconRows.set(spinner, row)
      resize.observe(row)
      resize.observe(spinner)
      intersection.observe(row)
      measureCloud(row, scene)
    }
    // MutationObserver runs before paint: transfer the first frame in this checkpoint.
    // Later frames remain owned by the shared background scheduler.
    if (handover && !document.hidden && !prefersReducedMotion()) {
      cancelMotionFrame(frame)
      frame = 0
      draw(performance.now())
    } else start()
  }

  const schedule = () => {
    if (!disposed && !scanQueued) {
      scanQueued = true
      queueMicrotask(scan)
    }
  }
  const observer = new MutationObserver(records => {
    const rowSelector = cssSelector('sessionRow')
    const changed = records.some(record => {
      if (record.type === 'childList') {
        const nodes = [...record.addedNodes, ...record.removedNodes]
        if (nodes.length && nodes.every(node => node instanceof HTMLCanvasElement && node.classList.contains('lumina-session-galaxy'))) return false
      }
      if (record.target instanceof Element && record.target.closest(rowSelector)) return true
      return [...record.addedNodes].some(node => node instanceof Element
        && (node.matches(rowSelector) || node.querySelector(rowSelector)))
    })
    if (changed || [...scenes.keys()].some(row => !row.isConnected)) schedule()
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-state'],
  })
  const resume = () => {
    lastDraw = 0
    if (disposed || document.hidden || prefersReducedMotion()) return
    recoverSessionCloudCache()
    invalidateGeometry()
    schedule()
  }
  window.addEventListener('focus', resume)
  window.addEventListener('pageshow', resume)
  document.addEventListener('visibilitychange', resume)
  const stopMotion = watchReducedMotion(() => {
    cancelMotionFrame(frame)
    frame = 0
    schedule()
  })
  scan()

  return () => {
    disposed = true
    observer.disconnect()
    paletteObserver.disconnect()
    themeMedia?.removeEventListener('change', refreshPalette)
    cancelAnimationFrame(paletteFrame)
    window.removeEventListener('blur', resetClock)
    window.removeEventListener('resize', invalidateGeometry)
    window.removeEventListener('scroll', invalidateGeometry, { capture: true } as EventListenerOptions)
    document.removeEventListener('visibilitychange', resetClock)
    stopMotion()
    cancelMotionFrame(frame)
    scanQueued = false
    for (const [row, scene] of scenes) remove(row, scene)
    resize.disconnect()
    intersection.disconnect()
    clearSessionCloudCache()
    window.removeEventListener('focus', resume)
    window.removeEventListener('pageshow', resume)
    document.removeEventListener('visibilitychange', resume)
  }
}
