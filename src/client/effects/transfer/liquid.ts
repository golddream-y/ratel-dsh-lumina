/** The liquid mode: gather, fuse, edge merge, detach, arc flight, unfold. */

import { cssSelector } from '../../adapter/selector.ts'
import { clamp, liquidFrame, smooth } from '../liquid-geometry.ts'
import type { TransferRenderer, TransferStage } from './types.ts'

let sequence = 0

interface LiquidNodes {
  svg: SVGElement
  group: SVGGElement
  surface: SVGPathElement
  neck: SVGPathElement
  drop: SVGPathElement
  body: SVGPathElement
  surfaceLine: SVGPathElement
  dropLine: SVGPathElement
  glint: SVGPathElement
  caustic: SVGPathElement
  rimShade: SVGPathElement
  facet: SVGPathElement
  reflection: SVGPathElement
  gradient: SVGRadialGradientElement
  surfaceHalf: number
  sourceHidden: boolean
}

/** Catmull-Rom controls preserve a continuous tangent through the sampled surface. */
function curve(points: Array<{x:number;y:number}>, origin:{x:number;y:number}): string {
  if(!points.length)return ''
  const local=(x:number,y:number)=>`${x-origin.x} ${y-origin.y}`
  const result=[`M ${local(points[0]!.x,points[0]!.y)}`]
  for(let i=0;i<points.length-1;i++) {
    const p0=points[Math.max(0,i-1)]!,p1=points[i]!,p2=points[i+1]!,p3=points[Math.min(points.length-1,i+2)]!
    result.push(`C ${local(p1.x+(p2.x-p0.x)/6,p1.y+(p2.y-p0.y)/6)} ${local(p2.x-(p3.x-p1.x)/6,p2.y-(p3.y-p1.y)/6)} ${local(p2.x,p2.y)}`)
  }
  return result.join(' ')
}

