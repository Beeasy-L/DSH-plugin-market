/**
 * dsh-plugin-categorized — host half.
 *
 * 插件页「分类」标签的宿主半身：监听 plugin-manager/changed，扫描 profile 的
 * node_modules 里缺中文 locale 的第三方 DSH 插件，用默认模型补一份 zh.json 并
 * 修 exports，让以后新装的插件自动带上中文标题与描述。
 *
 * 只翻「真正的 DSH 插件」（package.json 带 dsh 字段）且排除 @deepseek-ai/* 核心库；
 * 已有 locale/zh.json 的跳过，描述本来就是中文的跳过。走默认模型，静默失败。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export const name = 'dsh-plugin-categorized'

/** 翻译一个插件要多久：一轮模型调用，给足 90 秒。 */
const TRANSLATE_TIMEOUT_MS = 90_000

/** 非数组对象才当记录看，其余一律 null（宿主传进来的结构不可信）。 */
function asRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : null
}

/** 描述本来就是中文就不该再翻。 */
function looksChinese(text) {
  if (typeof text !== 'string' || text === '') return false
  const hits = text.match(/[\u4e00-\u9fff]/g)
  return hits !== null && hits.length >= 6
}

/** 原子写：临时文件 + rename，跨盘不适用但 profile 与 node_modules 同盘。 */
function atomicWrite(file, data) {
  const tmp = file + '.tmp-' + process.pid + '-' + Date.now()
  writeFileSync(tmp, data, 'utf8')
  renameSync(tmp, file)
}

/** profile/node_modules 下所有直接目录（含 @scope 展开）。 */
function installedPluginDirs(profileDir) {
  const nm = path.join(profileDir, 'node_modules')
  let entries
  try {
    entries = readdirSync(nm, { withFileTypes: true })
  } catch {
    return []
  }
  const dirs = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith('@')) {
      let subs
      try {
        subs = readdirSync(path.join(nm, entry.name), { withFileTypes: true })
      } catch {
        subs = []
      }
      for (const sub of subs) if (sub.isDirectory()) dirs.push(path.join(nm, entry.name, sub.name))
    } else {
      dirs.push(path.join(nm, entry.name))
    }
  }
  return dirs
}

/**
 * 一个目录是否需要翻译：是 DSH 插件、非核心库、缺 zh.json、描述非中文。
 * 返回翻译所需的信息，不需要则返回 null。
 */
function needsTranslation(dir) {
  let real = dir
  try {
    real = realpathSync(dir)
  } catch {
    return null
  }
  const pkgPath = path.join(real, 'package.json')
  let pkg
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  } catch {
    return null
  }
  if (typeof pkg?.name !== 'string' || pkg.name === '') return null
  if (pkg.name.startsWith('@deepseek-ai/')) return null
  if (pkg.dsh === undefined || pkg.dsh === null) return null
  if (existsSync(path.join(real, 'locale', 'zh.json'))) return null
  const description = typeof pkg.description === 'string' ? pkg.description : ''
  if (description.trim() === '' || looksChinese(description)) return null
  return { name: pkg.name, description, dir: real, pkg, pkgPath }
}

/**
 * 造一条 user 消息。宿主的 `@deepseek-ai/dsh-llm/message` 这里按值内联：
 * 这个包是装成链接目录的本地 bundle，从它的实际路径往上找不到核心包，
 * 直接 import 会 ERR_MODULE_NOT_FOUND。该包的 createUserMessage 在运行时
 * 只是 `{...input, role:'user', id: randomUUID()}`，brandString 只是类型，
 * 所以这里复刻同样的结构即可。
 */
function createUserMessage(input) {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16))
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  const message = {
    ...input,
    role: 'user',
    id: `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`,
  }
  Object.freeze(message)
  return message
}

