# 更新日志

## 0.1.0

首个版本。

**通道（三种）**
- Server酱（微信）/ Bark（iPhone）/ 企业微信群机器人
- 填完整地址或只填 key 都认；企业微信判 `errcode === 0`、Server酱判 `code === 0`、Bark 判 200 且 `code ∈ {200,0}` 或有 `data`
- 请求形状与判定条件 1:1 沿用「星火续火花 · 守夜人」告警模块
- 分级标识：🔴 critical / 🟡 warning / 🟢 info
- 去重防抖：同一 `dedupKey` 在窗口期（默认 30 分钟）只推一次，`force` 可绕过
- **相对原模块的增强**：去重表落盘（`watchman.dedupe.json`），进程重启后不会重复轰炸
- 网络异常一律兜底为 `{ok:false,msg}`，不抛出、不影响主流程；未启用/未填地址静默返回

**事件源**
- 复用 `dsh-remote` 的 `dsh-events.mjs`（`createEventSubscriber` / `NODE_KINDS`），
  连宿主 `/api/remote.mux` 的 `$events` 与 `session/follow`
- 推送事件：`approval-request`、`user-question`、`plan-review`、`session-error`、
  `turn-end`、`gap`、`auth-error`
- 上游与 harness cookie 用**取值器函数**、每 30 秒重新发现：DSH 换端口 / cookie 重签都能跟上

**插件半边**
- 宿主半边 4 条路由：`state` / `config` / `test` / `control`（启动、停止、重启订阅进程）
- 界面半边：设置页「守夜人告警」一节（`settings.section` 槽位），可配通道、事件开关、发测试、看日志
- 凭据只以打码形式（如 `SCT123…aBcD`）出网；所有路由同源校验
- 单实例保护：pid 锁，重复启动被拒（去重表是进程内的，双实例会推两遍）

**可移植性**
- 不含任何个人路径：数据目录 `dataDir` 默认 `~/.dsh-watchman`，事件源 `relayDir` 默认 `~/.dsh-remote`
- 拉起订阅进程使用宿主自身的 `process.execPath`（Electron 下自动加 `ELECTRON_RUN_AS_NODE=1`），
  不要求用户另外安装 Node，也不写死安装路径
- 订阅与推送脚本随包发布（`lib/watchman.mjs`、`lib/notifier.mjs`）
