#!/usr/bin/env node
/**
 * DSH 兼容核查。
 *
 * 读取 docs/engineering/dsh-compat/manifest.json 里的依赖清单，逐条在本机
 * 安装的 DSH app.asar 中查找，写出核查报告并回写清单的 verified 段。
 *
 * 用法：
 *   node tools/check-dsh-compat.mjs                 # 核查 + 写报告 + 回写清单
 *   node tools/check-dsh-compat.mjs --dry-run       # 只核查，不落盘
 *   node tools/check-dsh-compat.mjs --json          # 机器可读结果
 *   node tools/check-dsh-compat.mjs --asar <path>   # 指定 app.asar
 *
 * 任一 required 条目缺失时以非 0 退出，可作为升级闸门。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_ASAR = '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar'
const DEFAULT_PLIST = '/Applications/DeepSeek Harness.app/Contents/Info.plist'
const DEFAULT_MANIFEST = join(ROOT, 'docs/engineering/dsh-compat/manifest.json')
const DEFAULT_REPORTS = join(ROOT, 'docs/engineering/dsh-compat/reports')
const CHUNK = 8 * 1024 * 1024
const OVERLAP = 4096
const COUNT_CAP = 99

const args = process.argv.slice(2)
const flag = (name) => args.includes(name)
const value = (name, fallback) => {
  const index = args.indexOf(name)
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback
}

const asarPath = value('--asar', DEFAULT_ASAR)
const manifestPath = value('--manifest', DEFAULT_MANIFEST)
const reportDir = value('--report-dir', DEFAULT_REPORTS)
const dryRun = flag('--dry-run')
const asJson = flag('--json')

if (!existsSync(asarPath)) {
  console.error(`找不到 app.asar：${asarPath}\n用 --asar 指定，或确认 DSH 已安装。`)
  process.exit(2)
}

/** 读 app 版本；读不到时返回 unknown。 */
function appVersion() {
  try {
    const plist = readFileSync(DEFAULT_PLIST, 'utf8')
    return /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/.exec(plist)?.[1] ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

/** 统计一个字节串在 buffer 中出现的次数（封顶 COUNT_CAP）。 */
function countBytes(buffer, needle) {
  const target = Buffer.from(needle, 'latin1')
  if (target.length === 0) return 0
  let count = 0
  let index = buffer.indexOf(target)
  while (index !== -1 && count < COUNT_CAP) {
    count += 1
    index = buffer.indexOf(target, index + target.length)
  }
  return count
}

/** 统计正则命中次数；分块扫描避免把整个 asar 转成字符串。 */
function countRegex(buffer, source) {
  const pattern = new RegExp(source, 'g')
  let count = 0
  for (let offset = 0; offset < buffer.length && count < COUNT_CAP; offset += CHUNK) {
    const end = Math.min(buffer.length, offset + CHUNK + OVERLAP)
    const text = buffer.subarray(offset, end).toString('latin1')
    for (const match of text.matchAll(pattern)) {
      if (match.index >= CHUNK) continue
      count += 1
      if (count >= COUNT_CAP) break
    }
  }
  return count
}

/** 构建期依赖与宿主版本的漂移。 */
function devDrift(version) {
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
    const pins = Object.entries({ ...pkg.devDependencies })
      .filter(([name]) => name.startsWith('@deepseek-ai/'))
      .map(([name, pinned]) => ({
        name,
        pinned,
        // Only the DSH client packages are versioned with the host; cordis has
        // its own line and must not be compared against the app version.
        comparable: name.startsWith('@deepseek-ai/dsh-client-'),
        matches: pinned === version,
      }))
    return pins
  } catch {
    return []
  }
}

const version = appVersion()
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const buffer = readFileSync(asarPath)
const results = manifest.checks.map((check) => {
  const hits = check.regex ? countRegex(buffer, check.regex) : countBytes(buffer, check.pattern)
  const present = hits > 0
  return {
    id: check.id,
    category: check.category,
    required: check.required !== false,
    usedBy: check.usedBy ?? [],
    why: check.why ?? '',
    probe: check.regex ? `/${check.regex}/` : check.pattern,
    hits,
    present,
  }
})

const missingRequired = results.filter((item) => item.required && !item.present)
const missingOptional = results.filter((item) => !item.required && !item.present)
const previous = manifest.verified ?? {}
const drift = devDrift(version)
const driftMismatch = drift.filter((pin) => pin.comparable && !pin.matches)

if (!asJson) {
  console.log(`\nDSH 兼容核查 · ${version}`)
  console.log(`清单：${manifestPath}`)
  console.log(`asar：${asarPath}`)
  console.log(`条目：${results.length} 项（必需 ${results.filter((r) => r.required).length}）\n`)
  for (const item of results) {
    const mark = item.present ? '✓' : item.required ? '✗' : '—'
    console.log(`${mark} ${item.id.padEnd(32)} ${String(item.hits).padStart(3)}  ${item.category}`)
  }
  if (driftMismatch.length > 0) {
    console.log('\n构建期依赖版本漂移：')
    for (const pin of driftMismatch) console.log(`  · ${pin.name} 锁定 ${pin.pinned}，宿主 ${version}`)
    console.log('  （构建期类型包落后时先升级 devDependencies，再用新类型验证）')
  }
  console.log(`\n结论：${missingRequired.length === 0 ? '必需依赖全部命中' : `${missingRequired.length} 项必需依赖缺失`}`)
  if (missingOptional.length > 0) console.log(`可选项缺失 ${missingOptional.length} 项（不阻断）`)
}

if (asJson) {
  console.log(JSON.stringify({ version, missingRequired, missingOptional, drift: driftMismatch, results }, null, 2))
}

if (!dryRun) {
  manifest.verified = {
    version,
    checkedAt: new Date().toISOString(),
    missing: missingRequired.map((item) => item.id),
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

  mkdirSync(reportDir, { recursive: true })
  const rows = results
    .map((item) => `| ${item.present ? '✓' : item.required ? '**✗**' : '—'} | \`${item.id}\` | ${item.category} | ${item.hits} | ${item.usedBy.join('、') || '—'} | ${item.why} |`)
    .join('\n')
  const driftRows = drift.length === 0
    ? '（未读取到构建期依赖）'
    : drift.map((pin) => `| \`${pin.name}\` | ${pin.pinned} | ${pin.comparable ? (pin.matches ? '一致' : '**落后**') : '独立版本' } |`).join('\n')
  const diff = previous.version && previous.version !== version
    ? `\n上一次核查：${previous.version}（缺失 ${previous.missing?.length ?? 0} 项）→ 本次 ${version}（缺失 ${missingRequired.length} 项）\n`
    : ''
  const report = `# DSH 兼容核查 · ${version}

- 核查时间：${new Date().toISOString()}
- App 版本：\`${version}\`
- asar：\`${asarPath}\`
- 清单：\`docs/engineering/dsh-compat/manifest.json\`
- 结论：${missingRequired.length === 0 ? `**通过**，${results.length} 项依赖全部命中（必需 ${results.filter((r) => r.required).length} 项）` : `**不通过**，${missingRequired.length} 项必需依赖缺失：${missingRequired.map((i) => i.id).join('、')}`}
${diff}
## 依赖明细

| 结果 | 依赖 | 类别 | 命中 | 使用方 | 为什么依赖 |
| --- | --- | --- | --- | --- | --- |
${rows}

## 构建期依赖对照

| 包 | 锁定版本 | 与宿主 |
| --- | --- | --- |
${driftRows}

${driftMismatch.length > 0 ? '> 构建期类型包落后于宿主时，先升级 devDependencies 再验证，避免用旧类型定义写新 API。\n' : ''}
## 后续动作

${missingRequired.length === 0
    ? '- 无缺失。仍建议重启客户端做一次视觉与交互抽查（hooks 存在不等于行为不变）。'
    : '- 逐条确认缺失项：新版本改了钩子/槽位/服务的名称或形态。\n- 在 `src/client/adapter/targets.ts`、`src/client/index.ts` 的 inject 与 occupySlot、或 CSS 变量处换成新值。\n- 修好后再跑一次本核查，并把报告一起提交。'}

---
由 \`node tools/check-dsh-compat.mjs\` 生成，请勿手工编辑。
`
  writeFileSync(join(reportDir, `${version}.md`), report)
  if (!asJson) console.log(`\n报告：${join(reportDir, `${version}.md`)}`)
}

process.exit(missingRequired.length === 0 ? 0 : 1)
