/** Actual bundle zoom regression. Start tools/serve-motion.mjs first. */
import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.LUMINA_PLAYWRIGHT_PATH || 'playwright')
const browser=await chromium.launch({channel:'chrome',headless:true})
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}})
  const errors=[]
  page.on('pageerror',e=>errors.push(e.message))
  await page.addInitScript(()=>{
    if(!navigator.gpu)return
    const request=navigator.gpu.requestAdapter.bind(navigator.gpu)
    navigator.gpu.requestAdapter=async opts=>{
      const adapter=await request(opts)
      if(!adapter)return adapter
      const requestDevice=adapter.requestDevice.bind(adapter)
      adapter.requestDevice=async(...args)=>{
        const device=await requestDevice(...args),write=device.queue.writeBuffer.bind(device.queue)
        device.queue.writeBuffer=(...args)=>{
          if(args[2]?.length===12)window.ribbonUniform=[...args[2]]
          return write(...args)
        }
        return device
      }
      return adapter
    }
  })
  const zoom=async(scope,value)=>{
    await page.evaluate(({scope,value})=>{
      document.documentElement.style.zoom='1';document.body.style.zoom='1'
      ;(scope==='root'?document.documentElement:document.body).style.zoom=String(value)
    },{scope,value})
    await page.waitForTimeout(200)
  }
  await page.goto('http://127.0.0.1:8766/silk-ribbon.html?focus=1')
  await page.waitForTimeout(1800)
  for(const scope of ['root','body'])for(const value of [.67,.8,1,1.2,1.5]) {
    await zoom(scope,value)
    const sample=await page.evaluate(()=>{
      const canvas=document.querySelector('.lumina-composer-ribbon'),rect=canvas.getBoundingClientRect()
      return {rect:[rect.x,rect.y,rect.width,rect.height],crop:window.ribbonUniform?.slice(8),pixels:canvas.width*canvas.height}
    })
    assert(sample.crop,'GPU uniforms missing')
    sample.rect.forEach((v,i)=>assert(Math.abs(v-sample.crop[i])<.1,JSON.stringify(sample)))
    assert(sample.rect[1]>=63.9)
    assert(sample.pixels<2405000)
    console.log('ribbon',scope,value,sample)
  }
  for(const scope of ['root','body'])for(const value of [.8,1.2]) {
    await page.goto('http://127.0.0.1:8766/send-feedback.html?mode=off')
    await zoom(scope,value)
    await page.locator('#send').click()
    const sample=await page.evaluate(()=>{
      const button=document.querySelector('#send').getBoundingClientRect(),ring=document.querySelector('.lumina-send-ripple').getBoundingClientRect()
      return {dx:ring.x+ring.width/2-button.x-button.width/2,dy:ring.y+ring.height/2-button.y-button.height/2,width:ring.width,height:ring.height}
    })
    assert(Math.abs(sample.dx)<.1&&Math.abs(sample.dy)<.1,JSON.stringify(sample))
    assert(Math.abs(sample.width-sample.height)<.1,JSON.stringify(sample))
    console.log('ripple',scope,value,sample)
  }
  assert.deepEqual(errors,[])
  console.log('all zoom cases aligned; pageerrors=[]')
} finally {await browser.close()}
