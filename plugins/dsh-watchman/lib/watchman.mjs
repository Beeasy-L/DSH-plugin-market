/**
 * 守夜人 · DSH 事件警报器
 *
 * 作用：订阅 DSH 宿主事件（需要拍板 / 报错 / 任务结束 / 断线 / 登录态失效），
 *       经 notifier.mjs（三通道）推到你手机。
 *
 * 事件源直接复用 dsh-remote 里**已真机验证**的 dsh-events.mjs：
 *   · createEventSubscriber / NODE_KINDS                    ← 订阅与分类
 *   · answerApproval(eventId, "allowed-once" | "rejected")   ← 阶段二回执（本文件当前不调）
 * 上游地址与 harness cookie 从 <relayDir>/.harness-cookie*.json 动态取（cookie 会过期重签，
 * 因此传的是**取值器函数**而不是当次的值——沿用 dsh-remote 的做法）。
 *
 * 本文件随插件包发布，**不含任何个人路径**：
 *   · 数据目录：环境变量 DSH_WATCHMAN_DIR，缺省 ~/.dsh-watchman（配置文件、pid、日志都在这里）
 *   · relay 目录：watchman.config.json 的 relayDir，缺省 ~/.dsh-remote
 *   · 事件模块：watchman.config.json 的 eventsModule，缺省 <relayDir>/clients/dsh-remote/dsh-events.mjs
 *
 * 用法：
 *   node watchman.mjs                 正常跑（前台，Ctrl+C 退出）
 *   node watchman.mjs --dry-run       只打印，不真发
 *   node watchman.mjs --verbose       连分类细节点都打
 *   node watchman.mjs --test          发一条测试到手机后退出
 */

import { readFileSync, writeFileSync, appendFileSync, readdirSync, existsSync, unlinkSync, mkdirSync } from "node:fs";
import { createConnection } from "node:net";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { homedir } from "node:os";

import {
  push,
  sendTest,
  titleWithLevel,
  loadDedupeFromFile,
  saveDedupeToFile,
  LEVEL_CRITICAL,
  LEVEL_WARNING,
  LEVEL_INFO,
} from "./notifier.mjs";

/** 数据目录：插件宿主半边通过 DSH_WATCHMAN_DIR 注入；单独运行时用 ~/.dsh-watchman。 */
const DATA_DIR = process.env.DSH_WATCHMAN_DIR || join(homedir(), ".dsh-watchman");
try {
  mkdirSync(DATA_DIR, { recursive: true });
} catch {
  /* 目录建不了就让后面的读写各自报错 */
}

// ── 配置（全部落在数据目录，插件与独立进程共用同一份）─────────────────────────
const CONFIG_PATH = join(DATA_DIR, "watchman.config.json");
const NOTIFY_PATH = join(DATA_DIR, "config.json");
const LOG_PATH = join(DATA_DIR, "watchman.log");
const PID_PATH = join(DATA_DIR, "watchman.pid");
const DEDUPE_PATH = join(DATA_DIR, "watchman.dedupe.json");

const DEFAULT_RELAY_DIR = join(homedir(), ".dsh-remote");

const DEFAULTS = {
  relayDir: DEFAULT_RELAY_DIR,
  eventsModule: join(DEFAULT_RELAY_DIR, "clients", "dsh-remote", "dsh-events.mjs"),
  pushOn: {
    approval: true,        // 🟡 需要你拍板
    question: true,        // 🟡 agent 在等你回答 / 计划待批
    sessionError: true,    // 🔴 任务报错
    turnEnd: true,         // 任务结束（默认开；嫌吵可改 false，只推异常结束）
    turnEndReasons: ["error", "aborted", "blocked", "interrupted", "max-tokens"],
    gap: true,             // 🟡 订阅断线窗口（期间通知可能漏了）
    authError: true,       // 🔴 DSH 登录态（harness cookie）失效
  },
};

// ── 单实例保护 ────────────────────────────────────────────────────────────────
// 去重表是进程内的：起两个实例 = 同一条告警推两次。所以同一数据目录只允许一个实例。
function acquiredSingleInstance() {
  try {
    const old = Number(String(readFileSync(PID_PATH, "utf8")).trim());
    if (Number.isFinite(old) && old > 0 && old !== process.pid) {
      try {
        process.kill(old, 0); // 不抛 = 进程还活着
        return old;
      } catch {
        /* 已退出，可接管 */
      }
    }
  } catch {
    /* 没有 pid 文件，正常首次启动 */
  }
  try {
    writeFileSync(PID_PATH, String(process.pid), "utf8");
  } catch {
    /* 写不了也不致命 */
  }
  return null;
}

