# dsh-watchman · 守夜人告警

> 把 **DeepSeek Harness** 的「需要你拍板 / 任务报错 / 任务结束 / 订阅断线 / 登录态失效」
> 推到你**手机微信**（或 Bark、企业微信群机器人），并在**设置页**里可视化配置。

你在电脑上让 DSH 跑长任务，人离开了——任务跑完了、报错了、卡在「等你点同意」，
这些时刻你并不知道。这个插件负责在你不在场时替你盯着，出事喊你。

---

## 特性

- **三种推送通道**：Server酱（微信）、Bark（iPhone）、企业微信群机器人；填完整地址或只填 key 都认
- **设置页可视化配置**：设置 → 守夜人告警 —— 状态、通道、推哪些事件、发送测试、看日志，不用敲配置
- **事件分流 + 分级**：🔴 报错/登录态失效 · 🟡 待审批/断线 · 🟢 任务结束
- **去重防抖**：同一事件在窗口期（默认 30 分钟）只推一次，绝不连环轰炸；去重表落盘，进程重启也不会重复推
- **独立进程**：订阅与推送跑在独立进程里，告警链路不依赖 DSH 重启；宿主崩了，已连上的链路照跑
- **单实例保护**：pid 锁，重复启动会被拒绝（去重表是进程内的，双实例会推两遍）
- **凭据不出本机**：地址只以打码形式（如 `SCT123…aBcD`）返回给界面与日志；所有路由做同源校验

## 前置

