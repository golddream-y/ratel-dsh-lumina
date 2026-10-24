export interface RibbonBox { x:number; y:number; width:number; height:number }
export interface RibbonViewport { x:number; y:number; width:number; height:number }
/** Keep the native titlebar completely outside the decoration's compositor surface. */
export function ribbonViewport(width:number,height:number,box:RibbonBox): RibbonViewport | null {
  const scale=Math.min(1,box.width/760)
  const base=box.y+box.height
  const x=Math.max(0,Math.floor(box.x-Math.min(460,box.width*.65)-6))
  const right=Math.min(width,Math.ceil(box.x+box.width+Math.min(480,box.width*.65)+6))
  const y=Math.max(64,Math.floor(box.y-180*scale))
  const bottom=Math.min(height,Math.ceil(base+360*scale))
  return right>x&&bottom>y?{x,y,width:right-x,height:bottom-y}:null
}
