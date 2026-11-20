// 站点数据完整性检查：确认中英字段齐全、表格列数一致。
//   node docs/check-data.cjs
const fs = require('node:fs')
const path = require('node:path')

const site = process.env.SITE_DIR || __dirname
const raw = fs.readFileSync(path.join(site, 'data', 'plugins.json'), 'utf8')
const D = JSON.parse(raw)

let problems = 0

console.log('site:', site)
console.log('plugins:', D.plugins.length)

for (const key of ['siteTitle', 'tagline', 'readMore', 'install', 'close', 'copy', 'langBtn']) {
  if (!D.meta.zh[key]) { console.log('  MISSING meta.zh.' + key); problems++ }
  if (!D.meta.en[key]) { console.log('  MISSING meta.en.' + key); problems++ }
}
for (const key of ['ui', 'cli', 'uiSteps', 'cliSteps']) {
  if (!D.install.zh[key]) { console.log('  MISSING install.zh.' + key); problems++ }
  if (!D.install.en[key]) { console.log('  MISSING install.en.' + key); problems++ }
}

for (const p of D.plugins) {
  console.log('--- ' + p.id + ' ---')
  console.log('  zh:', p.name.zh, '| en:', p.name.en)
  console.log('  tags:', p.tags.zh.join('/'), '|', p.tags.en.join('/'))
  console.log('  sections:', (p.sections || []).length)

  const missing = []
  if (!p.name.zh || !p.name.en) missing.push('name')
  if (!p.summary.zh || !p.summary.en) missing.push('summary')
  if (!p.tags.zh || !p.tags.en) missing.push('tags')
  if (!p.icon) missing.push('icon')
  if (!p.repo) missing.push('repo')
  if (!p.docs) missing.push('docs')

  for (const s of (p.sections || [])) {
    if (!s.title.zh || !s.title.en) missing.push('section:' + s.id + ':title')
    if (s.body && (!s.body.zh || !s.body.en)) missing.push('section:' + s.id + ':body')
    if (s.table) {
      for (const L of ['zh', 'en']) {
        const t = s.table[L]
        if (!t || !t.head || !t.rows) { missing.push('section:' + s.id + ':table:' + L); continue }
        t.rows.forEach((r, i) => {
          if (r.length !== t.head.length) {
            missing.push('section:' + s.id + ':row' + i + ' (len ' + r.length + ' vs head ' + t.head.length + ')')
          }
        })
      }
    }
  }

  // 图标文件存在？路径是相对 site/ 的（../plugins/...），从 site/ 直接解析
  const iconPath = path.resolve(site, p.icon)
  if (!fs.existsSync(iconPath)) { missing.push('icon file missing: ' + p.icon) }
  for (const shot of (p.screenshots || [])) {
    const sp = path.resolve(site, shot)
    if (!fs.existsSync(sp)) { missing.push('screenshot missing: ' + shot) }
  }

  console.log('  missing:', missing.length ? missing.join(' | ') : 'none')
  problems += missing.length
}

console.log('')
console.log(problems === 0 ? 'RESULT: all checks passed' : 'RESULT: ' + problems + ' problem(s)')
process.exit(problems === 0 ? 0 : 1)
