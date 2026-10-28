/** Geometry and reversible visual reveal of an already-associated host message. */
import type { Point } from './types.ts'
import { paintedAncestor } from './shared.ts'
export const FLOW_REVEAL='data-lumina-flow-reveal'
const PROGRESS='--lumina-flow-progress'

/** Enter the near boundary, keeping the ribbon out of the text's centre. */
export function flowLandingPoint(element:HTMLElement,from:Point,visible?:{left:number;top:number;right:number;bottom:number}):Point {
  const bounds=paintedAncestor(element).getBoundingClientRect()
  const rect=visible ? {left:Math.max(bounds.left,visible.left),top:Math.max(bounds.top,visible.top),right:Math.min(bounds.right,visible.right),bottom:Math.min(bounds.bottom,visible.bottom)} : bounds
  const cx=(rect.left+rect.right)/2,cy=(rect.top+rect.bottom)/2
  const inset=Math.min(18,(rect.right-rect.left)*.15)
  const height=rect.bottom-rect.top
  if(from.y>rect.bottom)return{x:from.x<cx?rect.left+inset:rect.right-inset,y:rect.bottom-1}
  if(from.y<rect.top)return{x:from.x<cx?rect.left+inset:rect.right-inset,y:rect.top+1}
  return{x:from.x<cx?rect.left+1:rect.right-1,y:Math.max(rect.top+Math.min(12,height/2),Math.min(rect.bottom-Math.min(12,height/2),from.y||cy))}
}

export function flowMessageReveal(id:string) {
  const owned=new Map<HTMLElement,{attribute:string|null;value:string;priority:string}>()
  return {
    update(node:HTMLElement,progress:number) {
      if(!owned.has(node))owned.set(node,{attribute:node.getAttribute(FLOW_REVEAL),value:node.style.getPropertyValue(PROGRESS),priority:node.style.getPropertyPriority(PROGRESS)})
      node.setAttribute(FLOW_REVEAL,id)
      node.style.setProperty(PROGRESS,String(Math.max(0,Math.min(1,progress))))
    },
    dispose() {
      for(const [node,previous] of owned)if(node.getAttribute(FLOW_REVEAL)===id){
        if(previous.attribute===null)node.removeAttribute(FLOW_REVEAL);else node.setAttribute(FLOW_REVEAL,previous.attribute)
        if(previous.value)node.style.setProperty(PROGRESS,previous.value,previous.priority);else node.style.removeProperty(PROGRESS)
      }
      owned.clear()
    },
  }
}