function loadJson(p, fallback) {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

const fileCfg = loadJson(CONFIG_PATH, {});
const cfg = { ...DEFAULTS, ...fileCfg };
// 环境变量优先：插件宿主半边用 DSH_WATCHMAN_RELAY_DIR 指定 dsh-remote 目录
if (process.env.DSH_WATCHMAN_RELAY_DIR) cfg.relayDir = process.env.DSH_WATCHMAN_RELAY_DIR;
// 配置文件没写 eventsModule 时，按生效的 relayDir 推导（而不是用打包时的默认值）
if (!fileCfg.eventsModule) cfg.eventsModule = join(cfg.relayDir, "clients", "dsh-remote", "dsh-events.mjs");
cfg.pushOn = { ...DEFAULTS.pushOn, ...(cfg.pushOn || {}) };
const notifyCfg = loadJson(NOTIFY_PATH, {});

// 去重表落盘：进程重启后不重复轰炸（原项目是纯内存表，这里是刻意的增强）
loadDedupeFromFile(DEDUPE_PATH);

const ARGS = new Set(process.argv.slice(2));
const DRY_RUN = ARGS.has("--dry-run");
const VERBOSE = ARGS.has("--verbose") || DRY_RUN;

// ── 日志 ──────────────────────────────────────────────────────────────────────
function log(level, msg) {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
  console.log(line);
  try {
    appendFileSync(LOG_PATH, line + "\n", "utf8");
  } catch {
    /* 日志写不了不阻断 */
  }
}
const info = (m) => log("info", m);
const warn = (m) => log("warn", m);
const debug = (m) => VERBOSE && log("debug", m);

// ── 上游发现：从 .harness-cookie*.json 取 authority + cookie ──────────────────
function cookieFiles() {
  try {
    return readdirSync(cfg.relayDir)
      .filter((f) => f === ".harness-cookie.json" || f.startsWith(".harness-cookie."))
      .map((f) => join(cfg.relayDir, f));
  } catch {
    return [];
  }
}

function portListening(host, port, timeoutMs = 300) {
  return new Promise((resolve) => {
    const sock = createConnection({ host, port });
    const done = (v) => {
      sock.destroy();
      resolve(v);
    };
    sock.setTimeout(timeoutMs);
    sock.once("connect", () => done(true));
    sock.once("error", () => done(false));
    sock.once("timeout", () => done(false));
  });
}

/**
 * 选一个可用的宿主：优先「端口在监听」的，其次 mintedAt 最新的。
 * 返回 { upstream, cookie } 或 null。
 */
async function discoverUpstream() {
  const cands = [];
  for (const f of cookieFiles()) {
    const j = loadJson(f, null);
    if (!j || typeof j.authority !== "string" || typeof j.cookie !== "string") continue;
    const [host, portStr] = j.authority.split(":");
    const port = Number(portStr);
    if (!host || !Number.isFinite(port)) continue;
    cands.push({ file: f, host, port, authority: j.authority, cookie: j.cookie, mintedAt: Number(j.mintedAt) || 0 });
  }
  if (cands.length === 0) return null;
  cands.sort((a, b) => b.mintedAt - a.mintedAt);
  for (const c of cands) {
    if (await portListening(c.host, c.port)) {
      return { upstream: `http://${c.host}:${c.port}`, authority: c.authority, cookie: c.cookie, file: c.file };
    }
  }
  const c = cands[0];
  return { upstream: `http://${c.host}:${c.port}`, authority: c.authority, cookie: c.cookie, file: c.file };
}

// ── 推送封装（统一带上分级与去重键）─────────────────────────────────────────────
async function alert(title, content, { level = LEVEL_INFO, dedupKey = null, force = false } = {}) {
  const full = titleWithLevel(level, title);
  if (DRY_RUN) {
    info(`[dry-run] 本应推送：${full}\n${content}`);
    return { ok: false, msg: "dry-run" };
  }
  const r = await push(notifyCfg, full, content, { level, dedupKey, force });
  if (r.ok) {
    saveDedupeToFile(DEDUPE_PATH); // 落盘：重启后同一 dedupKey 不会被重复轰炸
    info(`已推送：${full}（${r.msg}）`);
  } else {
    warn(`未推送：${full}（${r.msg}）`);
  }
  return r;
}

const short = (s, n = 200) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n) + "…" : t;
};

function headerOf(node) {
  const sid = node?.sessionId || node?.session || "?";
  return `**会话**：${sid}\n**时间**：${new Date().toLocaleString("zh-CN", { hour12: false })}\n`;
}

