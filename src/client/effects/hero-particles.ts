import { requestMotionFrame, cancelMotionFrame } from '../core/frame-scheduler.ts'
import { renderBudget } from '../core/performance.ts'
/** Native particle assembly. Visual reference: React Bits Particle Text; no upstream code. */
import { isGlyphDecoration, composerEditors } from '../adapter/targets.ts'
import { prefersReducedMotion } from '../core/motion.ts'



/** A small palette permits one Canvas fill per color instead of per particle. */
export function particleColor(red: number, green: number, blue: number): string {
  const quantize = (value: number) => Math.min(255, Math.round(value / 64) * 64)
  return `rgb(${quantize(red)},${quantize(green)},${quantize(blue)})`
}

export interface Particle { x: number; y: number; dx: number; dy: number; delay: number; color: string; size: number }

/** Deterministic scatter keeps replay evidence reproducible. */
export function particleOffset(index: number): { dx: number; dy: number; delay: number } {
  const random = (salt: number) => { const n = Math.sin((index + 1) * salt) * 43758.5453; return n - Math.floor(n) }
  const angle = random(12.9898) * Math.PI * 2
  const radius = 24 + random(78.233) * 85
  return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius * .65, delay: random(39.425) * .2 }
}

export function assemblyProgress(time: number, delay: number): number {
  const p = Math.max(0, Math.min(1, (time - delay) / (1 - delay)))
  return 1 - Math.pow(1 - p, 3)
}

/** Draw visible host text using DOM ranges, without copying interactive elements. */
function paintText(card: HTMLElement, ctx: CanvasRenderingContext2D, box: DOMRect): void {
  const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT)
  let budget = 700
  for (let node = walker.nextNode(); node && budget > 0; node = walker.nextNode()) {
    const text = node as Text
    const parent = text.parentElement
    if (!parent || isGlyphDecoration(parent) || parent.closest('canvas, script, style')) continue
    const style = getComputedStyle(parent)
    if (style.display === 'none' || style.visibility === 'hidden' || !text.data.trim()) continue
    ctx.font = style.font
    ctx.fillStyle = style.color
    ctx.textBaseline = 'middle'
    for (const glyph of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text.data)) {
      if (budget-- <= 0) break
      if (!glyph.segment.trim()) continue
      const range = document.createRange()
      range.setStart(text, glyph.index)
      range.setEnd(text, glyph.index + glyph.segment.length)
      const rect = range.getBoundingClientRect()
      if (!rect.width || !rect.height || rect.left < box.left || rect.right > box.right || rect.top < box.top || rect.bottom > box.bottom) continue
      ctx.fillText(glyph.segment, rect.left - box.left, rect.top - box.top + rect.height / 2)
    }
  }
}

/** Paint native control icons into the sampling surface, with their own SVG transforms. */
function paintIcons(card: HTMLElement, ctx: CanvasRenderingContext2D, box: DOMRect): void {
  for (const element of [...card.querySelectorAll<SVGGraphicsElement>('svg path, svg circle, svg rect, svg line, svg polyline')].slice(0, 64)) {
    if (element.closest('defs, clipPath, mask')) continue
    const matrix = element.getScreenCTM()
    if (!matrix) continue
    const style = getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden') continue
    const path = new Path2D(element.tagName === 'path' ? element.getAttribute('d') ?? '' : undefined)
    if (element instanceof SVGCircleElement) path.arc(element.cx.baseVal.value, element.cy.baseVal.value, element.r.baseVal.value, 0, Math.PI * 2)
    if (element instanceof SVGRectElement) path.roundRect(element.x.baseVal.value, element.y.baseVal.value, element.width.baseVal.value, element.height.baseVal.value, element.rx.baseVal.value)
    if (element instanceof SVGLineElement) { path.moveTo(element.x1.baseVal.value, element.y1.baseVal.value); path.lineTo(element.x2.baseVal.value, element.y2.baseVal.value) }
    if (element instanceof SVGPolylineElement) {
      for (let i = 0; i < element.points.numberOfItems; i++) {
        const p = element.points.getItem(i)
        if (i === 0) path.moveTo(p.x, p.y); else path.lineTo(p.x, p.y)
      }
    }
    ctx.save()
    ctx.setTransform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e - box.left, matrix.f - box.top)
    if (style.fill !== 'none') { ctx.fillStyle = style.fill; ctx.fill(path) }
    if (style.stroke !== 'none') {
      ctx.strokeStyle = style.stroke; ctx.lineWidth = parseFloat(style.strokeWidth) || 1.5
      ctx.lineCap = style.strokeLinecap as CanvasLineCap; ctx.lineJoin = style.strokeLinejoin as CanvasLineJoin; ctx.stroke(path)
    }
    ctx.restore()
  }
}

