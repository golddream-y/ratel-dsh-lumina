import { describe,it,expect } from 'vitest'
import { ribbonViewport } from '../src/client/effects/composer-ribbon-bounds.ts'
describe('ribbon compositor footprint',()=>{
  it('leaves the native titlebar outside the canvas and bounds the buffer to the ribbon',()=>{
    const bounds=ribbonViewport(1440,1000,{x:508,y:576,width:652,height:136})!
    expect(bounds.y).toBeGreaterThanOrEqual(64)
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.x+bounds.width).toBeLessThanOrEqual(1440)
    expect(bounds.y+bounds.height).toBeLessThanOrEqual(1000)
    expect(bounds.height).toBeLessThan(650)
  })
  it('clips an unusually high composer instead of covering window controls',()=>{
    const bounds=ribbonViewport(800,400,{x:20,y:0,width:760,height:100})!
    expect(bounds.y).toBe(64)
    expect(bounds.height).toBeGreaterThan(0)
  })
  it('does not mount a surface when there is no drawable space below the titlebar',()=>{
    expect(ribbonViewport(800,50,{x:20,y:0,width:760,height:40})).toBeNull()
  })
})