/** 模型路由：沿用宿主默认选择（和 dsh-skill-palette 一致）。 */
function defaultRoute(ctx) {
  const selection = ctx.get('agentDefaultModel')?.currentSelection?.()
  const record = asRecord(selection)
  const provider = typeof record?.provider === 'string' ? record.provider : ''
  const model = typeof record?.model === 'string' ? record.model : ''
  return provider === '' || model === '' ? null : { provider, model }
}

/** 从模型答案里抠出第一个 JSON 对象。 */
function jsonObjectOf(answer) {
  const start = answer.indexOf('{')
  const end = answer.lastIndexOf('}')
  if (start === -1 || end <= start) return null
  try {
    return asRecord(JSON.parse(answer.slice(start, end + 1)))
  } catch {
    return null
  }
}

/** 把一个插件的英文描述翻成中文标题 + 一句说明。 */
async function translatePlugin(ctx, pkgName, enDescription) {
  const llm = ctx.get('llm')
  if (llm === undefined || typeof llm.stream !== 'function') throw new Error('LLM 服务不可用（宿主没装模型插件）')
  const route = defaultRoute(ctx)
  if (route === null) throw new Error('没有默认模型：先去「设置 → 模型」选一个')
  const prompt = [
    '把下面这个 DeepSeek Harness 插件翻译成中文界面文案。',
    '插件包名：' + pkgName,
    '英文描述：' + String(enDescription ?? '').slice(0, 800),
    '',
    '只输出一个 JSON 对象，格式：{"title":"简短中文名（2 到 8 个字）","description":"一句话中文说明（15 到 40 个字）"}。',
    '保留必要的专有名词（APK、GenUI、Token、QQ 之类）；不要输出解释、不要代码块、不要多余字段。',
  ].join('\n')
  let answer = ''
  const controller = new AbortController()
  const guard = setTimeout(() => controller.abort(), TRANSLATE_TIMEOUT_MS)
  try {
    for await (const chunk of llm.stream({
      provider: route.provider,
      model: route.model,
      system: '你是一个插件本地化翻译器，只输出严格的 JSON。',
      messages: [createUserMessage({ content: [{ type: 'text', text: prompt }], source: { kind: 'plugin:dsh-plugin-categorized' } })],
      temperature: 0.2,
      maxTokens: 500,
      signal: controller.signal,
    })) {
      if (chunk.type === 'text-delta') answer += chunk.text
    }
  } finally {
    clearTimeout(guard)
  }
  const parsed = jsonObjectOf(answer)
  if (parsed === null) throw new Error('模型没有返回可解析的 JSON')
  const title = typeof parsed.title === 'string' ? parsed.title.trim() : ''
  const description = typeof parsed.description === 'string' ? parsed.description.trim() : ''
  if (title === '' || description === '') throw new Error('模型返回空结果')
  return { title: title.slice(0, 40), description: description.slice(0, 200) }
}

/**
 * 翻译并写盘一个插件；单个失败不抛给队列，由调用方静默。
 *
 * 必须同时写 en.json 与 zh.json：DSH 的 locale 加载以 en.json 为锚点
 * （dictionariesOf(englishPath…) 从它所在目录遍历其他语言）。只写 zh.json
 * 会让整个 locale 目录不被加载，中文名反而显示不出来。
 */
