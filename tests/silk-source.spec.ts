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
  it('rejects unsupported SVG geometry instead of silently generating a different shape',()=>{
    const root=mkdtempSync(join(tmpdir(),'lumina-silk-'))
    try {
      mkdirSync(join(root,'tools'));mkdirSync(join(root,'assets/motion'),{recursive:true})
      copyFileSync('tools/gen-silk-art.mjs',join(root,'tools/gen-silk-art.mjs'))
      const invalid=readFileSync('assets/motion/silk-study.svg','utf8').replace('M 0 164 C 120 190','M 0 164 Q 120 190')
      writeFileSync(join(root,'assets/motion/silk-study.svg'),invalid)
      const result=spawnSync(process.execPath,[join(root,'tools/gen-silk-art.mjs')],{encoding:'utf8'})
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain('Only cubic flow spine supported')
    } finally {rmSync(root,{recursive:true,force:true})}
  })
})