/** Build the liquid mode renderer. */
export function createLiquidRenderer(options: { scale?: number } = {}): TransferRenderer {
  const size=Math.max(.5,Math.min(2,options.scale??1))
  let nodes: LiquidNodes | null = null

  const enter = (stage: TransferStage) => {
    const ns = 'http://www.w3.org/2000/svg'
    const id = `lumina-goo-${++sequence}`
    const card = stage.source.element.closest(cssSelector('composerCard'))
    const cardRect = card?.getBoundingClientRect()
    const corner = card ? Math.max(28, parseFloat(getComputedStyle(card).borderTopLeftRadius) || 28) : 28
    const surfaceHalf = cardRect
      ? Math.max(24, Math.min(96*size, stage.edge.x - cardRect.left - corner, cardRect.right - corner - stage.edge.x))
      : 48*size

    const svg = document.createElementNS(ns, 'svg')
    svg.classList.add('lumina-transfer-liquid')
    svg.setAttribute('width', '100%')
    svg.setAttribute('height', '100%')
    const defs = document.createElementNS(ns, 'defs')
    const gradient = document.createElementNS(ns, 'radialGradient')
    gradient.id = `${id}-liquid`
    gradient.setAttribute('gradientUnits','userSpaceOnUse')
    gradient.setAttribute('cx','0');gradient.setAttribute('cy','0');gradient.setAttribute('r','1')
    for(const [offset,color,opacity] of [
      ['0%','var(--lumina-hi)','.82'],
      ['28%','var(--lumina-water-light)','.44'],
      ['55%','var(--lumina-water-body)','.31'],
      ['78%','var(--lumina-water-body)','.55'],
      ['94%','var(--lumina-water-depth)','.78'],
      ['100%','var(--lumina-water-depth)','.18'],
    ]) {
      const stop=document.createElementNS(ns,'stop')
      stop.setAttribute('offset',offset!);stop.style.stopColor=color!;stop.setAttribute('stop-opacity',opacity!)
      gradient.append(stop)
    }
    const surfaceGradient=document.createElementNS(ns,'linearGradient')
    surfaceGradient.id=`${id}-surface`;surfaceGradient.setAttribute('x2','0%');surfaceGradient.setAttribute('y2','100%')
    for(const [offset,color,opacity] of [['0%','var(--lumina-water-line)','.42'],['35%','var(--lumina-hi)','.32'],['100%','var(--lumina-water-body)','0']]) {
      const stop=document.createElementNS(ns,'stop');stop.setAttribute('offset',offset!);stop.style.stopColor=color!;stop.setAttribute('stop-opacity',opacity!);surfaceGradient.append(stop)
    }
    const body=document.createElementNS(ns,'path');body.id=`${id}-body`;body.setAttribute('fill',`url(#${id}-liquid)`)
    const clip=document.createElementNS(ns,'clipPath');clip.id=`${id}-clip`
    const silhouette=document.createElementNS(ns,'use');silhouette.setAttribute('href',`#${id}-body`);clip.append(silhouette)
    defs.append(gradient,surfaceGradient,clip);svg.append(defs)
    const surface=document.createElementNS(ns,'path'),neck=document.createElementNS(ns,'path'),drop=document.createElementNS(ns,'path')
    surface.setAttribute('data-liquid-part','surface');neck.setAttribute('data-liquid-part','neck');drop.setAttribute('data-liquid-part','drop')
    surface.setAttribute('fill',`url(#${id}-surface)`);neck.setAttribute('fill','none');drop.setAttribute('fill','none')
    const group=document.createElementNS(ns,'g');group.append(surface,neck,drop,body);svg.append(group)
    const facet=document.createElementNS(ns,'path'),reflection=document.createElementNS(ns,'path')
    facet.setAttribute('fill','var(--lumina-water-light)');facet.setAttribute('fill-opacity','.35')
    reflection.setAttribute('fill','var(--lumina-water-warm, var(--lumina-water-light))');reflection.setAttribute('fill-opacity','.19')
    const optics=document.createElementNS(ns,'g');optics.setAttribute('clip-path',`url(#${id}-clip)`);optics.append(facet,reflection);svg.append(optics)
    const surfaceLine=document.createElementNS(ns,'path'),dropLine=document.createElementNS(ns,'path'),glint=document.createElementNS(ns,'path'),caustic=document.createElementNS(ns,'path'),rimShade=document.createElementNS(ns,'path')
    for(const path of [surfaceLine,dropLine,rimShade,glint,caustic]) {path.setAttribute('fill','none');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-linejoin','round');svg.append(path)}
    surfaceLine.setAttribute('stroke','var(--lumina-water-light)');surfaceLine.setAttribute('stroke-width','.9')
    dropLine.setAttribute('stroke','var(--lumina-water-line)');dropLine.setAttribute('stroke-width','.7')
    glint.setAttribute('stroke','var(--lumina-hi)');glint.setAttribute('stroke-width','1.6')
    caustic.setAttribute('stroke','var(--lumina-water-light)');caustic.setAttribute('stroke-width','1.1')
    rimShade.setAttribute('stroke','var(--lumina-water-depth)');rimShade.setAttribute('stroke-width','1.25')
    stage.ink.append(svg)

    // Text is a coherent block; liquid geometry is independent of glyphs.
    stage.sourceLayer.style.filter = ''
    stage.targetLayer.style.filter = ''
    stage.targetLayer.style.opacity = '0'
    nodes = {
      svg, group, surface, neck, drop, body, surfaceLine, dropLine, glint, caustic, rimShade, facet, reflection, gradient,
      surfaceHalf, sourceHidden: false,
    }
  }

  const render = (t: number, stage: TransferStage): boolean => {
    const n = nodes
    if (n === null) return false
    const { hub, edge, origin, arrival } = stage
    const local = (x: number, y: number) => `${x - origin.x} ${y - origin.y}`
    const state = liquidFrame(t, hub, edge, arrival ?? edge, undefined, size)
    const { flight, unfold, absorb, emerge, radius, x: dx, y: dy } = state
    const gather = clamp(t / 240)
    stage.root.setAttribute('data-phase', state.phase)
    stage.root.setAttribute('data-liquid-radius', radius.toFixed(3))
    stage.root.setAttribute('data-liquid-connected', String(state.connected))
    stage.root.setAttribute('data-liquid-edge', `${edge.x},${edge.y}`)
    stage.ink.style.opacity = '1'

    // Preserve layout within the paragraph while the entire copy folds into
    // the drop. Per-glyph scatter/rotation belongs to other modes.
    stage.sourceLayer.style.transformOrigin = `${hub.x - origin.x}px ${hub.y - origin.y}px`
    stage.sourceLayer.style.transform = `scale(${1 - smooth(gather)})`
    for (let i = 0; i < stage.sourceNodes.length && !n.sourceHidden; i++) {
      const g = stage.source.glyphs[i]!, node = stage.sourceNodes[i]!
      node.style.transform = `translate(${g.x - origin.x}px, ${g.y - origin.y}px)`
      node.style.opacity = '1'
    }
    if (t >= 250 && !n.sourceHidden) {
      for (const node of stage.sourceNodes) node.style.opacity = '0'
      n.sourceHidden = true
    }

    // One silhouette grows from the surface; the bridge is never a second
    // filled object. Tilt and rebound remain deterministic at scrubbed times.
    const direction = Math.sign((arrival?.x ?? edge.x + 1) - edge.x) || 1
    const free = smooth((t - 710) / 65)
    const rebound = Math.sin(clamp((t - 710) / 105) * Math.PI) * (1 - free * .45)
    // The reference has a rounded belly and an offset tip, rather than a
    // rotated leaf. Keep the mass upright throughout the flight.
    const breath = Math.sin(flight * Math.PI * 2) * .035
    const rx = radius * (1 + rebound * .10 + breath + 1.2 * Math.sin(unfold * Math.PI))
    const ry = radius * (1 - rebound * .07 - breath * .5 - .62 * Math.sin(unfold * Math.PI))
    const angle = 0
    const point = (u:number,v:number) => ({x:dx+u,y:dy+v})
    const p = (u:number,v:number) => local(dx+u,dy+v)
    const tip = .28
    const tipX = rx * direction * (.22 + .04 * Math.sin(flight*Math.PI))
    const crown = p(tipX,-ry*(1+tip))
    const right = p(rx*.80,ry*.62), left = p(-rx*.80,ry*.62)
    const upperRight = `M ${crown} C ${p(tipX+rx*.16,-ry*.83)} ${p(rx*1.38,ry*.01)} ${right}`
    const upperLeft = `C ${p(-rx*1.32,-ry*.03)} ${p(tipX-rx*.34,-ry*.73)} ${crown} Z`
    const dropPath = radius>.01
      ? `${upperRight} C ${p(rx*.51,ry*1.16)} ${p(-rx*.51,ry*1.16)} ${left} ${upperLeft}` : ''
    n.drop.setAttribute('d',dropPath)
    const joinRight=point(rx*.80,ry*.62),joinLeft=point(-rx*.80,ry*.62)
    const waist=Math.max(.12,state.neckWidth),half=state.baseWidth
    const pinchX=edge.x+(dx-edge.x)*.45,pinchY=edge.y+(dy-edge.y)*.31
    const bridgeRight=`C ${local(joinRight.x-2*direction,joinRight.y+ry*.26)} ${local(pinchX+waist,pinchY-3*size)} ${local(pinchX+waist,pinchY)} C ${local(pinchX+waist,pinchY+6*size)} ${local(edge.x+half*.6,edge.y)} ${local(edge.x+half,edge.y+2)}`
    const bridgeLeft=`L ${local(edge.x-half,edge.y+2)} C ${local(edge.x-half*.6,edge.y)} ${local(pinchX-waist,pinchY+6*size)} ${local(pinchX-waist,pinchY)} C ${local(pinchX-waist,pinchY-3*size)} ${local(joinLeft.x-2*direction,joinLeft.y+ry*.26)} ${left}`
    const neckPath=state.connected?`M ${local(joinRight.x,joinRight.y)} ${bridgeRight} ${bridgeLeft} Z`:''
    n.neck.setAttribute('d',neckPath)
    const silhouette=state.connected?`${upperRight} ${bridgeRight} ${bridgeLeft} ${upperLeft}`:dropPath
    n.body.setAttribute('d',silhouette)
    n.gradient.setAttribute('gradientTransform',`translate(${dx-origin.x-rx*.33} ${dy-origin.y-ry*.34}) rotate(${angle*180/Math.PI}) scale(${Math.max(.01,rx*1.06)} ${Math.max(.01,ry*1.2)})`)
    // Avoid parallel contour rings: only the free rim and two short reflections.
    n.dropLine.setAttribute('d',state.connected?'':dropPath)
    n.dropLine.style.opacity=String(.30*(1-unfold))
    n.glint.setAttribute('d',radius>2?`M ${p(-rx*.68,ry*.04)} C ${p(-rx*.79,-ry*.21)} ${p(-rx*.46,-ry*.59)} ${p(-rx*.12,-ry*.70)}`:'')
    n.glint.style.opacity=String(.96*smooth((t-170)/70)*(1-unfold))
    n.facet.setAttribute('d',radius>1?`M ${p(tipX,-ry*(1+tip))} C ${p(rx*.65,-ry*.45)} ${p(rx*.34,ry*.45)} ${p(-rx*.48,ry*.76)} C ${p(rx*.68,ry*.64)} ${p(rx*.97,-ry*.21)} ${p(tipX,-ry*(1+tip))} Z`:'')
    n.reflection.setAttribute('d',radius>1?`M ${p(rx*.66,ry*.03)} C ${p(rx*.8,ry*.62)} ${p(rx*.13,ry*.98)} ${p(-rx*.38,ry*.72)} C ${p(rx*.12,ry*.7)} ${p(rx*.39,ry*.4)} ${p(rx*.66,ry*.03)} Z`:'')
    n.caustic.setAttribute('d',radius>2?`M ${p(-rx*.28,ry*.69)} Q ${p(rx*.14,ry*.82)} ${p(rx*.45,ry*.46)}`:'')
    n.rimShade.setAttribute('d',radius>2?`M ${p(rx*.85,ry*.03)} C ${p(rx*.98,ry*.44)} ${p(rx*.46,ry*.99)} ${p(-rx*.13,ry*.89)}`:'')
    n.rimShade.style.opacity=String(.60*(1-unfold))
    n.caustic.style.opacity=String(.84*(1-unfold))
    const line:Array<{x:number;y:number}>=[],underside:Array<{x:number;y:number}>=[]
    const depth=2.5+3*absorb*(1-emerge)
    for(let i=0;i<=24;i++) {
      const u=(i/24*2-1)*n.surfaceHalf
      const envelope=Math.exp(-Math.pow(u/31,2))
      const settle=clamp((t-710)/150)
      const recoil=Math.sin(settle*Math.PI*2)*Math.exp(-settle*3)*5*size
      const wave=Math.sin(u*.09-t*.018)*Math.exp(-Math.abs(u)/65)*1.2*Math.sin(absorb*Math.PI)+recoil*envelope
      const taper=Math.max(0,1-Math.pow(u/n.surfaceHalf,2))
      const profile=(wave+3*Math.sin(absorb*Math.PI)*envelope-state.crest*envelope)*taper
      line.push({x:edge.x+u,y:edge.y+profile})
      underside.unshift({x:edge.x+u,y:edge.y+depth*Math.sqrt(taper)})
    }
    const topLine=curve(line,origin)
    n.surface.setAttribute('d',`${topLine} ${curve(underside,origin).replace(/^M/,'L')} Z`)
    n.surface.style.opacity=String(state.surfaceOpacity)
    n.surfaceLine.setAttribute('d',topLine)
    n.surfaceLine.style.opacity=String(.75*state.surfaceOpacity)

    if (stage.target && arrival && unfold > 0) {
      const p = smooth(unfold)
      stage.targetLayer.style.opacity = '1'
      stage.targetLayer.style.transformOrigin = `${arrival.x - origin.x}px ${arrival.y - origin.y}px`
      stage.targetLayer.style.transform = `translate(${dx - arrival.x}px, ${dy - arrival.y}px) scale(${p})`
      for (let i = 0; i < stage.targetNodes.length; i++) {
        const g = stage.copyGlyphs[i]!, node = stage.targetNodes[i]!
        node.style.opacity = '1'
        node.style.transform = `translate(${g.x - origin.x}px, ${g.y - origin.y}px)`
      }
    }
    const card = stage.source.element.closest(cssSelector('composerCard'))
    if (t >= 710 && card !== null && card.hasAttribute('data-lumina-transfer')) card.removeAttribute('data-lumina-transfer')
    return unfold >= 1
  }

  const dispose = (stage: TransferStage) => {
    nodes?.group.remove()
    nodes?.svg.remove()
    stage.ink.querySelectorAll('.lumina-transfer-liquid').forEach((node) => node.remove())
    nodes = null
  }

  return { enter, render, dispose }
}