| 要求 | 说明 |
|---|---|
| DSH | 桌面端或 Web 端，含 `settings.section` 槽位 |
| 事件源（可选） | 事件订阅复用 [`dsh-remote`](https://github.com/mrRisega/dsh-remote) 运行时里的 `dsh-events.mjs`。**没有它插件仍能安装、能发测试推送**，只是收不到 DSH 事件 |

> 为什么不自己实现事件订阅：`dsh-remote` 已经把宿主的事件流（`/api/remote.mux` 的 `$events`、
> `session/follow`）与审批回执在真机上跑通了，复用它比重新逆向协议可靠得多。

## 安装

```bash
# 从 GitHub 装（推荐，无需等 npm 发布）
dsh plugin --profile desktop add "github:Beeasy-L/dsh-watchman"

# 或从本地源码装（开发时）
dsh plugin --profile desktop add "file:C:\path\to\dsh-watchman"

# 若已发布到 npm
dsh plugin --profile desktop add dsh-watchman
```

装完**重启 DSH**：宿主半边（4 条路由）与界面半边（设置页一节）都在启动时装配。

## 配置通道

打开 **设置 → 守夜人告警**，选通道并填地址：

| 通道 | 填什么 | 怎么拿 |
|---|---|---|
| `serverchan` | SENDKEY（`SCT` 开头） | [sct.ftqq.com](https://sct.ftqq.com) 微信扫码即得；免费额度有限 |
| `bark` | `https://api.day.app/<key>` 或只填 key | iPhone 装 Bark App，打开就有 key；免费、不限量 |
| `wecom` | 群机器人完整 webhook 或只填 key | 企业微信群 → 右上角 ⋯ → 群机器人 → 添加（需企业管理员开启该权限，且群必须是**企业内部群**） |

配置也可以直接写文件（数据目录见下），或命令行调路由：

```bash
curl -X POST http://127.0.0.1:<DSH端口>/plugins/watchman/config \
  -H 'content-type: application/json' \
  -d '{"channel":"serverchan","target":"SCT....","enabled":true}'
```

## 推哪些事件

| 事件 | 级别 | 去重键 | 默认 |
|---|---|---|---|
| `approval-request` 工具放行待批 | 🟡 | `approval:<eventId>` | 开 |
| `user-question` / `plan-review` 等你回答 | 🟡 | `question:<eventId>` | 开 |
| `session-error` 任务报错 | 🔴 | `error:<sessionId>:<eventId>` | 开 |
| `turn-end` 任务结束 | 🟢（异常结束转 🟡） | `turnend:<sessionId>:<eventId>` | 开 |
| `gap` 订阅断线（期间通知可能漏） | 🟡 | `gap` | 开 |
| `auth-error` harness cookie 失效 | 🔴 | `auth-error` | 开 |

「任务结束」想要**安静模式**：关掉 `turnEnd`，则只有异常结束
（`error` / `aborted` / `blocked` / `interrupted` / `max-tokens`）才推。

## 命令行（不经 DSH 也能独立跑）

```bash
node lib/watchman.mjs              # 前台运行，Ctrl+C 退出
node lib/watchman.mjs --dry-run    # 只打印不真发（排查用）
node lib/watchman.mjs --verbose    # 连事件分类明细都打
node lib/watchman.mjs --test       # 发一条测试到手机后退出

node test/notify.selftest.mjs      # 通道层离线自测（打桩 fetch，不联网）
```

## 架构

```
DSH 宿主进程
 ├─ 插件 host 半边 lib/index.js   4 条路由：state / config / test / control
 └─ 插件 client 半边 lib/client.js 设置页「守夜人告警」一节
        │ 读写同一份配置、可启停
        ▼
独立进程 lib/watchman.mjs
 ├─ createEventSubscriber  ← 复用 dsh-remote 的 dsh-events.mjs 连宿主事件流
 ├─ 事件分类 → 分级 + 去重（落盘）
 └─ lib/notifier.mjs → Server酱 / Bark / 企业微信
```

宿主半边的路由：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/plugins/watchman/state` | 配置（地址打码）+ 进程状态 + 日志尾部 |
| POST | `/plugins/watchman/config` | 保存 `{channel,target,enabled,dedup_minutes,pushOn}`；`target` 留空=不改 |
| POST | `/plugins/watchman/test` | 立刻发一条测试到手机 |
| POST | `/plugins/watchman/control` | `{action:"start"\|"stop"\|"restart"}` |

## 数据文件

数据目录默认 `~/.dsh-watchman`（可用插件配置 `dataDir` 覆盖）：

| 文件 | 内容 |
|---|---|
| `config.json` | 通道、地址（凭据）、开关、去重分钟数 |
| `watchman.config.json` | `relayDir`、`eventsModule`、`pushOn` 事件开关 |
| `watchman.log` | 运行日志 |
| `watchman.pid` | 当前进程号（单实例锁） |
| `watchman.dedupe.json` | 去重表（跨重启） |

事件源默认读 `~/.dsh-remote`（可用 `relayDir` 覆盖）。

## 常见问题

**收不到推送？**
1. 设置页点「发送测试到手机」——失败会给出通道侧原话（如企业微信 `errcode`）
2. 看状态区的通道与地址打码是否符合预期
3. 看「最近日志」：`已连上宿主事件流` 才说明事件源正常
4. Server酱免费额度有限；企业微信要**内部群**且管理员已开启「群机器人」

**任务结束也推，太吵？** 关掉 `pushOn.turnEnd`。

**日志里出现 `已连上宿主事件流` 但事件不来？** DSH 换端口后事件订阅需要重连，
插件每 30 秒重新发现上游与 harness cookie；重启一次守夜人（设置页「重启」）即可立刻生效。

**同时装了 dsh-remote 的微信机器人？** 两者互不冲突：dsh-remote 走腾讯 ilink 机器人，
本插件走你自己的通道；但同一事件可能收到两条通知，按需关掉一边。

## 隐私与安全

- 推送地址（含 key）**只存在本机**数据目录里，插件从不把它发往任何第三方服务
- 界面与日志里只出现打码形式（如 `SCT123…aBcD`）
- 4 条路由全部做**同源校验**，跨域请求直接被拒
- 路由处理器各自 `try/catch`：路由出问题最多返回 500，不会把宿主带下去

## 致谢

- 通道层（企业微信 / Bark / Server酱 的请求形状、去重语义、分级）搬自 **「星火续火花」** 项目的
  「守夜人」告警模块（`core/notifier.py`），做了 ESM 化 + 去重表落盘
- 事件订阅复用 [dsh-remote](https://github.com/mrRisega/dsh-remote) 的 `dsh-events.mjs`
  （`createEventSubscriber` / `NODE_KINDS` / 未来的 `answerApproval`）

## License

MIT
