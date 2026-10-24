/** Continuous light sheets and fine caustic strands; no filters or layout reads. */
import { SILK_PALETTE as colors } from '../style/tokens.ts'
export interface RibbonBox { x: number; y: number; width: number; height: number }
export function paintComposerRibbon(g: CanvasRenderingContext2D, w: number, h: number, box: RibbonBox, time: number) {
  g.clearRect(0, 0, w, h)
  g.save()
  const mask = new Path2D()
  mask.rect(0, 0, w, h)
  mask.roundRect(box.x - 3, box.y - 3, box.width + 6, box.height + 6, 28)
  g.clip(mask, 'evenodd')
  // Compose around the card, rather than stretching decoration across the viewport.
  const scale = Math.min(1, box.width / 760)
  const startX = Math.max(-35, box.x - box.width * .6)
  const endX = Math.min(w + 35, box.x + box.width * 1.18)
  const baseY = Math.min(h - 48, box.y + box.height + 30 * scale)
  const envelope = (u: number) => Math.sin(Math.PI*u) ** 1.1 * scale
  const point = (u: number, lane: number): [number, number] => {
    const x = startX + (endX - startX) * u
    const arc = Math.sin(u * Math.PI * 2 + .65) * 42 * scale
    const wave = Math.sin(u*8-time*.42+lane*.71)*14 + Math.sin(u*13+time*.23+lane*1.3)*3
    return [x, baseY + arc + envelope(u)*(wave + lane*1.7)]
  }
  const trace = (points: Array<[number, number]>) => {
    g.beginPath()
    points.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y))
  }
  const gradient = (color: string, alpha: number) => {
    const fill = g.createLinearGradient(startX, 0, endX, 0)
    fill.addColorStop(0,`${color}0)`)
    fill.addColorStop(.2,`${color}${alpha*.4})`)
    fill.addColorStop(.55,`${color}${alpha})`)
    fill.addColorStop(.79,`${color}${alpha*.8})`)
    fill.addColorStop(1,`${color}0)`)
    return fill
  }
  // A small number of twisted surfaces, shaded across their cross section.
  // The centerline and extent above are deliberately unchanged in this iteration.
  for (let layer=0;layer<3;layer++) {
    const lane=(layer-1)*2.4
    const samples: Array<{x:number;y:number;nx:number;ny:number;radius:number;turn:number}>=[]
    for(let i=0;i<=128;i++) {
      const u=i/128, [x,y]=point(u,lane)
      const [ax,ay]=point(Math.max(0,u-.002),lane)
      const [bx,by]=point(Math.min(1,u+.002),lane)
      const length=Math.hypot(bx-ax,by-ay)||1
      const turn=u*7.8-time*.24+layer*1.65
      samples.push({x,y,nx:-(by-ay)/length,ny:(bx-ax)/length,
        radius:envelope(u)*(12+26*Math.abs(Math.cos(turn))),turn})
    }
    const band=(from:number,to:number) => {
      const points: Array<[number,number]>=[]
      for(const p of samples) points.push([p.x+p.nx*p.radius*from,p.y+p.ny*p.radius*from])
      for(let i=samples.length-1;i>=0;i--) {const p=samples[i]!;points.push([p.x+p.nx*p.radius*to,p.y+p.ny*p.radius*to])}
      trace(points);g.closePath()
    }
    // Nested translucent broad areas supply a soft edge without any blur filter.
    for(let halo=3;halo>=1;halo--) {
      band(-1-halo*.18,1+halo*.18)
      g.fillStyle=gradient(layer===1?colors.warm:colors.ice,.018);g.fill()
    }
    // Adjacent strips shade a curved membrane: saturated rim, clear body, white reflection.
    const strips=48
    for(let j=0;j<strips;j++) {
      const v=-1+j*2/strips, next=-1+(j+1)*2/strips
      band(v,Math.min(1,next+.004))
      const middle=(v+next)/2
      const rim=Math.abs(middle)**3
      const reflection=Math.exp(-(((middle+.25)/.24)**2))
      const fill=g.createLinearGradient(startX,0,endX,0)
      const alpha=(.055+rim*.15+reflection*.2)
      const tint=layer===1?colors.warm:colors.ice
      fill.addColorStop(0,`${tint}0)`)
      fill.addColorStop(.18,`${tint}${alpha*.45})`)
      fill.addColorStop(.4,`${tint}${alpha})`)
      fill.addColorStop(.6,`${reflection>.35?colors.white:tint}${alpha})`)
      fill.addColorStop(.82,`${tint}${alpha*.7})`)
      fill.addColorStop(1,`${tint}0)`)
      g.fillStyle=fill;g.fill()
    }
    // One bright folded edge per surface, with a broad translucent colored rim.
    const edge: Array<[number,number]>=[]
    for(const p of samples) {
      const side=Math.sin(p.turn)*.82
      edge.push([p.x+p.nx*p.radius*side,p.y+p.ny*p.radius*side])
    }
    trace(edge);g.lineWidth=4;g.strokeStyle=gradient(layer===1?colors.warm:colors.ice,.16);g.stroke()
    trace(edge);g.lineWidth=1.25;g.strokeStyle=gradient(colors.white,.95);g.stroke()
  }
  g.restore()
}
