import { RIBBON_FLOW } from '../style/tokens.ts'

/** Transparent folded films. All geometry is anchored to the live composer in CSS pixels. */
export const artworkShader = /* wgsl */`
override columns:f32 = 256.;
struct Scene { viewport:vec4f, box:vec4f, crop:vec4f };
@group(0) @binding(0) var<uniform> scene:Scene;
struct Vertex {
  @builtin(position) position:vec4f, @location(0) uv:vec2f,
  @location(1) world:vec2f, @location(2) @interpolate(flat) film:f32
};
fn path(u:f32)->vec2f {
  let box=scene.box;
  let scale=min(1.,box.z/760.);
  let left=max(-20.,box.x-min(450.,box.z*.63));
  let right=min(scene.viewport.x-min(64.,scene.viewport.x*.055),box.x+box.z+min(425.,box.z*.60));
  // A horizontal parameter keeps the tip moving outward even in narrow windows.
  let x=mix(left,right,u);
  let span=max(1.,right-left);
  let valley=(box.x-left)*.38/span;
  let spread=max(.16,(box.x-left)*.76/span);
  let d=(u-valley)/spread;
  let sag=116.*scale*exp(-d*d);
  // The lift starts beneath the card. A cubic gives the departure zero
  // slope and curvature at its join, and scales its rise with available room.
  let launch=box.x+.58*box.z;
  let run=max(1.,right-launch);
  let rise=min(box.w+72.*scale,run*.39);
  let lift=max(0.,(x-launch)/run);
  let client=vec2f(x,box.y+box.w+16.*scale+sag-rise*lift*lift*lift);
  return mix(vec2f(u*scene.viewport.x,scene.viewport.y*(.62+.16*sin(u*6.1))),client,scene.viewport.w);
}
fn roll(u:f32, film:f32)->f32 {
  let turn=.42+u*11.8+film*.91+.32*sin(u*14.-scene.viewport.z*.62);
  // Open the ascending face towards the viewer as it reaches the light.
  return mix(turn,12.15+film*.34+.12*sin(scene.viewport.z*.62-u*4.),smoothstep(.80,.96,u));
}
@vertex fn vertex(@builtin(vertex_index) id:u32,@builtin(instance_index) layer:u32)->Vertex {
  let corners=array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
  let cell=id/6u;
  let uv=(vec2f(f32(cell/16u),f32(cell%16u))+corners[id%6u])/vec2f(columns,16);
  let u=uv.x; let v=uv.y*2.-1.; let film=f32(layer);
  let tangent=normalize(path(min(1.,u+.001))-path(max(0.,u-.001)));
  let side=vec2f(-tangent.y,tangent.x);
  let taper=(1.-.30*smoothstep(.85,1.,u))*smoothstep(0.,.14,u);
  let scale=min(1.,scene.box.z/760.);
  let width=(34.+11.*cos(u*12.))*scale*taper;
  let a=roll(u,film);
  let across=width*(v*cos(a)-(.52*v*v-.18)*sin(a));
  let drift=sin(u*14.-scene.viewport.z*.62)*3.*scale*taper;
  let world=path(u)+side*(across+drift+film*width*.42*sin(u*15.));
  let ndc=(world-scene.crop.xy)/scene.crop.zw*vec2f(2,-2)+vec2f(-1,1);
  return Vertex(vec4f(ndc,.5,1),uv,world,film);
}
fn band(d:f32,w:f32)->f32 { return exp(-d*d/(w*w)); }
@fragment fn fragment(input:Vertex)->@location(0) vec4f {
  let u=input.uv.x; let v=input.uv.y*2.-1.; let t=scene.viewport.z;
  let q=abs(input.world-scene.box.xy-scene.box.zw*.5)-(scene.box.zw*.5+vec2f(3))+28.;
  let clip=length(max(q,vec2f(0)))+min(max(q.x,q.y),0.)-28.;
  let front=clamp(t/${RIBBON_FLOW.reveal}*1.1,0.,1.1);
  let mask=mix(1.,smoothstep(0.,1.5,clip)*(1.-smoothstep(front-.09,front+.01,u)),scene.viewport.w);
  let a=roll(u,input.film)+atan(1.04*v);
  let grazing=pow(1.-abs(cos(a)),1.6);
  let copper=smoothstep(.27,.91,sin(u*16.+v*2.5+input.film));
  let dark=mix(vec3f(.15,.30,.54),vec3f(.69,.31,.21),copper);
  let edge=1.-smoothstep(0.,max(.043,fwidth(v)*1.3),1.-abs(v));
  let crease=v-.58*sin(u*23.+input.film+.21*sin(t*.62-u*9.));
  let aa=max(fwidth(v),.015);
  let line=band(crease,max(.032,aa));
  let shadow=band(crease+.115,.145);
  let moving=.5+.5*cos((u-t*${RIBBON_FLOW.speed})*19.+input.film);
  let spec=band(sin(a+u*4.),.10)*(.2+.8*moving);
  let flash=clamp((line+edge)*(.35+.65*moving)+spec,0.,1.);
  let color=mix(dark,mix(vec3f(.92,.97,1.),vec3f(1.,.85,.72),copper),flash);
  let alpha=clamp(.055+.48*grazing+.29*shadow+.56*flash,0.,.90)
    *mix(1.,.62,input.film)*mask*smoothstep(0.,.12,u)*(1.-smoothstep(.865,1.,u+abs(v)*.022));
  return vec4f(color*alpha,alpha);
}
`;
