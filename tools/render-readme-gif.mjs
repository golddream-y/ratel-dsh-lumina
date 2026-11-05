/** Animate approved README artwork without regenerating its text. Requires ffmpeg and Playwright. */
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
import {spawnSync} from 'node:child_process'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.LUMINA_PLAYWRIGHT_PATH||'playwright')
const width=1140,height=494,fps=20,seconds=6,frames=fps*seconds
const root=process.cwd(),scratch=path.join(root,'.local/diagnostics/2026-11-05-banner-vivid')
fs.mkdirSync(scratch,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'chrome'})
try{
 const page=await browser.newPage({viewport:{width,height}})
 await page.setContent('<!doctype html><meta charset="utf-8"><style>body{margin:0}canvas{display:block}</style><canvas></canvas>')
 await page.evaluate(({width,height})=>{
  const canvas=document.querySelector('canvas');canvas.width=width;canvas.height=height
  const gl=canvas.getContext('webgl',{alpha:false,preserveDrawingBuffer:true})
  if(!gl)throw Error('WebGL unavailable')
  const vertex='attribute vec2 p; varying vec2 uv;void main(){uv=vec2((p.x+1.)*.5,(1.-p.y)*.5);gl_Position=vec4(p,0.,1.);}'
  const fragment=`precision highp float;varying vec2 uv;uniform sampler2D image;uniform float phase;
  float line(vec2 p,vec2 a,vec2 b,out float u){vec2 d=b-a;u=clamp(dot(p-a,d)/dot(d,d),0.,1.);return length((p-a)-d*u);}
  float rect(vec2 p,vec2 lo,vec2 hi){return smoothstep(lo.x-.012,lo.x,p.x)*(1.-smoothstep(hi.x,hi.x+.012,p.x))*smoothstep(lo.y-.012,lo.y,p.y)*(1.-smoothstep(hi.y,hi.y+.012,p.y));}
  void main(){vec2 p=uv;float best=9.,s=0.,u,d;
  d=line(p,vec2(-.04,.69),vec2(.15,.79),u);if(d<best){best=d;s=u*.12;}
  d=line(p,vec2(.15,.79),vec2(.29,.92),u);if(d<best){best=d;s=.12+u*.13;}
  d=line(p,vec2(.29,.92),vec2(.43,.88),u);if(d<best){best=d;s=.25+u*.12;}
  d=line(p,vec2(.43,.88),vec2(.55,.74),u);if(d<best){best=d;s=.37+u*.13;}
  d=line(p,vec2(.55,.74),vec2(.75,.71),u);if(d<best){best=d;s=.50+u*.15;}
  d=line(p,vec2(.75,.71),vec2(.94,.58),u);if(d<best){best=d;s=.65+u*.13;}
  d=line(p,vec2(.94,.58),vec2(.975,.46),u);if(d<best){best=d;s=.78+u*.08;}
  d=line(p,vec2(.975,.46),vec2(.95,.35),u);if(d<best){best=d;s=.86+u*.07;}
  d=line(p,vec2(.95,.35),vec2(.865,.21),u);if(d<best){best=d;s=.93+u*.07;}
  float mask=exp(-best*best/.0025);
  float protected=max(rect(p,vec2(0.,0.),vec2(.375,.76)),max(rect(p,vec2(.395,.08),vec2(.52,.85)),max(rect(p,vec2(.57,.28),vec2(.925,.68)),rect(p,vec2(.555,.74),vec2(.93,.86)))));
  protected=max(protected,rect(p,vec2(.70,.13),vec2(.91,.27)));
  float frameMask=0.;
  if(p.y>.04&&p.y<.9){frameMask=max(exp(-pow(p.x-(.409-.027*p.y),2.)/.00008),exp(-pow(p.x-.944,2.)/.00008));}
  if(p.x>.38&&p.x<.95){frameMask=max(frameMask,max(exp(-pow(p.y-(.230-.21*p.x),2.)/.00008),exp(-pow(p.y-(.84+.052*p.x),2.)/.00008)));}
  mask*=(1.-protected)*(1.-frameMask);
  float t=phase*6.28318530718;
  vec2 shift=vec2(sin(t+s*10.)*.011,sin(t+s*13.)*.026+sin(t*2.+s*19.)*.006)*mask;
  vec3 color=texture2D(image,p+shift).rgb;
  float traveling=pow(.5+.5*cos(6.28318530718*(s-phase*2.)),12.);
  float highlight=traveling*exp(-best*best/.0006)*mask*.58;
  vec3 glow=mix(vec3(.48,.76,1.),vec3(1.,.65,.59),.5+.5*sin(t+s*8.));
  color=mix(color,glow,highlight*.3);
  color=mix(color,vec3(1.,.985,.975),highlight);
  float light=sin(t*2.)*.5+.5;
  vec2 orb=(p-vec2(.418,.637))*vec2(2.305,1.);
  float halo=exp(-dot(orb,orb)/(.00025*(.85+.25*sin(t*2.))))*.48;
  color=mix(color,mix(vec3(.45,.73,1.),vec3(1.,.56,.59),light),halo);
  gl_FragColor=vec4(color,1.);
  }`
  const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
  const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program)
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW)
  const location=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0)
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE)
  const phase=gl.getUniformLocation(program,'phase')
  window.loadArt=async data=>{const img=new Image();img.src=data;await img.decode();gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,img)}
  window.frame=t=>{gl.uniform1f(phase,t);gl.drawArrays(gl.TRIANGLES,0,3);gl.finish();return canvas.toDataURL('image/png').split(',')[1]}
 },{width,height})
 for(const lang of ['zh-CN','en']){
  const source=path.join(root,`assets/readme/hero-${lang}-2026-11.webp`)
  await page.evaluate(data=>loadArt(data),'data:image/webp;base64,'+fs.readFileSync(source).toString('base64'))
  const dir=path.join(scratch,lang);fs.mkdirSync(dir,{recursive:true})
  for(let i=0;i<frames;i++){
   const png=await page.evaluate(t=>frame(t),i/frames)
   fs.writeFileSync(path.join(dir,`${String(i).padStart(3,'0')}.png`),Buffer.from(png,'base64'))
  }
  const destination=path.join(root,`assets/readme/hero-${lang}-2026-11.gif`)
  const result=spawnSync('ffmpeg',['-y','-v','error','-framerate',String(fps),'-i',path.join(dir,'%03d.png'),'-filter_complex','[0:v]split[a][b];[a]palettegen=stats_mode=full:reserve_transparent=1[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle','-gifflags','+transdiff','-loop','0',destination],{encoding:'utf8'})
  if(result.status!==0)throw Error(result.stderr)
  console.log(JSON.stringify({lang,destination,width,height,fps,seconds,frames,bytes:fs.statSync(destination).size}))
 }
}finally{await browser.close()}
