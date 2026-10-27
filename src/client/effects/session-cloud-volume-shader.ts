/** Shared by the approved material preview and the client renderer. */
export const CLOUD_VERTEX_SHADER = `#version 300 es
precision highp float;
out vec2 uv;
void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));uv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`
export const CLOUD_FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 uv;out vec4 frag;
uniform float time;
uniform int steps;
uniform vec3 cool;
uniform vec3 warmColor;
uniform vec3 deep;
float hash(vec3 p){p=fract(p*.3183099+vec3(.11,.37,.71));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return .55*noise(p)+.28*noise(p*2.03+3.1)+.12*noise(p*4.07+7.6)+.05*noise(p*8.11);}
vec3 field(vec3 p,float t){return vec3(fbm(p+vec3(t,0,0)),fbm(p+vec3(4.1,-t*.7,1.7)),fbm(p+vec3(9.2,3.7,t*.8)))-.5;}
void main(){
 vec2 p=(uv-.5)*2.;p.y-=.025;
 float t=time*.38;
 float a=atan(p.y,p.x);
 float radius=.57+.022*sin(a*2.+t*1.8)+.014*cos(a*3.-t*1.45);
 float r=length(p);
 float halo=exp(-pow(r/(radius*1.05),4.))*.22;
 float flowAngle=.65+.38*sin(time*.65);
 vec2 colorAxis=vec2(cos(flowAngle),sin(flowAngle));
 float colorDrift=.10+.27*sin(time*1.55);
 vec3 haloColor=mix(vec3(.12,.8,1.),vec3(1.,.53,.75),smoothstep(-.06,.38,dot(p,colorAxis)+colorDrift));
 haloColor=clamp(haloColor+(cool-vec3(.145098,.388235,.921569))*.2+(warmColor-vec3(1.,.231373,.188235))*.2,0.,1.);
 vec3 col=vec3(0);float alpha=0.;
 for(int i=0;i<48;i++){
  if(i>=steps)break;
  float z=.72-(float(i)+.5)*(1.44/float(steps));
  vec3 q=vec3(p,z);
  vec3 warp=field(q*2.6,t);
  vec3 w=q+warp*.33;
  float d=length(q)+warp.z*.025;
  float envelope=1.-smoothstep(radius-.09,radius+.035,d);
  if(envelope<.002)continue;
  float f=fbm(w*4.3+field(w*3.2,t*.7)*1.4+vec3(t*.4,-t*.3,t*.2));
  float surface=w.y+.25*sin(w.x*6.+t*1.1)+.26*sin(w.z*5.-t*.9)+warp.x*.25-.10*sin(t*1.4);
  float sheet=exp(-abs(surface)*24.);
  float second=exp(-abs(w.x+.4*w.y+.22*sin(w.z*6.+t*.5)-.18)*28.);
  sheet=max(sheet,second*.7);
  float threads=exp(-abs(f-.51)*90.);
  float dens=(24./float(steps))*envelope*(.035+.14*f+.42*sheet+.015*threads);
  float warm=smoothstep(-.06,.38,dot(w.xy,colorAxis)+warp.z*.3+colorDrift);
  vec3 blue=mix(vec3(.025,.09,.72),vec3(.04,.58,1.),smoothstep(.34,.66,f));
  vec3 pink=mix(vec3(.58,.18,.83),vec3(1.,.38,.46),smoothstep(.36,.65,f));
  vec3 color=mix(blue,pink,warm);
  color=clamp(color+(cool-vec3(.145098,.388235,.921569))*(1.-warm)*.55+(warmColor-vec3(1.,.231373,.188235))*warm*.55+(deep-vec3(.062745,.172549,.509804))*.15,0.,1.);
  float membrane=clamp(sheet*.96+threads*.07,0.,.94);
  color=mix(color,mix(vec3(.79,1.,1.),vec3(1.,.88,.88),warm),membrane);
  float edge=pow(clamp(d/radius,0.,1.),5.);
  color=mix(color,mix(vec3(.15,.94,1.),vec3(1.,.69,.87),warm),edge*.45);
  col+=(1.-alpha)*dens*color;alpha+=(1.-alpha)*dens;
 }
 float total=alpha+(1.-alpha)*halo;
 col+=(1.-alpha)*halo*haloColor;
 frag=vec4(col/max(total,.0001),total);
}`
