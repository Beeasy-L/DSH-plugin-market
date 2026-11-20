/**
 * 守夜人告警 · 通道层
 *
 * 通道层来源：「星火续火花」项目的失败告警模块 core/notifier.py（277 行，MIT）。
 * 搬移原则：**请求形状、判定条件、去重语义、分级标识 1:1 保留**，
 *          只把 Python 标准库换成 Node 内置 fetch，不引入任何第三方依赖。
 *
 * 支持三通道（与原项目一致）：
 *   · wecom      企业微信群机器人（推荐）：填完整 webhook 或只填机器人 key
 *   · bark       iPhone Bark：填 https://api.day.app/<key> 或只填 key
 *   · serverchan Server酱（推送到微信）：填 SENDKEY
 *
 * 能力（与原项目一致）：
 *   · 若未启用 / 未配置地址 → 不发送，返回说明（调用方无需关心）
 *   · 去重防抖：同一 dedupKey 在窗口期内只推一次（force=true 可绕过）
 *   · 分级：critical 🔴 / warning 🟡 / info 🟢
 *   · 网络异常一律兜底成 {ok:false,msg}，绝不抛出打断调用方
 *
 * 与原项目的差异（有意为之，已在下文标注）：
 *   1. 去重表可选落盘（插件进程会重启，原项目是进程内内存表）
 *   2. 超时用 AbortSignal（Node fetch 没有 timeout 选项）
 */

import { readFileSync, writeFileSync } from "node:fs";

export const CHANNELS = Object.freeze(["wecom", "bark", "serverchan"]);

export const CHANNEL_LABEL = Object.freeze({
  wecom: "企业微信群机器人",
  bark: "Bark",
  serverchan: "Server酱(微信)",
});

export const LEVEL_CRITICAL = "critical"; // 🔴 失联 / 0 成功 / 漏跑
export const LEVEL_WARNING = "warning";   // 🟡 部分失败
export const LEVEL_INFO = "info";         // 🟢 日报

const LEVEL_EMOJI = Object.freeze({ critical: "🔴", warning: "🟡", info: "🟢" });

const HTTP_TIMEOUT_MS = 8000;

/** 默认配置（对应原项目的 notify_* 字段）。 */
export const DEFAULT_CONFIG = Object.freeze({
  enabled: false,
  channel: "wecom",
  target: "",
  daily_report: true,
  dedup_minutes: 30,
});

// ── 去重表（原项目：进程内 _sent_cache）────────────────────────────────────────
// 插件进程会重启，因此额外支持落盘；不落盘时行为与原来完全一致。
const sentCache = new Map();

export function loadDedupeFromFile(filePath) {
  try {
    const obj = JSON.parse(readFileSync(filePath, "utf8"));
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "number") sentCache.set(k, v);
    }
  } catch {
    /* 读不到就当空表，与原来一致 */
  }
}

export function saveDedupeToFile(filePath) {
  try {
    writeFileSync(filePath, JSON.stringify(Object.fromEntries(sentCache)), "utf8");
  } catch {
    /* 落盘失败不影响发送 */
  }
}

export function resetDedupe() {
  sentCache.clear();
}

