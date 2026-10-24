// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

describe('authored silk source pipeline',()=>{
  it('embeds the current detailed artwork without stale generated data',()=>{
    const result=spawnSync(process.execPath,['tools/gen-silk-art.mjs','--check'],{encoding:'utf8'})
    expect(result.status,result.stderr).toBe(0)
  })
  it('keeps sampled data and generated SVG fills synchronized with the source',()=>{
    const result=spawnSync(process.execPath,['tools/gen-silk-surface.mjs','--check'],{encoding:'utf8'})
    expect(result.status,result.stderr).toBe(0)
  })
  it('rejects unsupported SVG geometry instead of silently generating a different shape',()=>{
    const root=mkdtempSync(join(tmpdir(),'lumina-silk-'))
    try {
      mkdirSync(join(root,'tools'));mkdirSync(join(root,'assets/motion'),{recursive:true})
      copyFileSync('tools/gen-silk-surface.mjs',join(root,'tools/gen-silk-surface.mjs'))
      const invalid=readFileSync('assets/motion/silk-ribbon.svg','utf8').replace('M 0 164 C 110 180','M 0 164 Q 110 180')
      writeFileSync(join(root,'assets/motion/silk-ribbon.svg'),invalid)
      const result=spawnSync(process.execPath,[join(root,'tools/gen-silk-surface.mjs')],{encoding:'utf8'})
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain('Only M/C supported')
    } finally {rmSync(root,{recursive:true,force:true})}
  })
})
