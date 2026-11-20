<div align="center">

# DSH 插件市场 · DSH Plugin Market

**DeepSeek Harness 插件合集 —— 点开就在这一页看完，不用跳走。**
**A collection of DeepSeek Harness plugins — read every detail right here, no page jumps.**

[![Plugins](https://img.shields.io/badge/plugins-3-0052D9-blue)](#插件--plugins)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-DeepSeek%20Harness-purple)](https://github.com/deepseek-ai/DeepSeek-Harness)
[![i18n](https://img.shields.io/badge/中文-EN-orange)](#)

</div>

---

<style>
:root { --dpm-accent: #0052D9; --dpm-border: #d0d7de; }
.dpm-switch { display: flex; gap: 6px; align-items: center; margin: 0 0 4px; font-size: 13px; }
.dpm-switch a { display: inline-block; padding: 2px 10px; border: 1px solid var(--dpm-border, #d0d7de); border-radius: 6px; text-decoration: none; font-size: 13px; color: inherit; }
.dpm-switch a:hover { border-color: var(--dpm-accent, #0052D9); }
#user-content-dpm-zh, #user-content-dpm-en { display: none; }
#user-content-dpm-zh:target, #user-content-dpm-en:target { display: block; }
.dpm-lead { display: none; }
.dpm-cards { display: flex; flex-wrap: wrap; gap: 14px; margin: 18px 0 8px; }
.dpm-card { flex: 1 1 260px; min-width: 240px; border: 1px solid var(--dpm-border, #d0d7de); border-radius: 10px; padding: 14px 16px; }
.dpm-card h3 { margin: 0 0 4px; font-size: 16px; }
.dpm-card .dpm-pkg { font-size: 12px; color: #6e7781; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.dpm-card p { margin: 8px 0 0; font-size: 13px; line-height: 1.6; }
.dpm-tag { display: inline-block; font-size: 11px; padding: 1px 8px; border-radius: 999px; border: 1px solid var(--dpm-border, #d0d7de); margin-right: 4px; color: #6e7781; }
.dpm-detail { margin: 10px 0 0; }
.dpm-detail > summary { cursor: pointer; font-size: 13px; font-weight: 600; padding: 7px 0; color: var(--dpm-accent, #0052D9); }
.dpm-detail[open] > summary { margin-bottom: 6px; }
.dpm-detail .dpm-body { border-left: 3px solid var(--dpm-border, #d0d7de); padding: 2px 0 2px 16px; font-size: 13.5px; line-height: 1.7; }
.dpm-detail .dpm-body h4 { margin: 16px 0 6px; font-size: 14px; }
.dpm-detail .dpm-body table { font-size: 13px; }
.dpm-detail .dpm-body pre { font-size: 12px; }
.dpm-hint { font-size: 12px; color: #6e7781; margin: 6px 0 0; }
</style>

<div class="dpm-switch">
  <a href="#dpm-zh">中文</a>
  <a href="#dpm-en">English</a>
</div>

<div id="dpm-zh">

> **点上面的「中文 / English」切换整页语言。下面每个插件的「查看介绍」是在本页展开的，不跳新页面。**

---

## 插件 · Plugins

<div class="dpm-cards">

<div class="dpm-card">
<h3>插件分类</h3>
<div class="dpm-pkg">dsh-plugin-categorized</div>
<p>给插件页加一个<strong>分类</strong>标签：装了多少插件、按什么用、叫什么中文名，一屏看清。外加<strong>自动翻译</strong>——以后新装的插件，插件页上自动显示中文标题与说明。</p>
<span class="dpm-tag">界面增强</span><span class="dpm-tag">分类</span><span class="dpm-tag">自动翻译</span>
<details class="dpm-detail">
<summary>查看介绍 · Read more</summary>
<div class="dpm-body">

**痛点：插件装多了，就找不到**

插件页只有「已安装」和「发现」两个视角。装了二三十个插件之后：

- **列表是一维的** —— 视觉、皮肤、聊天、量化、动画、笔记……全挤在一起
- **名字和说明多半是英文** —— 一个叫 `dsh-waste-market` 的包，你需要点进去才知道它是 A 股看盘
- **每次装新插件都要重读一遍** —— 新装的东西不知道归到哪一摞

**三个卖点**

1. **分类标签页** —— 插件从「一堆」变成「几摞」：视觉与视频、界面与美化、用量与计费、即时通讯、远程控制、金融行情、开发与效率、系统与维护、官方核心、其他。每组带插件数量。
2. **自动翻译** —— 装完新插件，插件页上立刻显示中文名和中文说明。走宿主默认模型，只翻公开元数据，失败自动跳过。首次安装还会补扫历史插件。
3. **手动改分类** —— 内置规则认不出的落进「其他」，在那一行右侧下拉即可改；也支持新建分类和「自动归类」还原。改动存浏览器本地，不动 profile 文件。

**边界**：官方「已安装」标签原样保留，这个插件只管**看**和**分**，不碰你的开关。

[完整文档 →](plugins/dsh-plugin-categorized/README.md)

</div>
</details>
</div>

<div class="dpm-card">
<h3>守夜人告警</h3>
<div class="dpm-pkg">dsh-watchman</div>
<p>把 DeepSeek Harness 的<strong>待审批、报错、任务结束</strong>推到手机（Server酱 / Bark / 企业微信群机器人）。你在电脑上让 DSH 跑长任务、人离开了，插件替你盯着，出事喊你。</p>
<span class="dpm-tag">通知</span><span class="dpm-tag">手机推送</span>
<details class="dpm-detail">
<summary>查看介绍 · Read more</summary>
<div class="dpm-body">

**特性**

- **三种推送通道**：Server酱（微信）、Bark（iPhone）、企业微信群机器人；填完整地址或只填 key 都认
- **设置页可视化配置**：状态、通道、推哪些事件、发送测试、看日志，不用敲配置
- **事件分流 + 分级**：🔴 报错/登录态失效 · 🟡 待审批/断线 · 🟢 任务结束
- **去重防抖**：同一事件在窗口期（默认 30 分钟）只推一次，去重表落盘，进程重启也不会重复推
- **独立进程**：订阅与推送跑在独立进程里，宿主崩了，已连上的链路照跑
- **凭据不出本机**：地址只以打码形式（如 `SCT123…aBcD`）返回给界面与日志

**推哪些事件**

| 事件 | 级别 | 默认 |
|---|---|---|
| `approval-request` 工具放行待批 | 🟡 | 开 |
| `user-question` / `plan-review` 等你回答 | 🟡 | 开 |
| `session-error` 任务报错 | 🔴 | 开 |
| `turn-end` 任务结束 | 🟢 | 开 |
| `gap` 订阅断线 | 🟡 | 开 |
| `auth-error` harness cookie 失效 | 🔴 | 开 |

「任务结束」想要安静模式：关掉 `turnEnd`，只有异常结束才推。

[完整文档 →](plugins/dsh-watchman/README.md)

</div>
</details>
</div>

<div class="dpm-card">
<h3>QQ 面板</h3>
<div class="dpm-pkg">dsh-qq-panel</div>
<p>QQ 桥接（qq-bridge / OneBot v11）的设置面板：<strong>人格卡编辑与热切换</strong>、表情包与备注管理、主动发言等行为参数、运行状态与日志。只读写文件，不碰 QQ 客户端。</p>
<span class="dpm-tag">即时通讯</span><span class="dpm-tag">设置面板</span>
<details class="dpm-detail">
<summary>查看介绍 · Read more</summary>
<div class="dpm-body">

**界面**

| 标签页 | 做什么 |
|---|---|
| **人格卡** | 列出 `roles/*.md`，在等宽编辑器里改；保存前自动备份到 `人格卡/<role>/版本/`（保留最近 30 份）；热切换当前人格卡（逐条消息注入）；显示字数与 lint 提示 |
| **表情包** | 列出表情素材与标题/大小/上传状态；编辑模型选图时用的备注；通过 OneBot `add_custom_face` 把表情上传进 QQ 收藏 |
| **行为** | 主人 QQ、私聊/群聊白名单、主动发言（开关、闲置阈值、检查间隔、概率）、唤醒模式、是否允许模型自设潜水计时、思考强度；写入 `config.json`（桥接重启后生效） |
| **状态 / 日志** | 桥接可达性、运行模式、连接状态、当前人格卡；`state/bridge.log` 尾部 |

**安全边界**：只**读和写文件** —— 从不启动/停止 SnowLuma，从不碰 QQ 客户端，从不主动发消息。

**也能脱离 DSH 单跑**：`node server.mjs` → <http://127.0.0.1:3101>，两种模式共用同一套读写代码。

[完整文档 →](plugins/dsh-qq-panel/README.md)

</div>
</details>
</div>

</div>

<p class="dpm-hint">点卡片里的「查看介绍」在本页展开；点右上角切换整页语言。</p>

---

## 安装 · Install

每个插件独立安装，指向它自己的子目录：

**在界面里装**

1. 打开 DeepSeek Harness → **插件 → 添加插件 → 添加本地目录**
2. 选 `plugins/dsh-plugin-categorized`、`plugins/dsh-watchman` 或 `plugins/dsh-qq-panel`
3. 装完**重启 DSH**

**用命令行装**

```bash
git clone https://github.com/Beeasy-L/DSH-plugin-market.git

dsh plugin --profile desktop add "file:C:\path\to\DSH-plugin-market\plugins\dsh-plugin-categorized"
dsh plugin --profile desktop add "file:C:\path\to\DSH-plugin-market\plugins\dsh-watchman"
dsh plugin --profile desktop add "file:C:\path\to\DSH-plugin-market\plugins\dsh-qq-panel"
```

---

## 仓库结构 · Layout

```
DSH-plugin-market/
├── README.md                  ← 本文件
├── CHANGELOG.md
├── LICENSE
├── dsh-labels.json            ← 仓库标签声明
└── plugins/
    ├── dsh-plugin-categorized/   插件分类
    ├── dsh-watchman/             守夜人告警
    └── dsh-qq-panel/             QQ 面板
```

---

## 投稿 · Contributing

新增插件放进 `plugins/<包名>/`，包含 `package.json`（含 `dsh.bundle.patch`）、`cordis.patch.yml`、`locale/{zh,en}.json`、`icon.svg`、`README.md`，然后在上面的卡片列表里加一张。

---

## License

MIT © DSH Plugin Market contributors

</div>

<div id="dpm-en">

> **Use the "中文 / English" switch above to change the language of this page. Each plugin's "Read more" expands right here — no page jumps.**

---

## Plugins

<div class="dpm-cards">

<div class="dpm-card">
<h3>Plugin Categories</h3>
<div class="dpm-pkg">dsh-plugin-categorized</div>
<p>A <strong>Categories</strong> tab for the Plugins page: how many plugins you have, what each is for, and what its Chinese name is — all on one screen. Plus <strong>automatic translation</strong>: newly installed plugins show Chinese titles and descriptions on their own.</p>
<span class="dpm-tag">UI</span><span class="dpm-tag">Categories</span><span class="dpm-tag">Auto-translation</span>
<details class="dpm-detail">
<summary>Read more</summary>
<div class="dpm-body">

**The problem: too many plugins, no way to find them**

The Plugins page shows you *Installed* and *Discover*. After twenty or thirty plugins, that view stops working well:

- **The list is one-dimensional.** Vision, skins, chat, quant, animation, notes — all in one column
- **Names and descriptions are usually English.** You have to open `dsh-waste-market` to learn it's an A-share dashboard
- **Every new install means re-reading everything.** You don't know where the new thing belongs

**Three features**

1. **A Categories tab** — plugins become shelves, not a pile: Vision & video, UI & theming, Usage & billing, Messaging, Remote control, Markets, Dev & productivity, System & maintenance, Official core, Other. Each group shows its count.
2. **Automatic translation** — install a plugin and its Chinese title and description appear immediately. It uses the host's default model, translates public metadata only, and skips failures quietly. The first install also backfills existing English-only plugins.
3. **Change categories yourself** — plugins the built-in rules don't recognize land in "Other"; pick a category from the dropdown on that row, create a new one, or fall back to "Auto". Your choices live in the browser and never touch a profile file.

**Boundary**: the official *Installed* tab is completely unchanged — this plugin only *views* and *groups*; it never touches your switches.

[Full documentation →](plugins/dsh-plugin-categorized/README.md)

</div>
</details>
</div>

<div class="dpm-card">
<h3>Watchman alerts</h3>
<div class="dpm-pkg">dsh-watchman</div>
<p>Push DSH <strong>approval requests, errors and task completions</strong> to your phone (Server酱 / Bark / WeCom bot). Let DSH run a long job while you're away — the plugin keeps watch and calls you when something needs you.</p>
<span class="dpm-tag">Notifications</span><span class="dpm-tag">Mobile push</span>
<details class="dpm-detail">
<summary>Read more</summary>
<div class="dpm-body">

**Features**

- **Three channels**: Server酱 (WeChat), Bark (iPhone), WeCom group bot — a full URL or just the key both work
- **Visual settings panel**: status, channel, which events to push, send a test, read the log — no config editing
- **Classification and severity**: 🔴 error / auth failure · 🟡 approval / disconnect · 🟢 task end
- **Deduplication**: the same event fires once per window (30 minutes by default); the dedupe table is persisted, so a restart doesn't re-push
- **Standalone process**: subscription and delivery run outside the host, so a host crash doesn't kill an established alert path
- **Credentials stay local**: addresses are only ever returned to the UI and logs in masked form (e.g. `SCT123…aBcD`)

**Events**

| Event | Severity | Default |
|---|---|---|
| `approval-request` a tool needs your approval | 🟡 | on |
| `user-question` / `plan-review` waiting on you | 🟡 | on |
| `session-error` the task errored | 🔴 | on |
| `turn-end` the task finished | 🟢 | on |
| `gap` the subscription dropped | 🟡 | on |
| `auth-error` the harness cookie expired | 🔴 | on |

Want "task finished" to be quiet? Turn off `turnEnd` and only abnormal endings get pushed.

[Full documentation →](plugins/dsh-watchman/README.md)

</div>
</details>
</div>

<div class="dpm-card">
<h3>QQ panel</h3>
<div class="dpm-pkg">dsh-qq-panel</div>
<p>A settings panel for the QQ bridge (qq-bridge / OneBot v11): <strong>persona card editing with hot-swap</strong>, sticker and remark management, proactive-reply behaviour settings, runtime status and logs. It only reads and writes files — it never touches the QQ client.</p>
<span class="dpm-tag">Messaging</span><span class="dpm-tag">Settings panel</span>
<details class="dpm-detail">
<summary>Read more</summary>
<div class="dpm-body">

**Panels**

| Tab | What it does |
|---|---|
| **Persona** | Lists `roles/*.md` and edits them in a monospace editor; backs up to `人格卡/<role>/版本/` before saving (keeps the last 30); hot-swaps the active persona (injected per message); shows a character count and lint hints |
| **Stickers** | Lists sticker assets with title, size and upload state; edits the per-sticker note the model uses when picking an image; uploads a sticker into QQ favourites via OneBot `add_custom_face` |
| **Behaviour** | Owner QQ, private/group allow-lists, proactive messaging (on/off, idle threshold, check interval, probability), wake mode, whether the model may set its own dive timer, reasoning effort; writes `config.json` (takes effect after the bridge restarts) |
| **Status / logs** | Bridge reachability, mode, connection state, active persona; tail of `state/bridge.log` |

**Safety boundary**: it only **reads and writes files** — it never starts or stops SnowLuma, never touches the QQ client, never sends a message.

**Also runs without DSH**: `node server.mjs` → <http://127.0.0.1:3101>. Both modes share the same read/write code.

[Full documentation →](plugins/dsh-qq-panel/README.md)

</div>
</details>
</div>

</div>

<p class="dpm-hint">Open "Read more" on any card to expand it here; use the switch at the top to change the language of the whole page.</p>

---

## Install

Each plugin installs independently. Point the installer at its own subdirectory:

**From the UI**

1. Open DeepSeek Harness → **Plugins → Add plugin → Add local directory**
2. Choose `plugins/dsh-plugin-categorized`, `plugins/dsh-watchman` or `plugins/dsh-qq-panel`
3. **Restart DSH** afterwards

**From the command line**

```bash
git clone https://github.com/Beeasy-L/DSH-plugin-market.git

dsh plugin --profile desktop add "file:C:\path\to\DSH-plugin-market\plugins\dsh-plugin-categorized"
dsh plugin --profile desktop add "file:C:\path\to\DSH-plugin-market\plugins\dsh-watchman"
dsh plugin --profile desktop add "file:C:\path\to\DSH-plugin-market\plugins\dsh-qq-panel"
```

---

## Layout

```
DSH-plugin-market/
├── README.md                  ← this file
├── CHANGELOG.md
├── LICENSE
├── dsh-labels.json            ← repository label declarations
└── plugins/
    ├── dsh-plugin-categorized/   Plugin Categories
    ├── dsh-watchman/             Watchman alerts
    └── dsh-qq-panel/             QQ panel
```

---

## Contributing

Drop a new plugin into `plugins/<package-name>/` with `package.json` (including `dsh.bundle.patch`), `cordis.patch.yml`, `locale/{zh,en}.json`, `icon.svg` and `README.md`, then add a card to the list above.

---

## License

MIT © DSH Plugin Market contributors

</div>
