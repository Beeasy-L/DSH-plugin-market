# 插件分类 · Plugin Categories

<div align="center">

**给 DeepSeek Harness 的插件页加一个「分类」标签：装了多少插件、按什么用、叫什么中文名，一屏看清。**
**外加「自动翻译」——以后新装的插件，插件页上自动显示中文标题与说明。**

**A Categories tab for the DeepSeek Harness Plugins page — plus automatic Chinese localization for newly installed plugins.**

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://gitee.com/beeeasy/dsh-plugin-repository)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-DeepSeek%20Harness-purple)](https://github.com/deepseek-ai/DeepSeek-Harness)
[![DSH](https://img.shields.io/badge/DSH-plugin-0052D9-blue)](https://gitee.com/beeeasy/dsh-plugin-repository)
[![i18n](https://img.shields.io/badge/i18n-中文%20%7C%20English-orange)](locale/zh.json)

</div>

---

## 中文

### 痛点：插件装多了，就找不到

DeepSeek Harness 的插件页只有「已安装」和「发现」两个视角。装了二三十个插件之后：

- **列表是一维的** —— 视觉、皮肤、聊天、量化、动画、笔记……全挤在一起，看不出这台机器上到底装了什么。
- **名字和说明多半是英文** —— 一个叫 `dsh-waste-market` 的包，你需要点进去才知道它是 A 股看盘；一个叫 `dsh-motion` 的包，得读完描述才知道它画数学动画。
- **每次装新插件都要重读一遍** —— 新装的东西不知道归到哪一摞，页面也不会告诉你它是干什么的。

这个插件把这三件事一次解决。

### 卖点

#### 1. 分类标签页：插件从「一堆」变成「几摞」

插件页顶部多出**分类**标签，已装插件自动按用途分组：

| 分组 | 装的是什么 |
|---|---|
| 视觉与视频 | 模型视觉、视觉路由、视频理解、动画生成 |
| 界面与美化 | 主题皮肤、液态玻璃、壁纸引擎、GenUI |
| 用量与计费 | Token 看板、计费时段药丸 |
| 即时通讯 | QQ 通道、微信通道、群聊 |
| 远程控制 | 远程访问 |
| 金融行情 | A 股看盘 |
| 开发与效率 | 思维导图、PPT 创客、技能助手、会话迁移、架构图 |
| 系统与维护 | 插件管家、自动更新 |
| 官方核心 | 官方内置插件 |
| 其他 | 内置规则还没覆盖到的 |

每组带插件数量，一眼知道体积分布。

官方「已安装」标签**原样保留**，该启停、该卸载还在那里做 —— 这个插件只管**看**和**分**，不碰你的开关。

#### 2. 自动翻译：以后装的插件，直接就是中文

这是最省事的一条。

**装完新插件，插件页上立刻显示中文名和中文说明。** 不需要你手动补 locale 文件，不需要改 package.json，不需要重启。

- 走宿主**默认模型**翻译，不额外消耗 API 配额配置
- 只翻**公开元数据**（包名 + 描述）—— 不读你的会话内容，不读项目文件
- 单个翻译失败自动跳过，不影响其他插件，也不刷屏
- 已经自带中文描述的插件直接跳过，不做无谓翻译
- 首次安装时还会**补扫一轮**，把历史遗留的英文插件一次性补齐

支持 `LocalizedText` 的全部形态：纯字符串、`{en, zh}` 对象、以及多语言对象，都能正确取到当前语言的那一份。

#### 3. 手动改分类：内置规则覆盖不到时，你自己说了算

内置规则认不出的插件会落进**「其他」**。在那一行右侧的下拉框里：

- 选一个现成分类 → 立刻归位
- **新建分类…** → 输入名字，建一个只属于你的分组
- **自动归类** → 还原成内置规则的决定

改动存在浏览器本地（`localStorage`），**不动 profile 里的任何文件**，重开页面依然生效。

### 安装

**方式一：插件市场（推荐）**

在 DeepSeek Harness 里打开 **插件 → 添加插件**，搜索 `dsh-plugin-categorized`，点安装。

**方式二：本地目录**

**插件 → 添加插件 → 添加本地目录**，选本仓库的根目录。

**方式三：命令行**

```bash
# Gitee
git clone https://gitee.com/beeeasy/dsh-plugin-repository.git

# GitHub
git clone https://github.com/Beeasy-L/DSH-.git
```

然后在 DeepSeek Harness 里按「方式二」添加本地目录。

### 使用

1. 打开 **设置 → 插件**
2. 点顶部的 **分类** 标签
3. 某个插件不顺眼？在「其他」里找到它，右边下拉改分类
4. 以后装新插件 → 中文名自动出现

### 兼容性

- DeepSeek Harness **0.2.0+**
- 需要宿主启用插件管理（Profile 层面的插件管理开关）
- 自动翻译需要宿主已选好默认模型（**设置 → 模型**）；没选模型时自动翻译会跳过，不影响分类功能

### 隐私

这个插件**不做任何网络请求**，不上报任何数据。

- 自动翻译走的是宿主自己的模型通道，等同于你自己在对话里让模型翻译一句
- 送进模型的只有插件的**包名和公开描述**
- 手动分类的改动只存在你自己浏览器的 `localStorage` 里

### 常见问题

**Q：分类能自己改吗？**
能。每个插件右侧都有下拉框，随手改。

**Q：改了分类会不会影响插件本身？**
不会。分类纯粹是显示层的归类，不改插件行为、不改启用状态、不改版本。

**Q：为什么有的插件在「其他」里？**
内置规则覆盖的是常见插件。新的或小众的插件会先进「其他」，你可以顺手归类 —— 归完一次就记住了。

**Q：自动翻译会把我的插件改坏吗？**
它只写 `locale/zh.json`（插件的中文文案）和在 `package.json` 的 `exports` 里补一条 locale 映射，都是**新增**内容，不覆盖原有逻辑。翻译失败会安静跳过。

**Q：能关掉自动翻译吗？**
删掉 `locale/zh.json` 即可，宿主侧会跳过已存在中文文案的插件。

**Q：英文界面下会显示英文吗？**
会。插件自带 `en.json`，跟随宿主的语言设置切换。

### 开发

```
dsh-plugin-categorized/
├── index.js            宿主半身：监听插件变更 → 自动补中文 locale
├── client.js           浏览器半身：注册「分类」标签页 + 改分类交互
├── cordis.patch.yml    插入插件行
├── package.json        清单（含 dsh.client.inject 声明）
├── locale/             中英文文案（zh.json / en.json）
├── icon.svg            图标
└── docs/DETAIL.md      详情文档
```

架构很简单，一分为二：

- **`index.js`（宿主侧）** —— 订阅 `plugin-manager/changed`，扫描 profile 的 `node_modules`，找出「是 DSH 插件、非官方核心、缺 `locale/zh.json`、描述是英文」的包，调默认模型翻译并原子写盘。写盘串行化，避免并发安装时互相覆盖。
- **`client.js`（浏览器侧）** —— 注册 `plugins.tab` 槽位，读取宿主真实插件清单（`pluginInventory` → `pluginManager.listBundles`），按规则分组，渲染成自绘控件。样式只用 `--dsw-alias-*` 主题 token，跟随宿主明暗主题。

### 本地调试

```bash
node --check index.js
node --check client.js
```

---

## English

### The problem: too many plugins, no way to find them

The DeepSeek Harness Plugins page shows you *Installed* and *Discover*. After installing twenty or thirty plugins, that view stops working well:

- **The list is one-dimensional.** Vision, skins, chat, quant, animation, notes — all in a single column. You can't tell at a glance what's actually on this machine.
- **Names and descriptions are usually English.** You have to open `dsh-waste-market` to learn it's an A-share market dashboard. You have to read the description of `dsh-motion` to learn it renders math animations.
- **Every new install means re-reading everything.** You don't know where the new thing belongs, and the page won't tell you what it does.

This plugin fixes all three at once.

### Features

#### 1. A Categories tab: plugins become shelves, not a pile

A new **Categories** tab sits at the top of the Plugins page and sorts installed plugins by what they do:

| Category | What's in it |
|---|---|
| Vision & video | Model vision, vision routing, video understanding, animation |
| UI & theming | Theme skins, liquid glass, wallpaper engine, GenUI |
| Usage & billing | Token dashboard, billing-time badge |
| Messaging | QQ bridge, WeChat bridge, group chat |
| Remote control | Remote access |
| Markets | A-share market dashboard |
| Dev & productivity | Mind maps, PPT maker, skill palette, session mover, architecture diagrams |
| System & maintenance | Plugin manager, auto-update |
| Official core | Bundled official plugins |
| Other | Anything the built-in rules don't cover yet |

Each group shows its plugin count, so you can see at a glance where the bulk of your setup lives.

The official **Installed** tab is **completely unchanged** — enabling, disabling and uninstalling still happen there. This plugin only *views* and *groups*; it never touches your switches.

#### 2. Automatic translation: new plugins show up in Chinese

This is the part that saves you the most time.

**Install a plugin and its Chinese title and description appear on the Plugins page immediately.** No hand-writing locale files, no editing `package.json`, no restart.

- Translates through the **host's default model** — no extra API quota setup
- Only public metadata leaves the machine (package name + description) — never your conversations or project files
- A failed translation is skipped silently; it never blocks the others or spams the UI
- Plugins that already ship a Chinese description are skipped — no pointless work
- The first install also **sweeps existing plugins**, backfilling any English-only ones

Every `LocalizedText` shape is handled correctly: plain strings, `{en, zh}` objects, and multi-language objects all resolve to the current language.

#### 3. Change categories yourself: when the built-in rules fall short

Plugins the built-in rules don't recognize land in **Other**. On each of those rows there's a dropdown:

- Pick an existing category → it moves immediately
- **New category…** → type a name and create a group that's yours alone
- **Auto** → fall back to whatever the built-in rule decided

Your choices live in the browser (`localStorage`). **No file in your profile is modified**, and they survive a page reload.

### Installation

**Option 1: plugin market (recommended)**

Open **Plugins → Add plugin** in DeepSeek Harness, search for `dsh-plugin-categorized`, and install.

**Option 2: local directory**

**Plugins → Add plugin → Add local directory**, and pick this repository's root.

**Option 3: command line**

```bash
# Gitee
git clone https://gitee.com/beeeasy/dsh-plugin-repository.git

# GitHub
git clone https://github.com/Beeasy-L/DSH-.git
```

Then use "Option 2" in DeepSeek Harness to add the cloned directory.

### Usage

1. Open **Settings → Plugins**
2. Click the **Categories** tab
3. Found a plugin in the wrong place? Dropdown on the right, pick again
4. Install something new later → its Chinese name shows up on its own

### Compatibility

- DeepSeek Harness **0.2.0+**
- Requires plugin management to be enabled in the Host (the Profile-level plugin management switch)
- Automatic translation needs a default model selected (**Settings → Models**); without one, translation is skipped and categorization still works

### Privacy

This plugin makes **no network requests of its own** and reports nothing.

- Translation goes through the Host's own model channel — the same thing as asking the model to translate a sentence yourself
- Only the plugin's **package name and public description** are sent
- Your category changes stay in your own browser's `localStorage`

### FAQ

**Q: Can I change the categories?**
Yes. Every plugin has a dropdown on its row.

**Q: Does changing a category affect the plugin itself?**
No. Categorization is purely a display layer — it doesn't change behaviour, enablement or version.

**Q: Why is some plugin under "Other"?**
The built-in rules cover the common ones. Newer or niche plugins start in "Other" — file it once and it's remembered.

**Q: Can automatic translation break my plugins?**
It only writes `locale/zh.json` and adds a locale mapping to `package.json`'s `exports`. Both are purely additive; existing logic is never overwritten. Failures are skipped quietly.

**Q: Can I turn automatic translation off?**
Delete `locale/zh.json` — the Host side skips plugins that already have Chinese copy.

**Q: Does it show English in an English UI?**
Yes. The plugin ships `en.json` and follows the Host's language setting.

### Development

```
dsh-plugin-categorized/
├── index.js            Host half: watch plugin changes → backfill Chinese locale
├── client.js           Browser half: register the Categories tab + category editing
├── cordis.patch.yml    Inserts the plugin row
├── package.json        Manifest (incl. dsh.client.inject declaration)
├── locale/             Chinese and English copy (zh.json / en.json)
├── icon.svg            Icon
└── docs/DETAIL.md      Detail document
```

The architecture is deliberately split in two:

- **`index.js` (host side)** — subscribes to `plugin-manager/changed`, scans the profile's `node_modules`, finds packages that are DSH plugins, not official core, missing `locale/zh.json`, and described in English, then asks the default model to translate them and writes the files atomically. Writes are serialized so concurrent installs can't clobber each other.
- **`client.js` (browser side)** — registers the `plugins.tab` slot, reads the Host's real plugin list (`pluginInventory` → `pluginManager.listBundles`), groups by rule, and renders with hand-drawn controls. Styling uses only `--dsw-alias-*` theme tokens, so it follows the Host's light and dark themes.

### Local development

```bash
node --check index.js
node --check client.js
```

---

## 相关插件 · Related plugins

- [dsh-skill-palette](https://gitee.com/beeeasy/dsh-plugin-repository) —— 技能选择器，带中文翻译 · Skill picker with Chinese translation
- 欢迎在 Issues 里推荐更多值得分类的插件 · Feel free to suggest plugins worth categorizing in the Issues

---

## License

MIT © 插件分类 contributors
