# DSH 插件仓库 · DSH Plugin Repository

<div align="center">

**DeepSeek Harness 插件合集 —— 每个插件一个子目录，独立安装。**
**A collection of DeepSeek Harness plugins — one subdirectory per plugin, installed independently.**

[![Plugins](https://img.shields.io/badge/plugins-2-0052D9-blue)](plugins)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-DeepSeek%20Harness-purple)](https://github.com/deepseek-ai/DeepSeek-Harness)
[![i18n](https://img.shields.io/badge/i18n-中文%20%7C%20English-orange)](plugins/dsh-plugin-categorized/locale/zh.json)

</div>

---

## 中文

这个仓库收录 **DeepSeek Harness**（DSH）的插件。每个插件放在 `plugins/<包名>/` 下，是一个**完整的独立包**，有自己的 `package.json`、`cordis.patch.yml`、locale 和图标。

### 插件列表

| 插件 | 说明 | 类型 |
|---|---|---|
| **[dsh-plugin-categorized](plugins/dsh-plugin-categorized/)** | **插件分类** —— 插件页新增「分类」标签，已装插件按用途自动分组；新装插件自动补中文标题与说明 | 界面增强 · 分类 · 自动翻译 |
| **[dsh-watchman](plugins/dsh-watchman/)** | **守夜人告警** —— 把待审批 / 报错 / 任务结束推到手机（Server酱 / Bark / 企业微信群机器人），设置页可视化配置 | 通知 · 移动推送 |

### 安装

每个插件独立安装，指向它自己的子目录：

**在界面里装**

1. 打开 DeepSeek Harness → **插件 → 添加插件 → 添加本地目录**
2. 选 `plugins/dsh-plugin-categorized` 或 `plugins/dsh-watchman`
3. 装完**重启 DSH**（宿主半边在启动时装配）

**用命令行装**

```bash
# 克隆整个仓库
git clone https://github.com/Beeasy-L/DSH-plugin-market.git

# 装其中一个插件（--profile 按你的 profile 名改）
dsh plugin --profile desktop add "file:C:\path\to\DSH-plugin-market\plugins\dsh-plugin-categorized"
dsh plugin --profile desktop add "file:C:\path\to\DSH-plugin-market\plugins\dsh-watchman"
```

### 仓库结构

```
DSH-plugin-market/
├── README.md                  ← 本文件（仓库索引）
├── CHANGELOG.md
├── LICENSE
├── dsh-labels.json            ← 仓库标签声明
└── plugins/
    ├── dsh-plugin-categorized/   插件分类
    │   ├── package.json
    │   ├── index.js              宿主半边
    │   ├── client.js             浏览器半边
    │   ├── cordis.patch.yml
    │   ├── locale/{zh,en}.json
    │   ├── docs/DETAIL.md
    │   └── icon.svg
    └── dsh-watchman/             守夜人告警
        ├── package.json
        ├── lib/
        │   ├── index.js          宿主半边（4 条路由）
        │   ├── client.js         设置页一节
        │   ├── watchman.mjs      独立进程：订阅 + 分类 + 去重
        │   └── notifier.mjs      通道层：Server酱 / Bark / 企业微信
        ├── test/notify.selftest.mjs
        ├── locale/{zh,en}.json
        └── icon.svg
```

### 贡献插件

新增插件只要放进 `plugins/<包名>/`，包含：

- `package.json`（`name` / `version` / `exports` / `dsh.bundle.patch` / `dsh.client`）
- `cordis.patch.yml`（插入插件行）
- `locale/zh.json` + `locale/en.json`（`meta.title` / `meta.description`）
- `icon.svg`
- `README.md`（中英双语）

然后在上面的插件列表里加一行。

---

## English

This repository collects **DeepSeek Harness** (DSH) plugins. Each plugin lives in `plugins/<package-name>/` as a **complete, independent package** with its own `package.json`, `cordis.patch.yml`, locale files and icon.

### Plugins

| Plugin | What it does | Category |
|---|---|---|
| **[dsh-plugin-categorized](plugins/dsh-plugin-categorized/)** | **Plugin Categories** — a Categories tab that groups installed plugins by purpose, plus automatic Chinese titles and descriptions for newly installed plugins | UI enhancement · Categorization · Auto-translation |
| **[dsh-watchman](plugins/dsh-watchman/)** | **Watchman alerts** — push approvals, errors and task completions to your phone (Server酱 / Bark / WeCom bot), with a visual settings panel | Notifications · Mobile push |

### Installation

Each plugin installs independently. Point the installer at its own subdirectory:

**From the UI**

1. Open DeepSeek Harness → **Plugins → Add plugin → Add local directory**
2. Choose `plugins/dsh-plugin-categorized` or `plugins/dsh-watchman`
3. **Restart DSH** afterwards (the host half is assembled at startup)

**From the command line**

```bash
git clone https://github.com/Beeasy-L/DSH-plugin-market.git

dsh plugin --profile desktop add "file:C:\path\to\DSH-plugin-market\plugins\dsh-plugin-categorized"
dsh plugin --profile desktop add "file:C:\path\to\DSH-plugin-market\plugins\dsh-watchman"
```

### Repository layout

```
DSH-plugin-market/
├── README.md                  ← this file (repository index)
├── CHANGELOG.md
├── LICENSE
├── dsh-labels.json            ← repository label declarations
└── plugins/
    ├── dsh-plugin-categorized/   Plugin Categories
    │   ├── package.json
    │   ├── index.js              Host half
    │   ├── client.js             Browser half
    │   ├── cordis.patch.yml
    │   ├── locale/{zh,en}.json
    │   ├── docs/DETAIL.md
    │   └── icon.svg
    └── dsh-watchman/             Watchman alerts
        ├── package.json
        ├── lib/
        │   ├── index.js          Host half (4 routes)
        │   ├── client.js         Settings panel section
        │   ├── watchman.mjs      Standalone process: subscribe + classify + dedupe
        │   └── notifier.mjs      Channel layer: Server酱 / Bark / WeCom
        ├── test/notify.selftest.mjs
        ├── locale/{zh,en}.json
        └── icon.svg
```

### Contributing a plugin

Drop it into `plugins/<package-name>/` with:

- `package.json` (`name` / `version` / `exports` / `dsh.bundle.patch` / `dsh.client`)
- `cordis.patch.yml` (inserts the plugin row)
- `locale/zh.json` + `locale/en.json` (`meta.title` / `meta.description`)
- `icon.svg`
- `README.md` (bilingual Chinese + English)

Then add a row to the plugin table above.

---

## License

MIT © DSH Plugin Repository contributors
