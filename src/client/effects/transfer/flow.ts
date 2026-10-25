/** A finite silk segment is drawn out of the composer and consumed by the message. */
import { smooth, TRANSFER_TIME } from '../liquid-geometry.ts'
import { silkArtwork } from '../composer-ribbon-art.generated.ts'
import type { Point, TransferRenderer } from './types.ts'

export const FLOW_TIME = 600
let sequence = 0

/** Independent leading/trailing edges prevent a translated, fixed-length trail. */
export function flowWindow(time: number) {
  return { head: smooth((time - 80) / 340), tail: smooth((time - 240) / 320) }
}

/** Map the art spine's endpoints (0,164) and (1280,150) onto the submission. */
export function flowPlacement(from: Point, to: Point): number[] {
  const dx=to.x-from.x,dy=to.y-from.y,distance=Math.hypot(dx,dy)
  const nx=distance>0?-dy/distance:0,ny=distance>0?dx/distance:1
  const thickness=Math.min(.36,Math.max(.025,distance/1800))
  return [dx/1280+nx*thickness*14/1280,dy/1280+ny*thickness*14/1280,
    nx*thickness,ny*thickness,from.x-nx*thickness*164,from.y-ny*thickness*164]
}

export function createFlowRenderer(): TransferRenderer {
  let svg: SVGSVGElement | null = null
  let material: SVGGElement | null=null
  let revealRect: SVGRectElement | null=null
  let feather: SVGLinearGradientElement | null=null
  let paths: Array<{node:SVGPathElement;tokens:string[]}>=[]
  let lights: SVGElement[]=[]
  return {
    enter(stage) {
      const ns='http://www.w3.org/2000/svg',id=`lumina-flow-${++sequence}`
      svg=document.createElementNS(ns,'svg')
      svg.classList.add('lumina-transfer-flow');svg.setAttribute('fill','none')
      Object.assign(svg.style,{position:'absolute',inset:'0',width:'100%',height:'100%',overflow:'visible',pointerEvents:'none'})
      const defs=document.createElementNS(ns,'defs')
      feather=document.createElementNS(ns,'linearGradient');feather.id=`${id}-feather`
      feather.setAttribute('gradientUnits','userSpaceOnUse')
      for(const [offset,opacity] of [['0','0'],['.10','1'],['.84','1'],['1','0']]) {
        const stop=document.createElementNS(ns,'stop');stop.setAttribute('offset',offset!);stop.setAttribute('stop-color','white');stop.setAttribute('stop-opacity',opacity!);feather.append(stop)
      }
      const mask=document.createElementNS(ns,'mask');mask.id=`${id}-mask`
      for(const [name,value] of Object.entries({maskUnits:'userSpaceOnUse',x:'-100',y:'-120',width:'1480',height:'620'}))mask.setAttribute(name,value)
      revealRect=document.createElementNS(ns,'rect');revealRect.setAttribute('y','-120');revealRect.setAttribute('height','620');revealRect.setAttribute('fill',`url(#${id}-feather)`);mask.append(revealRect)
      defs.append(feather,mask);svg.append(defs)
      material=document.createElementNS(ns,'g');material.setAttribute('data-flow-part','artwork')
      const visible=document.createElementNS(ns,'g');visible.setAttribute('mask',`url(#${id}-mask)`)
      // Namespaced IDs allow concurrent transfers without cross-wiring gradients.
      const source=silkArtwork.replace(/id="([^"]+)"/g,`id="${id}-$1"`).replace(/url\(#([^)]+)\)/g,`url(#${id}-$1)`)
      const art=new DOMParser().parseFromString(source,'image/svg+xml').documentElement
      for(const child of Array.from(art.children))if(child.localName!=='title'&&child.localName!=='desc')visible.append(document.importNode(child,true))
      material.append(visible);svg.append(material)
      paths=Array.from(visible.querySelectorAll<SVGPathElement>('path[d]')).map(node=>({node,tokens:node.getAttribute('d')!.match(/[a-zA-Z]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/g)??[]}))
      lights=['white','foldLight','rim'].map(name=>visible.querySelector<SVGElement>(`[id="${id}-${name}"]`)!).filter(Boolean)
      stage.ink.append(svg)
      stage.targetLayer.style.opacity = '0'
      stage.sourceLayer.style.filter = ''; stage.targetLayer.style.filter = ''
    },
    render(t, stage) {
      const time = t * FLOW_TIME / TRANSFER_TIME
      const gather = smooth(time / 100), reveal = smooth((time - 420) / 180)
      stage.root.dataset.phase = time < 80 ? 'gather' : time < 360 ? 'flow' : time < 420 ? 'consume' : 'unfold'
      const { head, tail } = flowWindow(time)
      stage.root.dataset.flowHead = String(head); stage.root.dataset.flowTail = String(tail)
      const { hub, origin, edge, arrival } = stage
      stage.sourceLayer.style.transformOrigin = `${hub.x - origin.x}px ${hub.y - origin.y}px`
      stage.sourceLayer.style.transform = `translate(0, ${-5 * gather}px) scale(${1 - .10 * gather})`
      stage.sourceLayer.style.opacity = String(1 - gather)
      for (let i = 0; i < stage.sourceNodes.length; i++) {
        const glyph = stage.source.glyphs[i]!
        stage.sourceNodes[i]!.style.transform = `translate(${glyph.x - origin.x}px, ${glyph.y - origin.y}px)`
      }
      const from = { x: edge.x - origin.x, y: edge.y - origin.y }
      const to = arrival ? { x: arrival.x - origin.x, y: arrival.y - origin.y } : from
      if(material)material.setAttribute('transform',`matrix(${flowPlacement(from,to).join(' ')})`)
      const start=tail*1280,end=head*1280
      revealRect?.setAttribute('x',String(start));revealRect?.setAttribute('width',String(Math.max(0,end-start)))
      feather?.setAttribute('x1',String(start));feather?.setAttribute('x2',String(Math.max(start+.01,end)))
      for(const {node,tokens} of paths) {
        // Source paths use absolute M/L/C commands. Shared displacement keeps
        // neighboring folds together; it vanishes at both anchor endpoints.
        let coordinate=0,x=0
        const warped=tokens.map(token=>{
          if(/[a-zA-Z]/.test(token))return token
          const value=Number(token)
          if(coordinate++%2===0){x=value;return token}
          return String(value+Math.sin(Math.PI*x/1280)*Math.sin(x*.010-time*.010)*16)
        })
        node.setAttribute('d',warped.join(' '))
      }
      for(let i=0;i<lights.length;i++)lights[i]!.setAttribute('gradientTransform',`translate(${time*.22-45+i*12} 0)`)
      if (svg) svg.style.opacity = String(smooth((time - 65) / 45) * (1 - smooth((time - 550) / 25)))
      if (stage.revealTarget) {
        stage.targetLayer.style.opacity='0'
        stage.revealTarget(reveal)
      } else if (stage.target && arrival) {
        stage.targetLayer.style.opacity = String(reveal)
        stage.targetLayer.style.transformOrigin = `${arrival.x - origin.x}px ${arrival.y - origin.y}px`
        stage.targetLayer.style.transform = `translate(0, ${3 * (1 - reveal)}px) scale(${.97 + .03 * reveal})`
        for (let i = 0; i < stage.targetNodes.length; i++) {
          const glyph = stage.copyGlyphs[i]!
          stage.targetNodes[i]!.style.opacity = '1'
          stage.targetNodes[i]!.style.transform = `translate(${glyph.x - origin.x}px, ${glyph.y - origin.y}px)`
        }
      }
      return time >= FLOW_TIME
    },
    dispose() { svg?.remove(); svg = null; material=null; revealRect=null; feather=null; paths=[]; lights=[] },
  }
}