// ── 事件处理 ──────────────────────────────────────────────────────────────────
function buildHandlers(NODE_KINDS) {
  return {
    onEvent(node) {
      const kind = node?.kind;
      debug(`事件 kind=${kind} ${JSON.stringify(node).slice(0, 400)}`);

      switch (kind) {
        case NODE_KINDS.APPROVAL_REQUEST: {
          if (!cfg.pushOn.approval) return;
          const tool = node.toolName || node.tool || "未知工具";
          const reason = short(node.reason || node.message || "", 160);
          const id = node.eventId || node.id || "";
          alert(
            "需要你拍板（工具放行）",
            headerOf(node) +
              `**要放行**：\`${tool}\`\n` +
              (reason ? `**原因**：${reason}\n` : "") +
              `\n**怎么处理**：打开手机上的 DSH 远程页面点「允许一次」/「拒绝」。\n` +
              (id ? `（事件号 ${id}）` : ""),
            { level: LEVEL_WARNING, dedupKey: `approval:${id || tool}` }
          );
          return;
        }

        case NODE_KINDS.PLAN_REVIEW:
        case NODE_KINDS.USER_QUESTION: {
          if (!cfg.pushOn.question) return;
          const id = node.eventId || node.id || "";
          alert(
            "有事情在等你回答",
            headerOf(node) +
              `**内容**：${short(node.text || node.question || node.title || "（见手机页面）", 300)}\n` +
              `\n**怎么处理**：打开手机上的 DSH 远程页面回复。\n` +
              (id ? `（事件号 ${id}）` : ""),
            { level: LEVEL_WARNING, dedupKey: `question:${id}` }
          );
          return;
        }

        case NODE_KINDS.SESSION_ERROR: {
          if (!cfg.pushOn.sessionError) return;
          const id = node.eventId || node.id || "";
          alert(
            "DSH 任务报错",
            headerOf(node) +
              `**错误**：${short(node.message || node.error || node.text || "（无详情）", 300)}\n` +
              `\n**建议**：打开 DSH 看这一轮的日志。`,
            { level: LEVEL_CRITICAL, dedupKey: `error:${node.sessionId || "?"}:${id}` }
          );
          return;
        }

        case NODE_KINDS.TURN_END: {
          const reason = node.reason && typeof node.reason === "object" ? node.reason.kind : node.reason;
          const id = node.eventId || node.id || "";
          const interesting = reason && reason !== "completed";
          if (!cfg.pushOn.turnEnd && !interesting) return;
          if (interesting && !cfg.pushOn.turnEndReasons.includes(reason)) {
            debug(`turn-end reason=${reason} 不在推送清单，跳过`);
            return;
          }
          alert(
            interesting ? `任务结束（${reason}）` : "任务已结束",
            headerOf(node) +
              `**结果**：${reason || "completed"}\n` +
              (node.text ? `**摘要**：${short(node.text, 300)}\n` : "") +
              `\n打开 DSH 可查看完整过程。`,
            {
              level: interesting ? LEVEL_WARNING : LEVEL_INFO,
              dedupKey: `turnend:${node.sessionId || "?"}:${id || reason}`,
            }
          );
          return;
        }

        case NODE_KINDS.GAP: {
          if (!cfg.pushOn.gap) return;
          alert(
            "订阅断线，这段时间的通知可能漏了",
            `**断线窗口**：${node.from ? new Date(node.from).toLocaleString("zh-CN", { hour12: false }) : "?"} → ` +
              `${node.to ? new Date(node.to).toLocaleString("zh-CN", { hour12: false }) : "?"}\n\n` +
              `事件不会重放，漏了就是漏了——如涉及重要任务，请打开 DSH 核对。`,
            { level: LEVEL_WARNING, dedupKey: "gap" }
          );
          return;
        }

        case NODE_KINDS.EVENT_EXPIRED:
          debug("事件已作废（审批/提问过期），不推送");
          return;

        default:
          debug(`未处理的事件 kind=${kind}`);
      }
    },

    onAuthError(info2) {
      if (!cfg.pushOn.authError) return;
      warn(`鉴权失败：${JSON.stringify(info2)}`);
      alert(
        "DSH 登录态失效，告警可能中断",
        `**位置**：${info2?.surface || "?"}\n**状态**：${info2?.status || "?"}\n\n` +
          `等价于星火守夜人里的「登录态失效」：DSH 重启或换端口后，需要让 dsh-remote 侧刷新 harness cookie` +
          `（本机 .dsh-remote 会自动重签，若持续失败请重启 DSH 应用）。`,
        { level: LEVEL_CRITICAL, dedupKey: "auth-error" }
      );
    },

    onGap() {},
    onFault(f) {
      warn(`订阅层非致命故障：${short(JSON.stringify(f), 250)}`);
    },
  };
}

