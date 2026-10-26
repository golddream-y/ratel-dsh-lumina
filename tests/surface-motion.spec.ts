/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installSurfaceMotion } from '../src/client/effects/surface-motion.ts'
import { installSessionSelection } from '../src/client/effects/session-selection.ts'
let dispose: (()=>void) | undefined
const animations: Array<{target:Element;frames:Keyframe[];cancel:ReturnType<typeof vi.fn>;onfinish:(()=>void)|null}> = []
const flush = async () => { await Promise.resolve(); await Promise.resolve() }
beforeEach(() => {
  document.documentElement.dataset.lumina='on'
  vi.spyOn(document,'hasFocus').mockReturnValue(true)
  vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
    const y=Number(this.dataset.y||20)
    return {x:20,y,left:20,top:y,width:300,height:40,right:320,bottom:y+40,toJSON:()=>({})} as DOMRect
  })
  vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener(){},removeEventListener(){}}))
  HTMLElement.prototype.animate=vi.fn(function(this:HTMLElement,frames){
    const animation={target:this,frames:frames as Keyframe[],cancel:vi.fn(),onfinish:null}
    animations.push(animation)
    return animation as unknown as Animation
  })
})
afterEach(()=>{dispose?.();dispose=undefined;document.body.innerHTML='';animations.length=0;vi.restoreAllMocks();vi.unstubAllGlobals()})
function dialog(){const node=document.createElement('div');node.setAttribute('role','dialog');node.setAttribute('aria-modal','true');node.innerHTML='<button id="action" autofocus>OK</button>';return node}
describe('native surface lifecycle',()=>{
  it('does not replay an already open dialog; removal retains only an inert identity-free visual',async()=>{
    const node=dialog();document.body.append(node)
    dispose=installSurfaceMotion('dialog','normal')
    expect(animations).toHaveLength(0)
    node.remove();await flush()
    const snapshot=document.querySelector<HTMLElement>('[data-lumina-retired-surface]')!
    expect(snapshot).not.toBeNull();expect(snapshot.inert).toBe(true)
    expect(document.querySelector('[role="dialog"],#action,[autofocus]')).toBeNull()
    expect(snapshot.style.pointerEvents).toBe('none')
    animations.at(-1)!.onfinish!();expect(snapshot.isConnected).toBe(false)
  })
  it('animates a new surface, then removes all visuals and ownership on blur/uninstall',async()=>{
    dispose=installSurfaceMotion('dialog','normal')
    const node=dialog();document.body.append(node);await flush()
    expect(animations[0]!.frames[0]).toMatchObject({opacity:0,scale:'.975'})
    window.dispatchEvent(new Event('blur'));expect(animations[0]!.cancel).toHaveBeenCalled()
    dispose();dispose=undefined
    expect(node.hasAttribute('data-lumina-dialog-surface')).toBe(false)
    expect(document.querySelector('[data-effect="dialogMotion"]')).toBeNull()
  })
  it('does not transform menu roots that position nested fixed menus',async()=>{
    dispose=installSurfaceMotion('menu','normal')
    const menu=document.createElement('div');menu.dataset.menuMaterial='translucent';document.body.append(menu);await flush()
    expect(animations[0]!.frames[0]).toHaveProperty('clipPath')
    expect(animations[0]!.frames.every(frame=>!('transform'in frame)&&!('translate'in frame))).toBe(true)
  })
  it('uses the native tooltip side without selecting unrelated custom tips',async()=>{
    dispose=installSurfaceMotion('menu','normal')
    const tip=document.createElement('span');tip.role='tooltip';tip.dataset.side='right';tip.dataset.align='center';document.body.append(tip)
    const custom=document.createElement('span');custom.role='tooltip';document.body.append(custom);await flush()
    expect(animations).toHaveLength(1)
    expect(animations[0]!.frames[0]).toMatchObject({clipPath:'inset(0 0 0 10px)'})
    expect(custom.hasAttribute('data-lumina-menu-surface')).toBe(false)
  })
  it('removes the retired visual if the browser rejects an exit animation',async()=>{
    const node=dialog();document.body.append(node)
    dispose=installSurfaceMotion('dialog','normal')
    vi.mocked(HTMLElement.prototype.animate).mockImplementationOnce(()=>{throw Error('animation unavailable')})
    node.remove();await flush()
    expect(document.querySelector('[data-lumina-retired-surface]')).toBeNull()
  })
  it('honors reduced motion without keeping a closing visual',async()=>{
    vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}))
    dispose=installSurfaceMotion('dialog','normal')
    const node=dialog();document.body.append(node);await flush();node.remove();await flush()
    expect(animations).toHaveLength(0);expect(document.querySelector('[data-lumina-retired-surface]')).toBeNull()
  })
})
describe('selection ownership',()=>{
  it('restores native selection immediately when an animation cannot start',async()=>{
    document.body.innerHTML='<div role="tree"><div data-row-key="session:a" role="treeitem" aria-selected="true">A</div><div data-row-key="session:b" role="treeitem" aria-selected="false">B</div></div>'
    dispose=installSessionSelection('normal')
    vi.mocked(HTMLElement.prototype.animate).mockImplementationOnce(()=>{throw Error('animation unavailable')})
    const rows=document.querySelectorAll('[data-row-key]')
    rows[0]!.setAttribute('aria-selected','false');rows[1]!.setAttribute('aria-selected','true');await flush()
    expect(document.querySelector('[data-lumina-selection-pill],[data-lumina-selection-arriving]')).toBeNull()
    expect(document.querySelector<HTMLElement>('[role="tree"]')!.style.isolation).toBe('')
  })
  it('moves only a passive pill and restores the native background on cancellation',async()=>{
    document.body.innerHTML='<div role="tree"><div data-row-key="session:a" role="treeitem" aria-selected="true" data-y="20">A</div><div data-row-key="session:b" role="treeitem" aria-selected="false" data-y="60">B</div></div>'
    dispose=installSessionSelection('normal')
    const rows=document.querySelectorAll('[data-row-key]')
    rows[0]!.setAttribute('aria-selected','false');rows[1]!.setAttribute('aria-selected','true');await flush()
    expect(document.querySelectorAll('[data-lumina-selection-pill]')).toHaveLength(1)
    expect(rows[1]!.hasAttribute('data-lumina-selection-arriving')).toBe(true)
    expect(rows[1]!.textContent).toBe('B')
    document.dispatchEvent(new Event('scroll'));await flush()
    expect(document.querySelector('[data-lumina-selection-pill]')).toBeNull()
    expect(rows[1]!.hasAttribute('data-lumina-selection-arriving')).toBe(false)
    expect(document.querySelector<HTMLElement>('[role="tree"]')!.style.isolation).toBe('')
  })
})