/** Start once in a local coordinate system; return an immediate, idempotent reveal. */
export function assembleComposer(card: HTMLElement, duration = 1100, onComplete: () => void = () => {}): () => void {
  const skip = () => { onComplete(); return () => {} }
  if (prefersReducedMotion() || composerEditors(card.ownerDocument).find(editor => card.contains(editor))?.textContent?.trim()) return skip()
  const budget = renderBudget(), MAX_PARTICLES = budget.heroParticles
  const box = card.getBoundingClientRect()
  if (box.width < 80 || box.height < 40 || box.width > 2400 || box.height > 700) return skip()
  const canvas = document.createElement('canvas')
  const sample = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const paint = sample.getContext('2d', { willReadFrequently: true })
  if (!ctx || !paint) return skip()
  const w = Math.ceil(box.width), h = Math.ceil(box.height), pad = 120
  sample.width = w; sample.height = h
  const style = getComputedStyle(card)
  const rootStyle = getComputedStyle(document.documentElement)
  const warm = rootStyle.getPropertyValue('--lumina-brand').trim() || style.color
  const cool = rootStyle.getPropertyValue('--lumina-brand-ratel').trim() || style.color
  const radius = Math.min(parseFloat(style.borderRadius) || 24, h / 2)
  const path = new Path2D()
  path.roundRect(1, 1, w - 2, h - 2, radius)
  const background = style.backgroundColor === 'rgba(0, 0, 0, 0)' ? rootStyle.getPropertyValue('--dsw-alias-bg-layer-1').trim() || style.backgroundColor : style.backgroundColor
  const gradient = paint.createLinearGradient(0, 0, w, h)
  gradient.addColorStop(0, warm); gradient.addColorStop(1, cool)
  paint.strokeStyle = gradient; paint.lineWidth = 2; paint.stroke(path)
  for (const control of card.querySelectorAll<HTMLElement>('button')) {
    const rect = control.getBoundingClientRect()
    if (!rect.width || !rect.height) continue
    const css = getComputedStyle(control)
    if (css.backgroundColor === 'rgba(0, 0, 0, 0)') continue
    paint.fillStyle = css.backgroundColor
    paint.beginPath()
    paint.roundRect(rect.left - box.left, rect.top - box.top, rect.width, rect.height, Math.min(parseFloat(css.borderRadius) || 0, rect.width / 2, rect.height / 2))
    paint.fill()
  }
  paintText(card, paint, box)
  paintIcons(card, paint, box)
  const pixels = paint.getImageData(0, 0, w, h).data
  const targets: Particle[] = []
  // Sample actual ink densely: small type must form from particles too.
  const step = 2
  for (let y = 1; y < h; y += step) {
    for (let x = 1; x < w; x += step) {
      const i = (y * w + x) * 4
      if (pixels[i + 3]! < 20) continue
      targets.push({ x, y, ...particleOffset(targets.length), color: particleColor(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!), size: 1.05 })
    }
  }
  const particles = targets.length > MAX_PARTICLES ? Array.from({ length: MAX_PARTICLES }, (_, i) => targets[Math.floor(i * targets.length / MAX_PARTICLES)]!) : targets
  const groups = new Map<string, Particle[]>()
  for (const particle of particles) {
    const group = groups.get(particle.color)
    if (group) group.push(particle); else groups.set(particle.color, [particle])
  }
  const dpr = Math.min(devicePixelRatio || 1, budget.heroDpr, Math.sqrt(2_000_000 / ((w + pad * 2) * (h + pad * 2))))
  canvas.width = (w + pad * 2) * dpr; canvas.height = (h + pad * 2) * dpr
  canvas.className = 'lumina-hero-particles'
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, { left: `${-pad}px`, top: `${-pad}px`, width: `${w + pad * 2}px`, height: `${h + pad * 2}px` })
  ctx.scale(dpr, dpr)
  const oldPosition = card.style.position
  if (style.position === 'static') card.style.position = 'relative'
  let frame = 0, done = false
  const finish = () => {
    if (done) return
    done = true
    cancelMotionFrame(frame)
    canvas.remove()
    card.removeAttribute('data-lumina-assembling')
    card.style.removeProperty('--lumina-assembly-reveal')
    if (style.position === 'static') card.style.position = oldPosition
    resize?.disconnect()
    document.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('resize', finish)
    window.removeEventListener('blur', finish)
    document.removeEventListener('visibilitychange', onVisibility)
    for (const name of ['pointerdown', 'keydown', 'beforeinput', 'compositionstart']) card.removeEventListener(name, finish, true)
    onComplete()
  }
  const onVisibility = () => { if (document.hidden) finish() }
  const onScroll = (event: Event) => { if (event.target instanceof Node && card.contains(event.target)) finish() }
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver((entries) => {
    const entry = entries[0]
    if (entry && (Math.abs(card.getBoundingClientRect().width - box.width) > 1 || Math.abs(card.getBoundingClientRect().height - box.height) > 1)) finish()
  }) : undefined
  card.append(canvas)
  card.setAttribute('data-lumina-assembling', '')
  card.style.setProperty('--lumina-assembly-reveal', '0')
  const start = performance.now()
  let lastReveal = 0
  const draw = (now: number) => {
    if (done) return
    if (!card.isConnected || prefersReducedMotion()) { finish(); return }
    const t = Math.min(1, (now - start) / duration)
    ctx.clearRect(0, 0, w + pad * 2, h + pad * 2)
    const reveal = Math.max(0, Math.min(1, (t - .78) / .22))
    if (reveal !== lastReveal) {
      card.style.setProperty('--lumina-assembly-reveal', `${reveal}`)
      lastReveal = reveal
    }
    ctx.save()
    ctx.translate(pad, pad)
    ctx.globalAlpha = reveal
    ctx.fillStyle = background
    ctx.fill(path)
    ctx.restore()
    ctx.globalAlpha = (1 - reveal) * Math.min(1, t * 12)
    const gatherTime = Math.min(1, t / .88)
    for (const [color, group] of groups) {
      ctx.fillStyle = color
      ctx.beginPath()
      for (const p of group) {
        const progress = assemblyProgress(gatherTime, p.delay)
        const x = pad + p.x + p.dx * (1 - progress)
        const y = pad + p.y + p.dy * (1 - progress)
        ctx.moveTo(x + p.size, y)
        ctx.arc(x, y, p.size, 0, Math.PI * 2)
      }
      ctx.fill()
    }
    ctx.globalAlpha = 1
    if (t >= 1) finish()
    else frame = requestMotionFrame(draw)
  }
  resize?.observe(card)
  document.addEventListener('scroll', onScroll, true)
  window.addEventListener('resize', finish)
  window.addEventListener('blur', finish)
  document.addEventListener('visibilitychange', onVisibility)
  for (const name of ['pointerdown', 'keydown', 'beforeinput', 'compositionstart']) card.addEventListener(name, finish, true)
  frame = requestMotionFrame(draw)
  return finish
}
