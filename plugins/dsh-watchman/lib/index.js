/**
 * dsh-watchman —— 守夜人告警（宿主半边）
 *
 * 把「DSH 待审批 / 报错 / 任务结束 / 断线 / 登录态失效」推到手机。
 * 本半边只做三件事：**配置读写、状态查询、进程与通道控制**。
 * 真正的订阅与推送在独立进程 `lib/watchman.mjs` 里跑（它复用 dsh-remote 已验证的事件客户端），
 * 这样告警不依赖 DSH 重启，宿主崩了也不影响已连上的告警链路。
 *
 * 路由（全部 exact + 同源校验；凭据只以打码形式出网）：
 *   GET  /plugins/watchman/state   状态：配置(地址打码)、进程是否在跑、日志尾部
 *   POST /plugins/watchman/config  保存配置：{channel,target,enabled,dedup_minutes,pushOn}
 *   POST /plugins/watchman/test    立刻发一条测试到手机
 *   POST /plugins/watchman/control 控制进程：{action:"start"|"stop"|"restart"}
 *
 * 可移植性（能发到 GitHub 的前提）：
 *   · 不含任何个人路径：数据目录来自插件配置 dataDir，缺省 ~/.dsh-watchman
 *   · 拉起的 Node 用**宿主自己的** process.execPath（Electron 下加 ELECTRON_RUN_AS_NODE=1），
 *     不依赖用户另外装 Node，也不写死某个安装路径
 *   · 订阅与推送脚本随包发布（lib/watchman.mjs、lib/notifier.mjs），不在用户桌面找文件
 *
 * @module dsh-watchman
 */

