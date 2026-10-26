import { RIBBON_FLOW } from '../style/tokens.ts'
/** A shared smooth mesh preserves the SVG's folds, sharp light and local glow. */
export const artworkShader = /* wgsl */`
override columns:f32 = 256.;
struct Scene { viewport:vec4f, box:vec4f, crop:vec4f };
@group(0) @binding(0) var<uniform> scene:Scene;
@group(0) @binding(1) var art:texture_2d<f32>;
@group(0) @binding(2) var artSampler:sampler;
@group(0) @binding(3) var<storage,read> spine:array<f32>;
struct Vertex { @builtin(position) position:vec4f, @location(0) uv:vec2f, @location(1) world:vec2f };
@vertex fn vertex(@builtin(vertex_index) id:u32)->Vertex {
  let corners=array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
  let cell=id/6u;
  let uv=(vec2f(f32(cell/16u),f32(cell%16u))+corners[id%6u])/vec2f(columns,16);
  let scale=min(1.,scene.box.z/760.);
  let start=mix(max(-35.,scene.box.x-scene.box.z*.6),scene.box.x-min(460.,scene.box.z*.65),scene.viewport.w);
  let end=mix(min(scene.viewport.x+35.,scene.box.x+scene.box.z*1.18),scene.box.x+scene.box.z+min(480.,scene.box.z*.65),scene.viewport.w);
  let base=min(scene.viewport.y-48.,scene.box.y+scene.box.w+30.*scale);
  let t=scene.viewport.z;
  let envelope=sin(uv.x*3.14159265);
  let wind=(sin(uv.x*7.-t*.42)-sin(uv.x*7.))*5.
    +(sin(uv.x*13.+t*.23)-sin(uv.x*13.))*2.;
  let lateral=(sin(uv.x*9.+t*.2)-sin(uv.x*9.))*2.*envelope;
  let index=min(127u,u32(uv.x*128.));
  let reference=mix(spine[index],spine[index+1u],uv.x*128.-f32(index));
  let approach=1.-smoothstep(.08,.48,uv.x);
  let arch=sin(clamp((uv.x-.40)/.60,0.,1.)*3.14159265);
  let departure=smoothstep(.64,1.,uv.x);
  let leftU=(scene.box.x-start)/(end-start);
  let rightU=(scene.box.x+scene.box.z-start)/(end-start);
  let enter=exp(-pow((uv.x-leftU-.075)/.12,2.));
  let leave=exp(-pow((uv.x-rightU+.015)/.115,2.));
  let tuck=48.*enter+32.*leave+24.*exp(-pow((uv.x-.53)/.18,2.));
  let path=scene.box.y+scene.box.w+(22.+165.*approach+24.*arch-tuck)*scale
    -departure*(scene.box.w+155.*scale);
  let gathering=exp(-pow((uv.x-.55)/.12,2.));
  let widthScale=.95+.55*approach-.35*gathering+1.25*departure;
  let transverse=(uv.y*380.-reference)/55.;
  let lag=(sin(uv.x*10.-t*.55+transverse*.85)-sin(uv.x*10.+transverse*.85))*1.5;
  let y=mix(base+(uv.y*380.-160.)*scale,path+(uv.y*380.-reference)*scale*widthScale,scene.viewport.w);
  let p=vec2f(mix(start,end,uv.x)+lateral*scale,y+(wind+lag)*envelope*scale);
  var out:Vertex;out.position=vec4f((p.x-scene.crop.x)/scene.crop.z*2.-1.,1.-(p.y-scene.crop.y)/scene.crop.w*2.,.5,1.);
  out.uv=uv;out.world=p;return out;
}
@fragment fn fragment(input:Vertex)->@location(0) vec4f {
  let pixel=textureSample(art,artSampler,input.uv);
  let q=abs(input.world-scene.box.xy-scene.box.zw*.5)-(scene.box.zw*.5+vec2f(3))+28.;
  let distance=length(max(q,vec2f(0)))+min(max(q.x,q.y),0.)-28.;
  let mask=mix(1.,smoothstep(0.,1.5,distance),scene.viewport.w);
  let u=input.uv.x;
  let time=scene.viewport.z;
  let front=clamp(time/${RIBBON_FLOW.reveal}*1.1,0.,1.1);
  let arrival=1.-smoothstep(front-.09,front+.01,u);
  let reveal=mix(1.,arrival,scene.viewport.w);
  // Two coherent downstream bands, not a detached dot or whole-image opacity pulse.
  let travel=u-time*${RIBBON_FLOW.speed};
  let flow=pow(.5+.5*cos(travel*18.),5.);
  let secondary=pow(.5+.5*cos(travel*11.+1.7),7.);
  let energy=clamp(flow*.7+secondary*.3,0.,1.);
  let index=min(127u,u32(u*128.));
  let reference=mix(spine[index],spine[index+1u],u*128.-f32(index));
  let across=(input.uv.y*380.-reference)/30.;
  let core=exp(-across*across*.8);
  let color=pixel.rgb/max(pixel.a,.00001);
  let leftTurn=exp(-pow((input.world.x-scene.box.x+18.)/(72.*min(1.,scene.box.z/760.)),2.));
  let rightTurn=exp(-pow((input.world.x-scene.box.x-scene.box.z-30.)/(85.*min(1.,scene.box.z/760.)),2.));
  let turnLight=clamp(leftTurn+rightTurn,0.,1.)*exp(-across*across*5.);
  let energized=mix(color,vec3f(1),clamp(energy*core*.12+turnLight*.24,0.,.32));
  let screenEdge=smoothstep(0.,24.,input.world.x)*(1.-smoothstep(scene.viewport.x-60.,scene.viewport.x,input.world.x));
  let edgeFade=mix(1.,screenEdge,scene.viewport.w);
  let alpha=pixel.a*(.68+.38*energy+.10*turnLight)*mask*reveal*edgeFade;
  return vec4f(energized*alpha,alpha);
}
`;
