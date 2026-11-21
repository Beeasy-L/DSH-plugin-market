<div align="center">

# DSH 插件市场 · DSH Plugin Market

**DeepSeek Harness 插件合集 —— 点开就在这一页看完，不用跳走。**
**A collection of DeepSeek Harness plugins — read every detail right here, no page jumps.**

[![Plugins](https://img.shields.io/badge/plugins-3-0052D9-blue)](plugins)
[![Website](https://img.shields.io/badge/website-online-00B42A)](https://beeasy-l.github.io/DSH-plugin-market/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-DeepSeek%20Harness-purple)](https://github.com/deepseek-ai/DeepSeek-Harness)

</div>

---

## 🌐 在线浏览 · Browse online

**→ https://beeasy-l.github.io/DSH-plugin-market/**

网页版支持：

- **中文 / English 一键切换** —— 点顶部按钮，整页语言立刻换
- **插件介绍页内展开** —— 点卡片上的「查看介绍」就在当前页展开，不跳新页面
- 每个插件的完整文档、截图、安装命令都在同一页

---

## 中文

这个仓库收录 **DeepSeek Harness**（DSH）的插件。每个插件放在 `plugins/<包名>/` 下，是一个**完整的独立包**，有自己的 `package.json`、`cordis.patch.yml`、locale 和图标。

### 插件列表

| 插件 | 说明 | 类型 |
|---|---|---|
| **[dsh-plugin-categorized](plugins/dsh-plugin-categorized/)** | **插件分类** —— 插件页新增「分类」标签，已装插件按用途自动分组；新装插件自动补中文标题与说明 | 界面增强 · 分类 · 自动翻译 |
| **[dsh-watchman](plugins/dsh-watchman/)** | **守夜人告警** —— 把待审批 / 报错 / 任务结束推到手机（Server酱 / Bark / 企业微信群机器人），设置页可视化配置 | 通知 · 移动推送 |
| **[dsh-qq-panel](plugins/dsh-qq-panel/)** | **QQ 面板** —— QQ 桥接（OneBot v11）的设置面板：人格卡编辑与热切换、表情包与备注管理、主动发言等行为参数、运行状态与日志 | 即时通讯 · 设置面板 |

### 安装

每个插件独立安装，指向它自己的子目录：

**在界面里装**

1. 打开 DeepSeek Harness → **插件 → 添加插件 → 添加本地目录**
2. 选 `plugins/dsh-plugin-categorized`、`plugins/dsh-watchman` 或 `plugins/dsh-qq-panel`
3. 装完**重启 DSH**（宿主半边在启动时装配）

**用命令行装**

```bash
git clone https://github.com/Beeasy-L/DSH-plugin-market.git

dsh plugin --profile desktop add "file:C:\path\to\DSH-plugin-market\plugins\dsh-plugin-categorized"
dsh plugin --profile desktop add "file:C:\path\to\DSH-plugin-market\plugins\dsh-watchman"
dsh plugin --profile desktop add "file:C:\path\to\DSH-plugin-market\plugins\dsh-qq-panel"
```

### 仓库结构

```
DSH-plugin-market/
├── README.md                  ← 本文件
├── CHANGELOG.md
├── LICENSE
├── dsh-labels.json            ← 仓库标签声明
├── docs/                      ← 网页版（GitHub Pages）
└── plugins/
    ├── dsh-plugin-categorized/   插件分类
    ├── dsh-watchman/             守夜人告警
    └── dsh-qq-panel/             QQ 面板
```

---

## English

This repository collects **DeepSeek Harness** (DSH) plugins. Each plugin lives in `plugins/<package-name>/` as a **complete, independent package** with its own `package.json`, `cordis.patch.yml`, locale files and icon.

### Plugins

| Plugin | What it does | Category |
|---|---|---|
| **[dsh-plugin-categorized](plugins/dsh-plugin-categorized/)** | **Plugin Categories** — a Categories tab that groups installed plugins by purpose, plus automatic Chinese titles and descriptions for newly installed plugins | UI enhancement · Categorization · Auto-translation |
| **[dsh-watchman](plugins/dsh-watchman/)** | **Watchman alerts** — push approvals, errors and task completions to your phone (Server酱 / Bark / WeCom bot), with a visual settings panel | Notifications · Mobile push |
| **[dsh-qq-panel](plugins/dsh-qq-panel/)** | **QQ panel** — a settings panel for the QQ bridge (OneBot v11): persona card editing with hot-swap, sticker and remark management, proactive-reply behaviour settings, runtime status and logs | Messaging · Settings panel |

### Installation

Each plugin installs independently. Point the installer at its own subdirectory:

**From the UI**

1. Open DeepSeek Harness → **Plugins → Add plugin → Add local directory**
2. Choose `plugins/dsh-plugin-categorized`, `plugins/dsh-watchman` or `plugins/dsh-qq-panel`
3. **Restart DSH** afterwards (the host half is assembled at startup)

**From the command line**

```bash
git clone https://github.com/Beeasy-L/DSH-plugin-market.git

dsh plugin --profile desktop add "file:C:\path\to\DSH-plugin-market\plugins\dsh-plugin-categorized"
dsh plugin --profile desktop add "file:C:\path\to\DSH-plugin-market\plugins\dsh-watchman"
dsh plugin --profile desktop add "file:C:\path\to\DSH-plugin-market\plugins\dsh-qq-panel"
```

### Repository layout

```
DSH-plugin-market/
├── README.md                  ← this file
├── CHANGELOG.md
├── LICENSE
├── dsh-labels.json            ← repository label declarations
├── docs/                      ← the website (GitHub Pages)
└── plugins/
    ├── dsh-plugin-categorized/   Plugin Categories
    ├── dsh-watchman/             Watchman alerts
    └── dsh-qq-panel/             QQ panel
```

---

## License

MIT © DSH Plugin Market contributors
