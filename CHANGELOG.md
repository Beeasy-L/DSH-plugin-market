# Changelog

本项目遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

## [2.1.0] - 2026-11-20

新增 `dsh-qq-panel`（QQ 面板）。

### 新增

- `plugins/dsh-qq-panel/`：QQ 桥接（OneBot v11）的设置面板 —— 人格卡编辑与热切换、表情包与备注管理、主动发言等行为参数、运行状态与日志
- `screenshots.json`：声明三张面板截图（人格卡 / 表情包 / 行为参数），供插件市场展示
- `dsh-labels.json` 增加 `messaging`、`settings-panel` 两个标签，并登记本插件的标签映射

### 说明

- 代码原样迁入，未改动实现；仓库元数据改指本仓库子目录
- 宿主与客户端测试 2/2 通过

## [2.0.0] - 2026-11-20

仓库改为**多插件合集**结构：每个插件一个子目录，各自独立安装。

### 变更

- 仓库根目录改为索引 README（中英双语），列出全部插件与安装方式
- `dsh-plugin-categorized` 移入 `plugins/dsh-plugin-categorized/`，内容不变
- 新增 `plugins/dsh-watchman/`：守夜人告警插件（原 `Beeasy-L/dsh-watchman`）
- `dsh-watchman` 去掉 `private` 标记，补 `locale/zh.json` + `locale/en.json` 与 `icon.svg`，仓库元数据改指本仓库子目录
- 两个插件的 `repository` / `homepage` / `bugs` 均指向本仓库

### 插件

| 插件 | 版本 | 说明 |
|---|---|---|
| dsh-plugin-categorized | 1.0.0 | 插件分类标签页 + 新装插件自动中文翻译 |
| dsh-watchman | 0.1.0 | 待审批 / 报错 / 任务结束推送到手机 |

## [1.0.0] - 2026-11-20

首个发布版本（单插件 `dsh-plugin-categorized`）。

- 插件页新增「分类」标签，已装插件按用途自动分组
- 每个插件行提供分类选择器，支持改分类 / 新建分类 / 自动归类
- 监听插件安装事件，自动为新装插件生成中文 locale
- 首次安装补扫历史插件
- 手动分类存 `localStorage`，不改 profile 文件
