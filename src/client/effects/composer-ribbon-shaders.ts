/** Parametric translucent silk. Shared by the client and its material fixture. */
export const ribbonShader = /* wgsl */`
struct Scene {
  viewport: vec4f,
  box: vec4f,
  ice: vec4f,
  warm: vec4f,
};
@group(0) @binding(0) var<uniform> scene: Scene;
@group(0) @binding(1) var<storage, read> outline: array<vec4f>;
struct Vertex {
  @builtin(position) position: vec4f,
  @location(0) world: vec3f,
  @location(1) uv: vec2f,
};
fn surface(u: f32, v: f32) -> vec3f {
  let scale = min(1., scene.box.z / 760.);
  let layer = scene.viewport.w;
  let t = scene.viewport.z;
  let start = max(-35., scene.box.x - scene.box.z*.6);
  let end = min(scene.viewport.x+35., scene.box.x+scene.box.z*1.18);
  let taper = pow(max(0.,sin(u*3.14159265)), .9);
  let halo=scene.warm.w;
  let phase=layer*2.1;
  let index=min(127u,u32(u*128.));
  let fraction=clamp(u*128.-f32(index),0.,1.);
  let offset=u32(layer)*129u+index;
  let edges=mix(outline[offset],outline[offset+1u],fraction);
  let center=(edges.y+edges.w)*.5;
  let halfWidth=(edges.w-edges.y)*.5;
  // At t=0 the projected outline is exactly the authored SVG. Motion stays bounded.
  let drift=(sin(u*6.+phase+t*.29)-sin(u*6.+phase))*7.*taper;
  let breathing=1.+.05*(sin(t*.31+phase)-sin(phase));
  let transverse=v*halfWidth*breathing*(1.+halo*.6);
  let base=min(scene.viewport.y-48.,scene.box.y+scene.box.w+30.*scale);
  return vec3f(mix(start,end,mix(edges.x,edges.z,(v+1.)*.5)),
    base+(center+transverse+drift)*scale,
    (transverse*sin(u*6.+phase+t*.2)*.65+9.*v*v*taper)*scale);

}
@vertex fn vertex(@builtin(vertex_index) id: u32) -> Vertex {
  let cell = id/6u;
  let corner = id%6u;
  let corners = array<vec2f,6>(vec2f(0,0),vec2f(1,0),vec2f(0,1),vec2f(0,1),vec2f(1,0),vec2f(1,1));
  let across=select(7u,2u,scene.warm.w>.5);
  let along=select(128.,64.,scene.warm.w>.5);
  let grid = vec2f(f32(cell/across),f32(cell%across))+corners[corner];
  let uv = vec2f(grid.x/along,grid.y/f32(across)*2.-1.);
  let p = surface(uv.x,uv.y);
  var result: Vertex;
  result.position = vec4f(p.x/scene.viewport.x*2.-1.,1.-p.y/scene.viewport.y*2.,.5,1.);
  result.world=p; result.uv=uv;
  return result;
}
fn roundBox(p: vec2f, halfSize: vec2f, radius: f32) -> f32 {
  let q=abs(p)-halfSize+radius;
  return length(max(q,vec2f(0)))+min(max(q.x,q.y),0.)-radius;
}
@fragment fn fragment(input: Vertex) -> @location(0) vec4f {
  let u=input.uv.x; let v=input.uv.y;
  let du=surface(min(.9999,u+.0004),v)-surface(max(.0001,u-.0004),v);
  let dv=surface(u,min(1.,v+.001))-surface(u,max(-1.,v-.001));
  let rawNormal=cross(du,dv);
  let normal=rawNormal/max(length(rawNormal),.00001);
  let n=select(-normal,normal,normal.z>0.);
  let view=vec3f(0,0,1);
  let light=normalize(vec3f(-.2,-.65,1.));
  let facing=clamp(dot(n,view),0.,1.);
  let halfLight=normalize(light+view);
  let broad=pow(max(0.,dot(n,halfLight)),7.);
  let gloss=pow(max(0.,dot(n,halfLight)),64.);
  let fresnel=pow(1.-facing,3.);
  let local=exp(-pow((u-.48)/.23,2.));
  let reflection=exp(-pow((v+.32+.23*sin(u*8.+scene.viewport.w))/ .25,2.));
  let edge=pow(abs(v),5.);
  let fold=v+.16+.36*sin(u*9.-scene.viewport.z*.23+scene.viewport.w*1.6);
  let aaFold=max(.035,fwidth(v)*1.4);
  let caustic=(exp(-pow(fold/aaFold,2.))
    +.26*exp(-pow((v-.78)/max(.045,fwidth(v)*1.5),2.)))*(.12+.88*local);
  let pleat=.5+.5*sin(v*10.+u*15.-scene.viewport.z*.16+scene.viewport.w);
  // Give the coral membrane its own identity instead of averaging all layers to grey.
  let red=select(.08+.12*sin(u*9.),.86+.12*sin(u*7.),scene.viewport.w==1.);
  let base=mix(scene.ice.rgb,scene.warm.rgb,clamp(red,0.,1.));
  let color=mix(base,base*base,.85);
  // White needs a colored near field on a white page; raising white alone is invisible.
  let core=exp(-pow(fold/max(.055,fwidth(v)*1.6),2.))*(.2+.8*local);
  let near=exp(-pow(fold/.29,2.))*(.35+.65*local);
  let shine=clamp(broad*.08+gloss*.18+reflection*local*.2+fresnel*.09+core*1.4,0.,1.);
  let rgb=mix(color,vec3f(1),shine);
  let ends=smoothstep(0.,.13,u)*(1.-smoothstep(.82,1.,u));
  let aa=max(.045,fwidth(v)*1.5);
  let rim=1.-smoothstep(1.-aa,1.,abs(v));
  let card=scene.box.xy+scene.box.zw*.5;
  let distance=roundBox(input.world.xy-card,scene.box.zw*.5+vec2f(3),28.);
  let mask=mix(1.,smoothstep(0.,1.5,distance),scene.ice.w);
  let halo=scene.warm.w;
  let soft=pow(max(0.,1.-v*v),2.5);
  let body=.09+pleat*.055+edge*.16+near*.4+reflection*local*.13+gloss*.1+core*.85+caustic*.12;
  let aura=soft*(.11+local*.14)+exp(-pow(v/.4,2.))*local*.13;
  let alpha=clamp(mix(body,aura,halo)*ends*rim*mask,0.,.95);
  let output=mix(rgb,color,halo);
  return vec4f(output*alpha,alpha);
}
`;
