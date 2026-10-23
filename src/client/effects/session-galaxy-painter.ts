/** Shared by client and preview: preserve the approved drawing, scale geometry only. */
import { SESSION_GALAXY_PALETTE as palette } from '../style/tokens.ts'
type Star = {u:number;v:number;speed:number;phase:number;size:number}
const random=(n: number)=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v)};
// Smooth seeded noise interpolates between stable targets; no per-frame jitter.
function noise(t: number,seed: number){const i=Math.floor(t),f=t-i,u=f*f*f*(f*(f*6-15)+10);return random(i+seed)*(1-u)+random(i+1+seed)*u}
function curve(x: number,t: number,l: number){
  const bend=noise(t*.23,83)*2-1;
  const amp=2.4+noise(t*.19,255)*2.2;
  const wave=Math.sin(x*(.019+bend*.006)-t*.62+l*.48)*amp
    +Math.sin(x*.039-t*.37+l*.7)*1.3
    +(noise(x*.013-t*.22,390+l*.07)-.5)*3;
  // Bound the river to the lower portion even when waves reinforce each other.
  return 42+Math.tanh(wave/5)*5.5+(l-1)*1.7;
}
function travel(t: number,star: Star){return star.speed*(t+.32/.43*(Math.sin(t*.43+star.phase)-Math.sin(star.phase))+.18/.17*(Math.sin(t*.17+star.phase*1.7)-Math.sin(star.phase*1.7)))}


export function createGalaxyPainter(seed = 0) {
function sprite(size: number,stops: Array<[number,string]>){const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d')!,r=size/2,v=g.createRadialGradient(r,r,0,r,r,r);for(const [at,color]of stops)v.addColorStop(at,color);g.fillStyle=v;g.fillRect(0,0,size,size);return c}
const mistBlue=sprite(64,[[0,palette[0]!],[.5,palette[1]!],[1,palette[2]!]]);
const mistWarm=sprite(64,[[0,palette[3]!],[.5,palette[1]!],[1,palette[2]!]]);
const starGlow=sprite(24,[[0,palette[4]!],[.25,palette[5]!],[1,palette[6]!]]);


const stars: Star[]=Array.from({length:44},(_,i)=>({u:random(i+seed*71),v:random(i+304),speed:.035+random(i+801)*.04,phase:random(i+901)*6.28,size:.35+random(i+51)*.85}));
return (g: CanvasRenderingContext2D, width: number, height: number, time: number, dark: boolean) => {
time+=seed*7.31;
const w=width,h=52;g.save();g.scale(1,height/h);
// Broad translucent mist follows the river, with bounded local gradients.
for(let k=0;k<10;k++){const x=(k/9)*w+Math.sin(time*.31+k*1.7)*12,y=curve(x,time,1);const size=52+noise(time*.24+k,117)*20;g.globalAlpha=.55+.45*noise(time*.28+k,427);g.drawImage(k%3===0?mistWarm:mistBlue,x-size/2,y-22,size,44)}
g.globalAlpha=1;
// Fine continuous filaments with drifting density, brighter at the center.
for(let l=0;l<10;l++){g.beginPath();for(let x=-8;x<=w+8;x+=6){const y=curve(x,time,l/7)+Math.sin(x*.032-time*.53+l*.3)*(l-5)*.62;x===-8?g.moveTo(x,y):g.lineTo(x,y)}const grad=g.createLinearGradient(0,0,w,0);const alpha=.28+.30*(.5+.5*Math.sin(time*.3+l*.9));grad.addColorStop(0,palette[7]!);const drift=.06*Math.sin(time*.48+l*.7);grad.addColorStop(.25+drift,`rgba(${palette[palette.length-3]},${alpha})`);grad.addColorStop(.55+drift,`rgba(${palette[palette.length-2]},${alpha+.12})`);grad.addColorStop(.8+drift,`rgba(${palette[palette.length-1]},${alpha})`);grad.addColorStop(1,palette[8]!);g.globalAlpha=.45+.55*noise(time*.17+l*.8,701);g.strokeStyle=grad;g.lineWidth=l===7?1.65:.7;g.stroke()}
g.globalAlpha=1;
// Moving light cores remain separate from the slow silhouette.
for(let j=0;j<3;j++){
  const phase=j*2.13;
  const flow={speed:.045+j*.014,phase,u:0,v:0,size:0};
  const center=((travel(time,flow)+j*.337)%1)*(w+160)-80;
  const reach=26+noise(time*.29,620+j*17)*30;
  const grad=g.createLinearGradient(center-reach,0,center+reach,0);
  grad.addColorStop(0,palette[9]!);grad.addColorStop(.4,palette[10]!);
  grad.addColorStop(.68,palette[11]!);grad.addColorStop(1,palette[12]!);
  g.beginPath();for(let x=center-reach;x<center+reach;x+=2){const y=curve(x,time,j*.6);x===center-reach?g.moveTo(x,y):g.lineTo(x,y)}
  g.globalAlpha=.65+.35*noise(time*.38,830+j);g.strokeStyle=grad;
  g.lineWidth=1.4+noise(time*.32,910+j)*.9;g.stroke();
}
g.globalAlpha=1;
for(const star of stars){const u=(star.u+travel(time,star))%1,x=u*w,spread=(star.v-.5)*(8+noise(time*.24+u*2,star.phase*17)*10);const y=curve(x,time,1)+spread;const envelope=Math.sin(u*Math.PI);const pulse=.65+.35*Math.sin(time*.75+star.phase);const density=.4+.6*noise(u*4-time*.25,513+seed*31);const alpha=Math.min(1,envelope*pulse*density*1.8);const radius=star.size;g.globalAlpha=alpha;g.fillStyle=dark?palette[13]!:palette[14]!;g.beginPath();g.arc(x,y,radius+ .4,0,Math.PI*2);g.fill();g.fillStyle=palette[15]!;g.beginPath();g.arc(x,y,radius*.68,0,Math.PI*2);g.fill();if(star.size>1.02){g.drawImage(starGlow,x-6,y-6,12,12);g.strokeStyle=palette[16]!;g.lineWidth=.55;g.beginPath();g.moveTo(x-2.8,y);g.lineTo(x+2.8,y);g.moveTo(x,y-2.8);g.lineTo(x,y+2.8);g.stroke()}}g.globalAlpha=1;

// Keep the title zone quiet and soften both edges of the lower river.
const veil=g.createLinearGradient(0,0,0,h);
veil.addColorStop(0,'rgba(0,0,0,0)');
veil.addColorStop(.48,'rgba(0,0,0,0)');
veil.addColorStop(.65,'rgba(0,0,0,.18)');
veil.addColorStop(.78,'rgba(0,0,0,1)');
veil.addColorStop(.93,'rgba(0,0,0,1)');
veil.addColorStop(1,'rgba(0,0,0,.25)');
g.globalCompositeOperation='destination-in';g.fillStyle=veil;g.fillRect(0,0,w,h);
g.restore();
}
}
