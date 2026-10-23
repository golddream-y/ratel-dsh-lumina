/** Bounded local star river; state remains owned by the host. */
import { panelMotionBusy } from './panel-budget.ts'
import { createGalaxyPainter } from './session-galaxy-painter.ts'
import { cssSelector } from '../adapter/selector.ts'
import { prefersReducedMotion, watchReducedMotion } from '../core/motion.ts'

export function installSessionGalaxy(): () => void {
  if (typeof ResizeObserver === 'undefined' || typeof IntersectionObserver === 'undefined') return () => {}
  type Scene = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; position: string; w: number; h: number; visible: boolean; exit?: ReturnType<typeof setTimeout>; paint: ReturnType<typeof createGalaxyPainter> }
  const scenes = new Map<HTMLElement, Scene>()
  let frame = 0, scanFrame = 0, disposed = false, lastDraw = 0
  const resize = new ResizeObserver(entries => { for (const entry of entries) { const s = scenes.get(entry.target as HTMLElement); if (s) { s.w = entry.contentRect.width; s.h = entry.contentRect.height } } })
  const intersection = new IntersectionObserver(entries => { for (const entry of entries) { const s = scenes.get(entry.target as HTMLElement); if (s) s.visible = entry.isIntersecting } start() })
  const remove = (row: HTMLElement, s: Scene) => { clearTimeout(s.exit); resize.unobserve(row); intersection.unobserve(row); s.canvas.remove(); row.style.position = s.position; scenes.delete(row) }
  const draw = (now: number) => {
    frame = 0
    if (disposed || document.hidden || prefersReducedMotion()) return
    if (panelMotionBusy(now) && now - lastDraw < 66) { frame = requestAnimationFrame(draw); return }
    lastDraw = now
    let count = 0
    for (const [row, s] of scenes) {
      if (!s.visible || !row.isConnected || !s.w || !s.h || count++ >= 8) continue
      const { ctx: g, canvas: c, w, h } = s, dpr = Math.min(devicePixelRatio || 1, 1.25)
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr) }
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h)
      const rgb = getComputedStyle(row).color.match(/[\d.]+/g)?.map(Number) ?? [0,0,0]
      s.paint(g, w, h, now / 1000 + count * 4.3, (rgb[0]! + rgb[1]! + rgb[2]!) > 420)

    }
    if (count) frame = requestAnimationFrame(draw)
  }
  function start() { if (!disposed && !frame && !document.hidden && !prefersReducedMotion()) frame = requestAnimationFrame(draw) }
  const scan = () => {
    scanFrame = 0
    const rows = new Set<HTMLElement>()
    if (!prefersReducedMotion()) for (const spinner of document.querySelectorAll(cssSelector('sessionRunning'))) { const row = spinner.closest<HTMLElement>(cssSelector('sessionRow')); if (row) rows.add(row) }
    for (const [row, s] of scenes) {
      if (!row.isConnected || prefersReducedMotion()) { remove(row, s); continue }
      if (!rows.has(row) && !s.exit) {
        s.canvas.style.opacity = '0'
        s.exit = setTimeout(() => { remove(row, s) }, 550)
      } else if (rows.has(row) && s.exit) {
        clearTimeout(s.exit); s.exit = undefined; s.canvas.style.opacity = '1'
      }
    }
    for (const row of rows) {
      if (scenes.has(row) || scenes.size >= 24) continue
      const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')
      if (!ctx) continue
      canvas.className = 'lumina-session-galaxy'; canvas.style.opacity = '0'; canvas.setAttribute('aria-hidden', 'true')
      const position = row.style.position
      if (getComputedStyle(row).position === 'static') row.style.position = 'relative'
      scenes.set(row, { canvas, ctx, position, w: row.clientWidth, h: row.clientHeight, visible: false, paint: createGalaxyPainter(scenes.size) })
      row.append(canvas); resize.observe(row); intersection.observe(row)
      // Establish the transparent initial frame before fading to full light.
      canvas.getBoundingClientRect()
      canvas.style.opacity = '1'
    }
    start()
  }
  const schedule = () => { if (!disposed && !scanFrame) scanFrame = requestAnimationFrame(scan) }
  const observer = new MutationObserver(schedule)
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-state'] })
  document.addEventListener('visibilitychange', start)
  const stopMotion = watchReducedMotion(() => { cancelAnimationFrame(frame); frame = 0; schedule() })
  scan()
  return () => { disposed = true; observer.disconnect(); stopMotion(); cancelAnimationFrame(frame); cancelAnimationFrame(scanFrame); for (const [row, s] of scenes) remove(row, s); resize.disconnect(); intersection.disconnect(); document.removeEventListener('visibilitychange', start) }
}
