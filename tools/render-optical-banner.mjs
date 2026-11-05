/** Animate illumination on the approved optical artwork without displacing its pixels. */
import fs from 'node:fs'
import {createRequire} from 'node:module'
import {spawnSync} from 'node:child_process'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.LUMINA_PLAYWRIGHT_PATH||'playwright')
const dir='.local/diagnostics/2026-11-05-optical-gif'
fs.mkdirSync(dir,{recursive:true})
const browser=await chromium.launch({channel:'chrome',headless:true})
try {
 const page=await browser.newPage({viewport:{width:1440,height:625}})
 await page.setContent('<style>body{margin:0}canvas{display:block}</style><canvas width="1440" height="625"></canvas>')
 await page.evaluate(async data=>{
  const canvas=document.querySelector('canvas'),gl=canvas.getContext('webgl2',{preserveDrawingBuffer:true})
  const compile=(kind,source)=>{const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
  const p=gl.createProgram()
  gl.attachShader(p,compile(gl.VERTEX_SHADER,`#version 300 es
  precision highp float;out vec2 uv;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));uv=vec2(p.x,1.-p.y);gl_Position=vec4(p*2.-1.,0.,1.);}`))
  gl.attachShader(p,compile(gl.FRAGMENT_SHADER,`#version 300 es
  precision highp float;in vec2 uv;out vec4 frag;uniform sampler2D art;uniform float t;
  const vec2 points[12]=vec2[](vec2(-80,565),vec2(180,665),vec2(430,756),vec2(680,778),vec2(900,698),vec2(1080,600),vec2(1370,573),vec2(1650,530),vec2(1830,440),vec2(1870,335),vec2(1790,255),vec2(1640,180));
  const float widths[12]=float[](85.,70.,65.,55.,65.,35.,35.,48.,55.,40.,25.,2.);
  void main(){vec3 base=texture(art,uv).rgb;vec2 pixel=uv*vec2(1904,826);float best=1e5,s=0.,w=0.;
   for(int i=0;i<11;i++){vec2 a=points[i],b=points[i+1],v=b-a;float h=clamp(dot(pixel-a,v)/dot(v,v),0.,1.);float d=length(pixel-a-h*v);if(d<best){best=d;s=(float(i)+h)/11.;w=mix(widths[i],widths[i+1],h);}}
   float surface=exp(-pow(best/max(w,1.),4.));
   // Keep the composer, sidebar and code panel out of the foreground lighting pass.
   if(pixel.x>1040.&&pixel.x<1765.&&pixel.y>607.&&pixel.y<695.)surface=0.;
   if(pixel.x>740.&&pixel.x<1000.&&pixel.y<704.)surface=0.;
   float chroma=max(base.r,max(base.g,base.b))-min(base.r,min(base.g,base.b));
   surface*=smoothstep(.015,.16,chroma);
   float wave=.5+.5*cos(s*18.8495559-t*2.);
   float packet=pow(wave,7.);float shade=.9+.1*sin(s*12.56637-t);
   vec3 lit=base*mix(1.,shade,surface);
   vec3 tint=mix(vec3(.44,.76,1.),vec3(1.,.65,.48),.5+.5*sin(s*12.-t));
   lit=mix(lit,vec3(1.),surface*packet*.44);
   lit+=tint*surface*packet*.055;
   vec2 q=(pixel-vec2(795,527))/vec2(19,22);float orb=1.-smoothstep(.65,1.25,length(q));
   vec3 orbColor=mix(base,base.bgr,.5+.5*sin(t*2.+atan(q.y,q.x)));lit=mix(lit,orbColor,orb*.8);
   frag=vec4(clamp(lit,0.,1.),1.);
  }`))
  gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));gl.useProgram(p)
  const im=new Image();im.src=data;await im.decode();const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im)
  window.frame=phase=>{gl.uniform1f(gl.getUniformLocation(p,'t'),phase*Math.PI*2);gl.drawArrays(gl.TRIANGLES,0,3);gl.finish();return canvas.toDataURL().split(',')[1]}
 },'data:image/png;base64,'+fs.readFileSync('assets/readme/hero-zh-CN-optical-v2.png').toString('base64'))
 for(let i=0;i<144;i++)fs.writeFileSync(`${dir}/${String(i).padStart(3,'0')}.png`,Buffer.from(await page.evaluate(p=>frame(p),i/144),'base64'))
 const out='assets/readme/hero-zh-CN-optical-motion.gif'
 const result=spawnSync('/opt/homebrew/bin/ffmpeg',['-y','-v','error','-framerate','24','-i',`${dir}/%03d.png`,'-filter_complex','[0:v]split[a][b];[a]palettegen=stats_mode=full:reserve_transparent=1[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle','-gifflags','+transdiff','-loop','0',out],{encoding:'utf8'})
 if(result.status!==0)throw Error(result.stderr)
 console.log(JSON.stringify({out,bytes:fs.statSync(out).size,frames:144,seconds:6}))
} finally {await browser.close()}
