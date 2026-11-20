#!/usr/bin/env node
/**
 * 把图标与截图复制进 site/ 内部，让站点自包含。
 *
 * 站点从 site/ 目录发布时，../plugins/ 越出了发布根；复制进来后
 * 任何静态托管（GitHub Pages / Gitee Pages / 本地）都能直接用。
 *
 *   node site/sync-assets.cjs
 */
const fs = require('node:fs')
const path = require('node:path')

const site = __dirname
const repo = path.join(site, '..')
const dataFile = path.join(site, 'data', 'plugins.json')

const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'))

let copied = 0
let missing = 0

for (const plugin of data.plugins) {
  const sources = [plugin.icon].concat(plugin.screenshots || [])
  for (const rel of sources) {
    // rel 形如 ../plugins/dsh-watchman/icon-180.png → 站点内路径 plugins/dsh-watchman/icon-180.png
    const inside = rel.replace(/^\.\.\//, '')
    const from = path.join(repo, inside)
    const to = path.join(site, inside)
    if (!fs.existsSync(from)) {
      console.log('MISSING ' + inside)
      missing++
      continue
    }
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.copyFileSync(from, to)
    console.log('copied ' + inside)
    copied++
  }
}

// 数据里的路径改成站点内相对路径（去掉 ../ 前缀）
for (const plugin of data.plugins) {
  plugin.icon = plugin.icon.replace(/^\.\.\//, '')
  if (plugin.screenshots) {
    plugin.screenshots = plugin.screenshots.map((s) => s.replace(/^\.\.\//, ''))
  }
}
fs.writeFileSync(dataFile, JSON.stringify(data, null, 2) + '\n', 'utf8')
console.log('copied=' + copied + ' missing=' + missing + ' (data paths updated)')
process.exit(missing === 0 ? 0 : 1)
