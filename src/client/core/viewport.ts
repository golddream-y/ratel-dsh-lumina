/** Position an owned decoration in getBoundingClientRect's viewport coordinate space. */
export interface ViewportRect { x:number; y:number; width:number; height:number }
export function placeViewportOverlay(element:HTMLElement, box:ViewportRect, options: { preserveBoxModel?: boolean } = {}): boolean {
  if(!element.isConnected||box.width<=0||box.height<=0)return false
  Object.assign(element.style,{left:`${box.x}px`,top:`${box.y}px`,width:`${box.width}px`,height:`${box.height}px`,boxSizing:'border-box'})
  if (!options.preserveBoxModel) Object.assign(element.style, {padding:'0',borderWidth:'0'})
  // Ancestor CSS zoom can scale fixed-position CSS pixels a second time.
  // Measure only our own decoration; the renderer continues to use viewport pixels.
  const actual=element.getBoundingClientRect()
  const sx=actual.width/box.width, sy=actual.height/box.height
  if(!Number.isFinite(sx)||!Number.isFinite(sy)||sx<=0||sy<=0)return false
  const originX=actual.left-box.x*sx, originY=actual.top-box.y*sy
  Object.assign(element.style,{
    left:`${(box.x-originX)/sx}px`,top:`${(box.y-originY)/sy}px`,
    width:`${box.width/sx}px`,height:`${box.height/sy}px`,
  })
  return true
}

/** Bounded root observations catch CSS zoom changes that do not emit window resize. */
export function watchViewportScale(onChange:()=>void): ()=>void {
  const observer=new MutationObserver(onChange)
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['style','class']})
  observer.observe(document.body,{attributes:true,attributeFilter:['style','class']})
  window.visualViewport?.addEventListener('resize',onChange)
  return ()=>{observer.disconnect();window.visualViewport?.removeEventListener('resize',onChange)}
}