async function translateOne(ctx, target) {
  const zh = await translatePlugin(ctx, target.name, target.description)
  const localeDir = path.join(target.dir, 'locale')
  mkdirSync(localeDir, { recursive: true })

  atomicWrite(path.join(localeDir, 'zh.json'), JSON.stringify({ meta: { title: zh.title, description: zh.description } }, null, 2) + '\n')

  // en.json 是锚点：没有它，zh.json 永远不会被读到。
  const enPath = path.join(localeDir, 'en.json')
  if (!existsSync(enPath)) {
    atomicWrite(enPath, JSON.stringify({
      meta: {
        title: target.pkg.name,
        description: target.description,
      },
    }, null, 2) + '\n')
  }

  // 补 exports / files，让 locale 文件能被插件的 meta 解析读到、且更新时不丢。
  let pkgDirty = false
  if (target.pkg.exports && typeof target.pkg.exports === 'object' && !Array.isArray(target.pkg.exports)) {
    const hasLocale = Object.keys(target.pkg.exports).some((key) => key.startsWith('./locale'))
    if (!hasLocale) {
      target.pkg.exports['./locale/*.json'] = './locale/*.json'
      pkgDirty = true
    }
  }
  if (Array.isArray(target.pkg.files) && !target.pkg.files.includes('locale')) {
    target.pkg.files.push('locale')
    pkgDirty = true
  }
  if (pkgDirty) {
    atomicWrite(target.pkgPath, JSON.stringify(target.pkg, null, 2) + '\n')
  }
  return { name: target.name, title: zh.title }
}

/**
 * 补锚点：已有 zh.json 但缺 en.json 的插件，中文同样显示不出来。
 * 这修的是历史遗留（旧版只写 zh.json），不改动已有的 en.json。
 */
function needsAnchor(dir) {
  let real = dir
  try {
    real = realpathSync(dir)
  } catch {
    return null
  }
  let pkg
  try {
    pkg = JSON.parse(readFileSync(path.join(real, 'package.json'), 'utf8'))
  } catch {
    return null
  }
  if (typeof pkg?.name !== 'string' || pkg.name === '') return null
  if (pkg.name.startsWith('@deepseek-ai/')) return null
  if (pkg.dsh === undefined || pkg.dsh === null) return null
  const localeDir = path.join(real, 'locale')
  if (!existsSync(path.join(localeDir, 'zh.json'))) return null
  if (existsSync(path.join(localeDir, 'en.json'))) return null
  return { dir: real, pkg, pkgPath: path.join(real, 'package.json') }
}

/** 给缺锚点的插件补一个 en.json（内容用包名与英文描述）。 */
function addAnchor(target) {
  const description = typeof target.pkg.description === 'string' ? target.pkg.description : ''
  const en = { meta: { title: target.pkg.name, description } }
  atomicWrite(path.join(target.dir, 'locale', 'en.json'), JSON.stringify(en, null, 2) + '\n')
  return target.pkg.name
}

/** 跑一轮扫描：先补 en.json 锚点（历史遗留），再翻译缺 zh.json 的插件。 */
async function scan(ctx) {
  const profile = asRecord(ctx.get('profileContext'))
  const profileDir = typeof profile?.dir === 'string' ? profile.dir : ''
  if (profileDir === '') return 0
  let done = 0
  for (const dir of installedPluginDirs(profileDir)) {
    // 1) 已有 zh.json 却缺 en.json 的：补锚点，不调模型。
    const anchor = needsAnchor(dir)
    if (anchor !== null) {
      try {
        addAnchor(anchor)
        done += 1
      } catch {
        /* 写不进去就算了 */
      }
      continue
    }
    // 2) 缺 zh.json 的：翻译，同时写 en.json 锚点。
    const target = needsTranslation(dir)
    if (target === null) continue
    try {
      await translateOne(ctx, target)
      done += 1
    } catch {
      /* 单个翻译失败不影响其余，也不该刷屏 */
    }
  }
  return done
}

export function apply(ctx) {
  // 翻译写盘串行化：安装连续触发时后写不能把先写的覆盖掉（这里都是增量，串行即可）。
  let queue = Promise.resolve()
  const run = () => {
    queue = queue.then(() => scan(ctx)).catch(() => 0)
    return queue
  }
  ctx.effect(() => {
    const dispose = ctx.on('plugin-manager/changed', () => { run() })
    // 启动时也补扫一轮：处理历史遗留、以及被 pnpm install 覆盖掉 locale 的插件。
    run()
    return () => { dispose() }
  }, 'dsh-plugin-categorized: host auto-translate')
}

export default { name, apply }