// ── 主流程 ────────────────────────────────────────────────────────────────────
async function main() {
  const alivePid = acquiredSingleInstance();
  if (alivePid && !ARGS.has("--test")) {
    console.log(`[守夜人] 已有实例在跑（pid ${alivePid}），本次启动取消。`);
    console.log(`         要重启请先结束它：taskkill /PID ${alivePid} /F`);
    process.exit(0);
  }

  if (ARGS.has("--test")) {
    info("发送测试通知…");
    const r = await sendTest(notifyCfg, {});
    console.log(r.ok ? `✅ ${r.msg}` : `❌ ${r.msg}`);
    process.exit(r.ok ? 0 : 1);
  }

  info("=".repeat(60));
  info("守夜人 · DSH 事件警报器启动");
  info(`推送通道：${notifyCfg.channel || "(未配置)"} → ${String(notifyCfg.target || "").slice(0, 8)}…`);
  info(`事件模块：${cfg.eventsModule}`);
  info(`模式：${DRY_RUN ? "DRY-RUN（不真发）" : "正式"}`);
  info("=".repeat(60));

  if (!existsSync(cfg.eventsModule)) {
    warn(`事件模块不存在：${cfg.eventsModule}（dsh-remote 是否已安装？）`);
    process.exit(1);
  }

  const ev = await import(pathToFileURL(cfg.eventsModule).href);
  const { createEventSubscriber, NODE_KINDS } = ev;
  if (typeof createEventSubscriber !== "function") {
    warn("事件模块没有 createEventSubscriber，版本不匹配");
    process.exit(1);
  }

  const first = await discoverUpstream();
  if (!first) {
    warn(`没能从 ${cfg.relayDir} 里读到 .harness-cookie*.json，无法连宿主`);
    process.exit(1);
  }
  info(`上游：${first.upstream}（凭据文件 ${first.file.split(/[\\/]/).pop()}）`);

  // 传取值器：端口变了 / cookie 重签了都能跟上（dsh-remote 的原做法）
  // 注意：必须先声明这两个变量，构造函数可能立刻调用取值器。
  let cachedUpstream = first.upstream;
  let cachedCookie = first.cookie;

  const sub = createEventSubscriber({
    upstream: () => cachedUpstream,
    cookie: () => cachedCookie,
    follow: true,
    log: (level, message) => {
      const fn = level === "error" || level === "warn" ? warn : debug;
      fn(`[events] ${message}`);
    },
  });

  // 定期重新发现（宿主端口会变、cookie 会重签）
  const refresh = setInterval(async () => {
    const d = await discoverUpstream();
    if (!d) return;
    if (d.upstream !== cachedUpstream || d.cookie !== cachedCookie) {
      info(`宿主变化：${cachedUpstream} → ${d.upstream}（凭据已更新）`);
      cachedUpstream = d.upstream;
      cachedCookie = d.cookie;
    }
  }, 30_000);
  refresh.unref?.();

  const h = buildHandlers(NODE_KINDS);
  sub.on("event", (node) => {
    try {
      h.onEvent(node);
    } catch (e) {
      warn(`处理事件出错：${e?.message || e}`);
    }
  });
  sub.on("ready", (r) => info(`已连上宿主事件流：${JSON.stringify(r).slice(0, 200)}`));
  sub.on("auth-error", (i) => h.onAuthError(i));
  sub.on("gap", (g) => h.onGap(g));
  sub.on("fault", (f) => h.onFault(f));
  sub.on("closed", () => warn("订阅器已关闭"));

  if (typeof sub.start === "function") sub.start();
  info("订阅已启动，等待事件…（Ctrl+C 退出）");

  const bye = async () => {
    info("收到退出信号，正在关闭…");
    clearInterval(refresh);
    try {
      sub.close?.();
    } catch {
      /* ignore */
    }
    try {
      if (Number(String(readFileSync(PID_PATH, "utf8")).trim()) === process.pid) unlinkSync(PID_PATH);
    } catch {
      /* ignore */
    }
    saveDedupeToFile(DEDUPE_PATH);
    process.exit(0);
  };
  process.on("SIGINT", bye);
  process.on("SIGTERM", bye);
}

main().catch((e) => {
  warn(`启动失败：${e?.stack || e}`);
  process.exit(1);
});
