/** @vitest-environment jsdom */
import { afterEach, expect, it, vi } from 'vitest'
import { installPress } from '../src/client/effects/press.ts'
function face<T>(initial:T) {
  let value=initial;const listeners=new Set<()=>void>()
  return {getSnapshot:()=>value,subscribe:(f:()=>void)=>{listeners.add(f);return ()=>{listeners.delete(f)}},set:(v:T)=>{value=v;listeners.forEach(f=>f())},count:()=>listeners.size}
}
let dispose:(()=>void)|undefined
function fixture(empty=false) {
  document.documentElement.dataset.lumina='on'
  document.body.innerHTML='<div data-composer-card><div data-composer-input contenteditable="true"></div><button>menu</button><button>send</button></div>'
  const buttons=document.querySelectorAll('button'),editor=document.querySelector('[data-composer-input]')!
  buttons.forEach((b,i)=>{b.getBoundingClientRect=()=>({x:i*50,y:0,left:i*50,right:i*50+40,top:0,bottom:40,width:40,height:40,toJSON:()=>({})})})
  const current=face<{key?:string}>({key:empty?undefined:'one'})
  const session=face({pendingSubmissions:[] as Array<{requestId:string;placement:string;text:string}>})
  let stream=(_value:boolean)=>{}
  dispose=installPress({subscribe:fn=>{stream=fn;return ()=>{}},dispose:()=>{}},'normal',{uiSession:{current},sessions:{binding:()=>({session})}})
  const ring=document.querySelector('.lumina-send-ripple')!,writes=vi.spyOn(ring,'setAttribute')
  const confirm=(id='r1')=>session.set({pendingSubmissions:[{requestId:id,placement:'transcript',text:''}]})
  return {send:buttons[1]!,menu:buttons[0]!,editor,current,session,ring,writes,confirm,stream}
}
afterEach(()=>{dispose?.();dispose=undefined;document.documentElement.removeAttribute('data-lumina');document.body.innerHTML='';document.head.innerHTML='';vi.useRealTimers();vi.unstubAllGlobals()})
it('waits for a real admission and deduplicates repeated metadata and stream changes',()=>{
  vi.useFakeTimers();const f=fixture();f.send.click();expect(f.writes).not.toHaveBeenCalled()
  f.confirm();expect(f.writes).toHaveBeenCalledTimes(1)
  vi.advanceTimersByTime(6000);f.stream(true);f.confirm();expect(f.writes).toHaveBeenCalledTimes(1)
  expect(f.ring.hasAttribute('data-active')).toBe(false)
})
it('confirms keyboard sends but ignores unconfirmed newlines, IME and repeats',()=>{
  const f=fixture()
  f.editor.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true}));f.confirm('ime');expect(f.writes).not.toHaveBeenCalled()
  f.editor.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',repeat:true,bubbles:true}));f.confirm('repeat');expect(f.writes).not.toHaveBeenCalled()
  f.editor.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));expect(f.writes).not.toHaveBeenCalled()
  f.confirm('keyboard');expect(f.writes).toHaveBeenCalledTimes(1)
})
it('allows attachment-only sends and ignores unrelated controls, disabled sends and stop',()=>{
  const f=fixture();f.menu.click();f.confirm('menu');expect(f.writes).not.toHaveBeenCalled()
  f.send.disabled=true;f.send.click();f.confirm('disabled');expect(f.writes).not.toHaveBeenCalled()
  f.send.disabled=false;f.stream(true);f.send.click();f.confirm('stop');expect(f.writes).not.toHaveBeenCalled()
  f.stream(false);f.send.click();f.confirm('attachment');expect(f.writes).toHaveBeenCalledTimes(1)
})
it('preserves first-send capture when a new session is created',()=>{
  const f=fixture(true);f.send.click();f.session.set({pendingSubmissions:[{requestId:'new',placement:'transcript',text:''}]});f.current.set({key:'created'})
  expect(f.writes).toHaveBeenCalledTimes(1)
})
it('expires rejected gestures and clears pending feedback on session switch',()=>{
  vi.useFakeTimers();const f=fixture();f.send.click();vi.advanceTimersByTime(1600);f.confirm('late');expect(f.writes).not.toHaveBeenCalled()
  f.send.click();f.current.set({key:'two'});f.confirm('switched');expect(f.writes).not.toHaveBeenCalled()
})
it('clears active rings and subscriptions on resize and disposal',()=>{
  const f=fixture();f.send.click();f.confirm();expect(f.ring.hasAttribute('data-active')).toBe(true)
  window.dispatchEvent(new Event('resize'));expect(f.ring.hasAttribute('data-active')).toBe(false)
  dispose?.();expect(f.current.count()).toBe(0);expect(f.session.count()).toBe(0);expect(document.querySelector('.lumina-send-ripple')).toBeNull()
})
it('uses only a brief static outline for reduced motion',()=>{
  vi.stubGlobal('matchMedia',()=>({matches:true}));vi.useFakeTimers();const f=fixture();f.send.click();f.confirm()
  expect(f.writes).not.toHaveBeenCalled();expect(f.send.hasAttribute('data-lumina-send-pulse')).toBe(true)
  vi.advanceTimersByTime(181);expect(f.send.hasAttribute('data-lumina-send-pulse')).toBe(false)
})
it('does not acknowledge queue placements or admissions with no local gesture',()=>{
  const f=fixture();f.confirm('remote');expect(f.writes).not.toHaveBeenCalled()
  f.send.click();f.session.set({pendingSubmissions:[{requestId:'queue',placement:'queue',text:''}]});expect(f.writes).not.toHaveBeenCalled()
})

it('preserves the ripple during chat autoscroll but clears it if the composer moves',()=>{
  const f=fixture();f.send.click();f.confirm()
  const chat=document.createElement('div');document.body.append(chat);chat.dispatchEvent(new Event('scroll'))
  expect(f.ring.hasAttribute('data-active')).toBe(true)
  const original=f.send.getBoundingClientRect();f.send.getBoundingClientRect=()=>({...original,left:original.left+20,toJSON:()=>({})})
  window.dispatchEvent(new Event('scroll'));expect(f.ring.hasAttribute('data-active')).toBe(false)
})
