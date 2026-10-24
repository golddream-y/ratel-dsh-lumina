import { silkSurfaceSamples } from './composer-ribbon-surface.generated.ts'
import { ribbonShader } from './composer-ribbon-shaders.ts'
import { SILK_PALETTE } from '../style/tokens.ts'
import type { RibbonBox } from './composer-ribbon-painter.ts'

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
  queue: { writeBuffer(buffer: BufferResource, offset: number, data: Float32Array): void; submit(commands: object[]): void }
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
  render(width: number, height: number, box: RibbonBox, time: number, maskCard?: boolean): void
  dispose(): void
}
const rgb = (value: string) => value.slice(5).split(',').slice(0,3).map(v=>Number(v)/255)

export async function createRibbonRenderer(canvas: HTMLCanvasElement, failed: () => void): Promise<RibbonRenderer | null> {
  const gpu=(navigator as Navigator & {gpu?: GPUApi}).gpu
  if(!gpu) return null
  const adapter=await gpu.requestAdapter({powerPreference:'low-power'})
  if(!adapter) return null
  const device=await adapter.requestDevice()
  let context: GPUContext | null=null, uniform: BufferResource | undefined, outline: BufferResource | undefined, multisample: TextureResource | undefined, sampleWidth=0, sampleHeight=0, dead=false
  const onError: EventListener=()=>{dispose();failed()}
  const dispose=()=>{
    if(dead) return
    dead=true;device.removeEventListener('uncapturederror',onError)
    context?.unconfigure();multisample?.destroy();uniform?.destroy();outline?.destroy();device.destroy()
  }
  try {
    context=(canvas as unknown as {getContext(type: string): GPUContext|null}).getContext('webgpu')
    if(!context) {dispose();return null}
    const format=gpu.getPreferredCanvasFormat()
    const shader=device.createShaderModule({code:ribbonShader,label:'Lumina silk'})
    const info=await shader.getCompilationInfo()
    if(info.messages.some(m=>m.type==='error')) throw new Error(info.messages.map(m=>m.message).join('\n'))
    device.pushErrorScope('validation')
    const pipeline=await device.createRenderPipelineAsync({label:'Lumina translucent silk',layout:'auto',
      vertex:{module:shader,entryPoint:'vertex'},
      fragment:{module:shader,entryPoint:'fragment',targets:[{format,blend:{color:{srcFactor:'one',dstFactor:'one-minus-src-alpha'},alpha:{srcFactor:'one',dstFactor:'one-minus-src-alpha'}}}]},
      primitive:{topology:'triangle-list',cullMode:'none'},multisample:{count:4}})
    if(await device.popErrorScope()) throw new Error('Invalid silk pipeline')
    uniform=device.createBuffer({size:1536,usage:0x40|0x08,label:'Lumina silk uniforms'})
    outline=device.createBuffer({size:silkSurfaceSamples.byteLength,usage:0x80|0x08,label:'Lumina SVG outlines'})
    device.queue.writeBuffer(outline,0,silkSurfaceSamples)
    const groups=Array.from({length:6},(_,i)=>device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:uniform,offset:i*256,size:64}},{binding:1,resource:{buffer:outline}}]}))
    context.configure({device,format,alphaMode:'premultiplied'})
    device.addEventListener('uncapturederror',onError)
    void device.lost.then(()=>{if(!dead) {dispose();failed()}})
    const values=new Float32Array(16)
    values.set(rgb(SILK_PALETTE.ice),8);values.set(rgb(SILK_PALETTE.warm),12)
    return {dispose,render(width,height,box,time,maskCard=true) {
      if(dead||!context||!uniform) return
      try {
        if(!multisample||sampleWidth!==canvas.width||sampleHeight!==canvas.height) {
          multisample?.destroy();sampleWidth=canvas.width;sampleHeight=canvas.height
          multisample=device.createTexture({size:[sampleWidth,sampleHeight],sampleCount:4,format,usage:0x10,label:'Lumina silk MSAA'})
        }
        const encoder=device.createCommandEncoder()
        const pass=encoder.beginRenderPass({colorAttachments:[{view:multisample.createView(),resolveTarget:context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:0},loadOp:'clear',storeOp:'store'}]})
        pass.setPipeline(pipeline)
        // Restrict fragment work to the existing path's finite vertical bounds.
        const ratio=canvas.height/height
        const top=Math.max(0,Math.floor((Math.min(height-48,box.y+box.height+30)-145)*ratio))
        const bottom=Math.min(canvas.height,Math.ceil((Math.min(height-48,box.y+box.height+30)+145)*ratio))
        pass.setScissorRect(0,top,canvas.width,Math.max(0,bottom-top))
        for(let draw=0;draw<6;draw++) {
          const layer=draw%3, halo=draw<3
          values.set([width,height,time,layer,box.x,box.y,box.width,box.height]);values[11]=maskCard?1:0;values[15]=halo?1:0
          device.queue.writeBuffer(uniform,draw*256,values)
          pass.setBindGroup(0,groups[draw]!);pass.draw(halo?64*2*6:128*7*6)
        }
        pass.end();device.queue.submit([encoder.finish()])
      } catch {dispose();failed()}
    }}
  } catch(error) {
    dispose();console.warn('[ratel-lumina] silk WebGPU unavailable',error);return null
  }
}
