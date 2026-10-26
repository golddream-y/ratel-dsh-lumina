import { renderBudget } from '../core/performance.ts'
import { silkArtwork, silkSpine } from './composer-ribbon-art.generated.ts'
import { artworkShader } from './composer-ribbon-art-shaders.ts'
import type { RibbonViewport } from './composer-ribbon-bounds.ts'
import type { RibbonBox } from './composer-ribbon-bounds.ts'

// Narrow local WebGPU contract: no runtime dependency or global DOM augmentation.
interface BufferResource { destroy(): void }
interface TextureResource { destroy(): void; createView(): object }
interface RenderPass {
  setPipeline(pipeline: object): void
  setBindGroup(index: number, group: object): void
  setScissorRect(x: number, y: number, w: number, h: number): void
  draw(count: number): void
  end(): void
}
interface Encoder { beginRenderPass(options: object): RenderPass; finish(): object }
interface Device {
  lost: Promise<unknown>
  queue: { writeBuffer(buffer: BufferResource, offset: number, data: Float32Array): void; submit(commands: object[]): void; copyExternalImageToTexture(source: object, destination: object, size: number[]): void }
  createSampler(options: object): object
  createTexture(options: object): TextureResource
  createBuffer(options: object): BufferResource
  createShaderModule(options: object): { getCompilationInfo(): Promise<{ messages: Array<{type: string; message: string}> }> }
  createRenderPipelineAsync(options: object): Promise<{getBindGroupLayout(index: number): object}>
  createBindGroup(options: object): object
  createCommandEncoder(): Encoder
  pushErrorScope(type: string): void
  popErrorScope(): Promise<unknown>
  destroy(): void
  addEventListener(type: string, listener: EventListener): void
  removeEventListener(type: string, listener: EventListener): void
}
interface GPUContext {
  configure(options: object): void
  unconfigure(): void
  getCurrentTexture(): {createView(): object}
}
interface GPUApi {
  requestAdapter(options: object): Promise<{requestDevice(): Promise<Device>} | null>
  getPreferredCanvasFormat(): string
}
export interface RibbonRenderer {
  render(width: number, height: number, box: RibbonBox, time: number, maskCard?: boolean, bounds?: RibbonViewport): void
  dispose(): void
}
export async function createRibbonRenderer(canvas: HTMLCanvasElement, failed: () => void): Promise<RibbonRenderer | null> {
  const budget=renderBudget()
  const gpu=(navigator as Navigator & {gpu?: GPUApi}).gpu
  if(!gpu) return null
  const adapter=await gpu.requestAdapter({powerPreference:'low-power'})
  if(!adapter) return null
  const device=await adapter.requestDevice()
  let context: GPUContext | null=null, uniform: BufferResource | undefined, artwork: TextureResource | undefined, spine: BufferResource | undefined
  let multisample: TextureResource | undefined, sampleWidth=0, sampleHeight=0, dead=false
  const onError: EventListener=()=>{dispose();failed()}
  const dispose=()=>{
    if(dead) return
    dead=true;device.removeEventListener('uncapturederror',onError)
    context?.unconfigure();multisample?.destroy();artwork?.destroy();spine?.destroy();uniform?.destroy();device.destroy()
  }
  try {
    context=(canvas as unknown as {getContext(type: string): GPUContext|null}).getContext('webgpu')
    if(!context) {dispose();return null}
    const format=gpu.getPreferredCanvasFormat()
    const shader=device.createShaderModule({code:artworkShader,label:'Lumina SVG silk'})
    const info=await shader.getCompilationInfo()
    if(info.messages.some(m=>m.type==='error')) throw new Error(info.messages.map(m=>m.message).join('\n'))
    device.pushErrorScope('validation')
    const pipeline=await device.createRenderPipelineAsync({label:'Lumina artwork mesh',layout:'auto',
      vertex:{module:shader,entryPoint:'vertex',constants:{columns:budget.ribbonColumns}},
      fragment:{module:shader,entryPoint:'fragment',targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}}}]},
      primitive:{topology:'triangle-list',cullMode:'none'},multisample:{count:budget.ribbonSamples}})
    if(await device.popErrorScope()) throw new Error('Invalid silk pipeline')
    // Rasterize our bundled SVG once. Its local filters and fine folds remain one coherent image.
    const image=new Image()
    const url=URL.createObjectURL(new Blob([silkArtwork.replace('<svg ','<svg width="3072" height="912" ')],{type:'image/svg+xml'}))
    try {
      image.src=url;await image.decode()
      artwork=device.createTexture({size:[3072,912],format:'rgba8unorm',usage:0x04|0x02|0x10,label:'Lumina approved silk artwork'})
      device.queue.copyExternalImageToTexture({source:image},{texture:artwork,premultipliedAlpha:true},[3072,912])
    } finally {URL.revokeObjectURL(url);image.src=''}
    uniform=device.createBuffer({size:48,usage:0x40|0x08,label:'Lumina silk scene'})
    spine=device.createBuffer({size:silkSpine.byteLength,usage:0x80|0x08,label:'Lumina artwork spine'})
    device.queue.writeBuffer(spine,0,silkSpine)
    const sampler=device.createSampler({magFilter:'linear',minFilter:'linear',addressModeU:'clamp-to-edge',addressModeV:'clamp-to-edge'})
    const group=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[
      {binding:0,resource:{buffer:uniform}},{binding:1,resource:artwork.createView()},{binding:2,resource:sampler},{binding:3,resource:{buffer:spine}}]})
    context.configure({device,format,alphaMode:'premultiplied'})
    device.addEventListener('uncapturederror',onError)
    void device.lost.then(()=>{if(!dead) {dispose();failed()}})
    const values=new Float32Array(12)
    return {dispose,render(width,height,box,time,maskCard=true,bounds) {
      if(dead||!context||!uniform) return
      try {
        if(budget.ribbonSamples>1 && (!multisample||sampleWidth!==canvas.width||sampleHeight!==canvas.height)) {
          multisample?.destroy();sampleWidth=canvas.width;sampleHeight=canvas.height
          multisample=device.createTexture({size:[sampleWidth,sampleHeight],sampleCount:budget.ribbonSamples,format,usage:0x10,label:'Lumina silk MSAA'})
        }
        values.set([width,height,time,maskCard?1:0,box.x,box.y,box.width,box.height,bounds?.x??0,bounds?.y??0,bounds?.width??width,bounds?.height??height])
        device.queue.writeBuffer(uniform,0,values)
        const encoder=device.createCommandEncoder()
        const pass=encoder.beginRenderPass({colorAttachments:[{view:budget.ribbonSamples>1?multisample!.createView():context.getCurrentTexture().createView(),...(budget.ribbonSamples>1?{resolveTarget:context.getCurrentTexture().createView()}:{}),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:budget.ribbonSamples>1?'discard':'store'}]})
        pass.setPipeline(pipeline);pass.setBindGroup(0,group)
        pass.setScissorRect(0,0,canvas.width,canvas.height)
        pass.draw(budget.ribbonColumns*16*6);pass.end();device.queue.submit([encoder.finish()])
      } catch {dispose();failed()}
    }}
  } catch(error) {
    dispose();console.warn('[ratel-lumina] silk WebGPU unavailable',error);return null
  }
}
