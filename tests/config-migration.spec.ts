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
