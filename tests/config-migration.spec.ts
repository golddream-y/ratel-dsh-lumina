import { describe, expect, it } from 'vitest'
import { parseConfig } from '../src/client/core/config.ts'

describe('independent navigation effect migration', () => {
  it('preserves the old disabled navigation intent', () => {
    const config = parseConfig(JSON.stringify({version:1,effects:{sessionActivity:false,sendTransition:'ghost'}}))
    expect(config.effects.panelMotion).toBe(false)
    expect(config.effects.groupMotion).toBe(false)
    expect(config.effects.sendTransition).toBe('ghost')
  })
  it('retains explicit independent preferences over the legacy switch', () => {
    const config = parseConfig(JSON.stringify({version:1,effects:{sessionActivity:false,panelMotion:true,groupMotion:false}}))
    expect(config.effects.panelMotion).toBe(true)
    expect(config.effects.groupMotion).toBe(false)
    expect(config.effects.sessionActivity).toBe(false)
  })
})

describe('independent ribbon migration', () => {
  it('inherits a disabled composer effect from an older saved config', () => {
    const config = parseConfig(JSON.stringify({version:1,effects:{composerGlow:false}}))
    expect(config.effects.composerRibbon).toBe(false)
  })
  it('preserves an explicit ribbon preference independently', () => {
    const config = parseConfig(JSON.stringify({version:1,effects:{composerGlow:false,composerRibbon:true,hero:false}}))
    expect(config.effects.composerRibbon).toBe(true)
    expect(config.effects.composerGlow).toBe(false)
    expect(config.effects.hero).toBe(false)
  })
})

describe('rendering profile migration', () => {
  it('defaults only the missing performance field without resetting preferences', () => {
    const config = parseConfig(JSON.stringify({version:1,master:false,brand:'ratel',effects:{hero:false,sendTransition:'ghost'}}))
    expect(config.performance.profile).toBe('balanced')
    expect(config.master).toBe(false)
    expect(config.brand).toBe('ratel')
    expect(config.effects.hero).toBe(false)
    expect(config.effects.sendTransition).toBe('ghost')
  })
  it('accepts all rendering profiles and isolates invalid values', () => {
    for (const profile of ['performance', 'balanced', 'quality', 'ultra']) {
      expect(parseConfig(JSON.stringify({version:1,performance:{profile}})).performance.profile).toBe(profile)
    }
    for (const performance of [null, 120, {profile:'fast'}, {frameRate:120}]) {
      expect(parseConfig(JSON.stringify({version:1,performance,intensity:'vivid'}))).toMatchObject({performance:{profile:'balanced'},intensity:'vivid'})
    }
  })
})

describe('surface and selection preferences', () => {
  it('inherits disabled intentions, while explicit switches stay independent', () => {
    const legacy = parseConfig(JSON.stringify({version:1,effects:{panelMotion:false,press:false,sessionActivity:false}}))
    expect(legacy.effects).toMatchObject({dialogMotion:false,menuMotion:false,sessionSelection:false})
    const explicit = parseConfig(JSON.stringify({version:1,effects:{panelMotion:false,press:false,sessionActivity:false,dialogMotion:true,menuMotion:true,sessionSelection:true}}))
    expect(explicit.effects).toMatchObject({dialogMotion:true,menuMotion:true,sessionSelection:true})
  })
})