// ── HTTP 兜底封装（原项目 _http_post）──────────────────────────────────────────
async function httpPost(url, body, headers, timeoutMs = HTTP_TIMEOUT_MS) {
  const res = await fetch(url, {
    method: "POST",
    headers,
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  return { status: res.status, text };
}

// ── 通道适配：均返回 { ok, msg }，与 Python 版一一对应 ─────────────────────────

/** 企业微信群机器人。target 可填完整 webhook，也可只填 key。 */
export async function sendWecom(target, title, content) {
  const url = String(target).startsWith("http")
    ? target
    : `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=${encodeURIComponent(target)}`;
  const md = `### ${title}\n${content}`;
  const body = JSON.stringify({ msgtype: "markdown", markdown: { content: md } });
  const { status, text } = await httpPost(url, body, { "Content-Type": "application/json" });
  try {
    const obj = JSON.parse(text);
    if (obj.errcode === 0) return { ok: true, msg: "企业微信已送达" };
    return { ok: false, msg: `企业微信返回错误：${obj.errmsg || String(text).slice(0, 120)}` };
  } catch {
    return { ok: false, msg: `企业微信返回无法解析（HTTP ${status}）：${String(text).slice(0, 120)}` };
  }
}

/** Bark。target 可填完整 https://api.day.app/<key> 或自建地址，也可只填 key。 */
export async function sendBark(target, title, content) {
  const url = String(target).startsWith("http")
    ? String(target).replace(/\/+$/, "")
    : `https://api.day.app/${encodeURIComponent(target)}`;
  const body = JSON.stringify({ title, body: content });
  const { status, text } = await httpPost(url, body, { "Content-Type": "application/json" });
  if (status === 200) {
    try {
      const obj = JSON.parse(text);
      if (obj.code === 200 || obj.code === 0 || obj.data) return { ok: true, msg: "Bark 已送达" };
      return { ok: false, msg: `Bark 返回：${String(text).slice(0, 120)}` };
    } catch {
      return { ok: true, msg: "Bark 已送达" };
    }
  }
  return { ok: false, msg: `Bark HTTP ${status}：${String(text).slice(0, 120)}` };
}

/** Server酱（微信）。target 填 SENDKEY。 */
export async function sendServerchan(target, title, content) {
  const key = String(target).trim().replace(/\/+$/, "").split("/").pop();
  const url = `https://sctapi.ftqq.com/${encodeURIComponent(key)}.send`;
  const body = new URLSearchParams({ title, desp: content }).toString();
  const { status, text } = await httpPost(url, body, {
    "Content-Type": "application/x-www-form-urlencoded",
  });
  try {
    const obj = JSON.parse(text);
    if (obj.code === 0) return { ok: true, msg: "Server酱已送达（微信）" };
    return { ok: false, msg: `Server酱返回：${obj.message || String(text).slice(0, 120)}` };
  } catch {
    return { ok: false, msg: `Server酱 HTTP ${status}：${String(text).slice(0, 120)}` };
  }
}

const CHANNEL_FUNCS = Object.freeze({
  wecom: sendWecom,
  bark: sendBark,
  serverchan: sendServerchan,
});

// ── 统一分发（原项目 push()）──────────────────────────────────────────────────

/**
 * 发送一条告警。
 * @param {object} config  {enabled, channel, target, dedup_minutes}
 * @param {string} title
 * @param {string} content
 * @param {object} [opts]  {level, dedupKey, force, ignoreEnabled}
 * @returns {Promise<{ok:boolean,msg:string}>}
 */
export async function push(config, title, content, opts = {}) {
  const { level = LEVEL_INFO, dedupKey = null, force = false, ignoreEnabled = false } = opts;
  const cfg = { ...DEFAULT_CONFIG, ...(config || {}) };

  if (!cfg.enabled && !ignoreEnabled) return { ok: false, msg: "告警未启用" };
  const channel = CHANNELS.includes(cfg.channel) ? cfg.channel : "wecom";
  const target = String(cfg.target || "").trim();
  if (!target) return { ok: false, msg: "未配置推送地址" };

  if (!force && dedupKey) {
    const windowMs = Math.max(1, Number(cfg.dedup_minutes) || 30) * 60 * 1000;
    const last = sentCache.get(dedupKey) || 0;
    if (Date.now() - last < windowMs) return { ok: false, msg: "同类告警去重中，已跳过" };
  }

  let result;
  try {
    result = await CHANNEL_FUNCS[channel](target, title, content);
  } catch (e) {
    result = { ok: false, msg: `${e?.name || "Error"}: ${e?.message || e}` };
  }
  if (result.ok && dedupKey) sentCache.set(dedupKey, Date.now());
  return result;
}

/** 发送测试（原项目 send_test()）：不要求已启用、不要求已保存，填完即可测。 */
export async function sendTest(config, overrides = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...(config || {}) };
  const channel = CHANNELS.includes(String(overrides.channel || cfg.channel).toLowerCase())
    ? String(overrides.channel || cfg.channel).toLowerCase()
    : "wecom";
  const target = String(overrides.target || cfg.target || "").trim();
  if (!target) {
    return { ok: false, msg: "请先填写推送地址（企业微信 webhook / Bark 地址 / Server酱 KEY）" };
  }
  const now = new Date().toLocaleString("zh-CN", { hour12: false });
  const title = "🔥 守夜人 · 通道测试";
  const content =
    "> 这是一条**测试通知**。\n" +
    "收到它，说明告警通道已经接好了；出问题我会第一时间在这里喊你。\n\n" +
    `时间：${now}\n通道：${CHANNEL_LABEL[channel] || channel}`;
  try {
    return await CHANNEL_FUNCS[channel](target, title, content);
  } catch (e) {
    return { ok: false, msg: `${e?.name || "Error"}: ${e?.message || e}` };
  }
}

/** 带前缀的标题（与原项目的 🔴/🟡/🟢 分级一致）。 */
export function titleWithLevel(level, text) {
  return `${LEVEL_EMOJI[level] || ""} ${text}`.trim();
}