import { readFileSync, writeFileSync, existsSync, openSync, readSync, closeSync, statSync, mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const name = 'watchman'

/** 需要宿主 Web 服务器来挂路由。 */
export const inject = ['webServer']

const HERE = dirname(fileURLToPath(import.meta.url))
const ENTRY = join(HERE, 'watchman.mjs')
const NOTIFIER = join(HERE, 'notifier.mjs')

const ROUTES = {
  state: '/plugins/watchman/state',
  config: '/plugins/watchman/config',
  test: '/plugins/watchman/test',
  control: '/plugins/watchman/control',
}

/** 插件配置默认值（可在 profile 的 patch 行里用 config: 覆盖）。 */
export const DEFAULTS = {
  /** 配置 / 日志 / pid 的存放目录。 */
  dataDir: join(homedir(), '.dsh-watchman'),
  /** dsh-remote 运行目录（事件客户端与 harness cookie 在那里）。 */
  relayDir: join(homedir(), '.dsh-remote'),
}

function resolveConfig(ctx) {
  const raw = (ctx && ctx.config) || {}
  const dataDir = typeof raw.dataDir === 'string' && raw.dataDir.trim() ? raw.dataDir.trim() : DEFAULTS.dataDir
  const relayDir = typeof raw.relayDir === 'string' && raw.relayDir.trim() ? raw.relayDir.trim() : DEFAULTS.relayDir
  return { dataDir, relayDir, eventsModule: join(relayDir, 'clients', 'dsh-remote', 'dsh-events.mjs') }
}

// ── 小工具 ────────────────────────────────────────────────────────────────────

function files(cfg) {
  return {
    notify: join(cfg.dataDir, 'config.json'),
    watch: join(cfg.dataDir, 'watchman.config.json'),
    log: join(cfg.dataDir, 'watchman.log'),
    pid: join(cfg.dataDir, 'watchman.pid'),
  }
}

function readJson(p, fallback) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(p, obj) {
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8')
}

/** 地址打码：只留头尾，避免把凭据打进浏览器 / 日志。 */
export function mask(target) {
  const t = String(target || '')
  if (!t) return { masked: '', length: 0 }
  if (t.length <= 10) return { masked: t.slice(0, 2) + '…', length: t.length }
  return { masked: t.slice(0, 6) + '…' + t.slice(-4), length: t.length }
}

function readPid(cfg) {
  try {
    const n = Number(String(readFileSync(files(cfg).pid, 'utf8')).trim())
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

function pidAlive(pid) {
  if (!pid) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/** 读日志尾部（最多 8KB，不整文件读，日志可能很大）。 */
function tailLog(cfg, lines = 30) {
  try {
    const p = files(cfg).log
    const size = statSync(p).size
    const readBytes = Math.min(size, 8192)
    const fd = openSync(p, 'r')
    const buf = Buffer.alloc(readBytes)
    readSync(fd, buf, 0, readBytes, size - readBytes)
    closeSync(fd)
    return buf.toString('utf8').split(/\r?\n/).filter(Boolean).slice(-lines)
  } catch {
    return []
  }
}

function sameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true // 同源导航请求不带 Origin
  try {
    return new URL(origin).host === req.headers.host
  } catch {
    return false
  }
}

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

async function readBody(req, limit = 256 * 1024) {
  const chunks = []
  let total = 0
  for await (const c of req) {
    total += c.length
    if (total > limit) throw new Error('请求体过大')
    chunks.push(c)
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

/** 当前完整状态（地址打码，绝不返回凭据原文）。 */
export function snapshot(ctx) {
  const cfg = resolveConfig(ctx)
  const notify = readJson(files(cfg).notify, {})
  const watch = readJson(files(cfg).watch, {})
  const pid = readPid(cfg)
  const alive = pidAlive(pid)
  return {
    ok: true,
    dataDir: cfg.dataDir,
    relayDir: cfg.relayDir,
    eventsModuleReady: existsSync(cfg.eventsModule),
    channel: notify.channel || 'serverchan',
    target: mask(notify.target),
    enabled: notify.enabled !== false,
    dedupMinutes: Number(notify.dedup_minutes) || 30,
    pushOn: watch.pushOn || {},
    running: alive,
    pid: alive ? pid : null,
    log: tailLog(cfg),
  }
}

// ── 进程控制 ──────────────────────────────────────────────────────────────────

/** 用宿主自己的 Node 拉起订阅进程（Electron 下需要 ELECTRON_RUN_AS_NODE）。 */
function watcherEnv(cfg) {
  const env = { ...process.env, DSH_WATCHMAN_DIR: cfg.dataDir, DSH_WATCHMAN_RELAY_DIR: cfg.relayDir }
  if (process.versions.electron) env.ELECTRON_RUN_AS_NODE = '1'
  const crt = join(cfg.dataDir, 'dsh-remote.crt')
  if (existsSync(crt)) env.NODE_EXTRA_CA_CERTS = crt
  return env
}

export function startWatchman(ctx) {
  const cfg = resolveConfig(ctx)
  const pid = readPid(cfg)
  if (pidAlive(pid)) return { started: false, reason: `已在运行（pid ${pid}）` }
  if (!existsSync(ENTRY)) return { started: false, reason: `缺少订阅脚本：${ENTRY}` }
  const child = spawn(process.execPath, [ENTRY], {
    cwd: cfg.dataDir,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: watcherEnv(cfg),
  })
  child.unref()
  return { started: true, pid: child.pid }
}

export function stopWatchman(ctx) {
  const cfg = resolveConfig(ctx)
  const pid = readPid(cfg)
  if (!pidAlive(pid)) return { stopped: false, reason: '没有在运行' }
  try {
    process.kill(pid)
    return { stopped: true, pid }
  } catch (e) {
    return { stopped: false, reason: String(e?.message || e) }
  }
}

// ── 插件装配 ──────────────────────────────────────────────────────────────────

export function apply(ctx) {
  const cfg = resolveConfig(ctx)
  try {
    mkdirSync(cfg.dataDir, { recursive: true })
  } catch {
    /* 目录建不了时各路由会各自报错 */
  }

  ctx.inject(['webServer'], (httpCtx) => {
    httpCtx.effect(
      () => {
        const disposers = []
        const route = (path, method, handler) =>
          disposers.push(
            httpCtx.webServer.register({
              kind: 'exact',
              path,
              handler: async (req, res) => {
                if (!sameOrigin(req)) return send(res, 403, { ok: false, error: '跨域请求已被拒绝' })
                if (method && req.method !== method) return send(res, 405, { ok: false, error: '方法不支持' })
                try {
                  await handler(req, res)
                } catch (e) {
                  send(res, 500, { ok: false, error: String(e?.message || e) })
                }
              },
            }),
          )

        route(ROUTES.state, 'GET', async (_req, res) => send(res, 200, snapshot(ctx)))

        route(ROUTES.config, 'POST', async (req, res) => {
          const body = await readBody(req)
          const f = files(cfg)
          const notify = readJson(f.notify, {})
          if (typeof body.channel === 'string' && ['wecom', 'bark', 'serverchan'].includes(body.channel)) {
            notify.channel = body.channel
          }
          // 地址为空 = 保持原值（前端默认不显示原文，留空即不改）
          if (typeof body.target === 'string' && body.target.trim()) notify.target = body.target.trim()
          if (typeof body.enabled === 'boolean') notify.enabled = body.enabled
          if (Number.isFinite(Number(body.dedup_minutes))) {
            notify.dedup_minutes = Math.max(1, Math.min(1440, Number(body.dedup_minutes)))
          }
          notify.saved_at = new Date().toLocaleString('zh-CN', { hour12: false })
          writeJson(f.notify, notify)

          if (body.pushOn && typeof body.pushOn === 'object') {
            const watch = readJson(f.watch, {})
            watch.pushOn = { ...(watch.pushOn || {}), ...body.pushOn }
            writeJson(f.watch, watch)
          }
          send(res, 200, { ok: true, note: '已保存；正在运行的守夜人下一轮读取即刻生效', state: snapshot(ctx) })
        })

        route(ROUTES.test, 'POST', async (_req, res) => {
          const mod = await import(pathToFileURL(NOTIFIER).href)
          const r = await mod.sendTest(readJson(files(cfg).notify, {}), {})
          send(res, 200, { ok: r.ok, message: r.msg })
        })

        route(ROUTES.control, 'POST', async (req, res) => {
          const body = await readBody(req)
          const action = String(body.action || '')
          let r
          if (action === 'start') r = startWatchman(ctx)
          else if (action === 'stop') r = stopWatchman(ctx)
          else if (action === 'restart') {
            stopWatchman(ctx)
            await new Promise((r2) => setTimeout(r2, 800))
            r = startWatchman(ctx)
          } else return send(res, 400, { ok: false, error: `未知动作：${action}` })
          await new Promise((r2) => setTimeout(r2, 600))
          send(res, 200, { ok: true, result: r, state: snapshot(ctx) })
        })

        return () => disposers.forEach((d) => typeof d === 'function' && d())
      },
      'watchman: routes',
    )
  })
}

/** 供测试直接引用。 */
export const __internal = { resolveConfig, files, mask, snapshot, startWatchman, stopWatchman, readPid, pidAlive, tailLog }
