/** Actual installed bundle: fresh defaults and 0.7.0 persisted preferences. */
import fs from 'node:fs'
import path from 'node:path'
import {execFileSync} from 'node:child_process'
import {createRequire} from 'node:module'
import assert from 'node:assert/strict'
const require=createRequire(import.meta.url)
const {chromium}=require(process.env.LUMINA_PLAYWRIGHT_PATH||'playwright')
const [candidatePath,oldTarball]=process.argv.slice(2)
if(!candidatePath||!oldTarball)throw Error('Usage: node tools/verify-release.mjs <installed-client.js> <previous-release.tgz>')
const candidate=fs.readFileSync(candidatePath,'utf8')
const previous=execFileSync('tar',['-xOf',oldTarball,'package/lib/client.js'],{encoding:'utf8',maxBuffer:4_000_000})
const browser=await chromium.launch({headless:true,channel:'chrome'})
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.route('http://127.0.0.1:8757/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body><script>window.__ModuleLoader__={load:r=>window.registration=r}</script></body></html>'}))
 await page.goto('http://127.0.0.1:8757/')
 await page.addScriptTag({content:fs.readFileSync('node_modules/react/umd/react.production.min.js','utf8')})
 const load=async(source,seed)=>{
  await page.evaluate(seed=>{
   if(seed===null)localStorage.removeItem('ratel-lumina/settings/v1')
   else if(seed!==undefined)localStorage.setItem('ratel-lumina/settings/v1',JSON.stringify(seed))
   window.registrations=[];window.cleanups=[]
  },seed)
  await page.addScriptTag({content:source})
  return page.evaluate(()=>{
   const plugin=registration.factory(s=>s==='react'?React:{jsx:(t,p)=>React.createElement(t,p),jsxs:(t,p)=>React.createElement(t,p),Fragment:React.Fragment})
   plugin.apply({slots:{register:(options,Component)=>{registrations.push({options,Component});return()=>{}},inject:()=>()=>{}},locale:{register:()=>()=>{},bind:()=>key=>key},effect:fn=>cleanups.push(fn())})
   const store=registrations.find(r=>r.options.name==='settings.section').options.inject().hooks.settings
   const snapshot=store.getSnapshot()
   cleanups.reverse().forEach(fn=>fn?.())
   if(document.querySelector('style[data-plugin="ratel-lumina"]'))throw Error('uninstall left a stylesheet')
   return snapshot
  })
 }
 const fresh=await load(candidate,null)
 assert.equal(fresh.master,true);assert.equal(fresh.performance.profile,'balanced');assert.equal(fresh.effects.sendTransition,'flow')
 for(const key of ['dialogMotion','menuMotion','sessionSelection'])assert.equal(fresh.effects[key],true)
 const seed={version:1,master:false,brand:'ratel',intensity:'vivid',effects:{brand:false,composerGlow:false,press:false,hero:false,sessionActivity:false,sendTransition:'ghost'}}
 const old=await load(previous,seed)
 const upgraded=await load(candidate)
 for(const key of ['version','master','brand','intensity'])assert.equal(upgraded[key],old[key])
 for(const [key,value]of Object.entries(old.effects))assert.equal(upgraded.effects[key],value,key)
 assert.equal(upgraded.performance.profile,'balanced')
 for(const key of ['dialogMotion','menuMotion','sessionSelection'])assert.equal(upgraded.effects[key],false)
 assert.deepEqual(errors,[])
 const out=path.resolve('.local/diagnostics/2026-10-26-release-1.0.0');fs.mkdirSync(out,{recursive:true})
 fs.writeFileSync(path.join(out,'fresh-upgrade.json'),JSON.stringify({fresh,old,upgraded,errors},null,2))
 console.log(JSON.stringify({fresh:true,upgrade:true,preferencesRetained:true,newDefaults:true,cleanup:true,errors}))
}finally{await browser.close()}
