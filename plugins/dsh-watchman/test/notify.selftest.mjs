/**
 * 守夜人告警 · 通道层测试
 *
 * 用法（在插件包根目录执行）：
 *   node test/notify.selftest.mjs                     # 离线自测（打桩 fetch，验证通道形状/去重/开关）
 *   node test/notify.selftest.mjs wecom       <webhook 或 key>  # 真发一条到企业微信群
 *   node test/notify.selftest.mjs bark        <地址 或 key>     # 真发一条到 iPhone Bark
 *   node test/notify.selftest.mjs serverchan  <SENDKEY>         # 真发一条到 Server酱
 */
import { push, sendTest, resetDedupe, CHANNEL_LABEL, LEVEL_CRITICAL } from "../lib/notifier.mjs";

const [, , mode, target] = process.argv;

if (!mode || mode === "-h" || mode === "--help") {
  console.log(`守夜人告警 · 测试工具

  node test-notify.mjs selftest                     离线自测（不联网）
  node test-notify.mjs wecom       <webhook 或 key> 发测试到企业微信群机器人
  node test-notify.mjs bark        <地址 或 key>    发测试到 iPhone Bark
  node test-notify.mjs serverchan  <SENDKEY>        发测试到 Server酱
`);
  process.exit(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// 离线自测：用打桩的 fetch 验证「请求形状 / 判定条件 / 去重 / 开关」与原项目一致
// ─────────────────────────────────────────────────────────────────────────────
if (mode === "selftest") {
  const captured = [];
  let nextResponse = { status: 200, body: '{"errcode":0,"errmsg":"ok"}' };
  globalThis.fetch = async (url, init) => {
    captured.push({ url: String(url), method: init?.method, headers: init?.headers, body: init?.body });
    return {
      status: nextResponse.status,
      text: async () => nextResponse.body,
    };
  };

  let pass = 0;
  let fail = 0;
  const check = (name, cond, extra = "") => {
    if (cond) {
      pass++;
      console.log("  [PASS] " + name);
    } else {
      fail++;
      console.log("  [FAIL] " + name + (extra ? "  -> " + extra : ""));
    }
  };

  console.log("=== 1. 企业微信：完整 webhook ===");
  captured.length = 0;
  let r = await sendTest({ channel: "wecom", target: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=abc" });
  check("返回 ok", r.ok === true, JSON.stringify(r));
  check("URL 原样使用", captured[0].url.endsWith("key=abc"));
  const wb = JSON.parse(captured[0].body);
  check("msgtype=markdown", wb.msgtype === "markdown");
  check("标题带 ### 前缀", wb.markdown.content.startsWith("### "));
  check("含测试字样", wb.markdown.content.includes("测试通知"));

  console.log("=== 2. 企业微信：只给 key ===");
  captured.length = 0;
  await sendTest({ channel: "wecom", target: "KEY_ONLY_123" });
  check("自动拼 qyapi webhook", captured[0].url === "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=KEY_ONLY_123");

  console.log("=== 3. 企业微信：errcode 非 0 ===");
  nextResponse = { status: 200, body: '{"errcode":93000,"errmsg":"invalid webhook url"}' };
  r = await sendTest({ channel: "wecom", target: "x" });
  check("判定为失败", r.ok === false, JSON.stringify(r));
  check("错误信息透出", String(r.msg).includes("invalid webhook url"));
  nextResponse = { status: 200, body: '{"errcode":0,"errmsg":"ok"}' };

  console.log("=== 4. Bark ===");
  captured.length = 0;
  await sendTest({ channel: "bark", target: "https://api.day.app/MYKEY" });
  check("URL 去尾斜杠", captured[0].url === "https://api.day.app/MYKEY");
  const bb = JSON.parse(captured[0].body);
  check("body 含 title/body", "title" in bb && "body" in bb);

  console.log("=== 5. Server酱 ===");
  captured.length = 0;
  nextResponse = { status: 200, body: '{"code":0,"message":"ok"}' };
  await sendTest({ channel: "serverchan", target: "SCT123KEY" });
  check("URL 为 sctapi/<key>.send", captured[0].url === "https://sctapi.ftqq.com/SCT123KEY.send");
  check("表单编码", String(captured[0].body).startsWith("title=") && String(captured[0].body).includes("desp="));
  check("Content-Type 为表单", String(captured[0].headers["Content-Type"]).includes("x-www-form-urlencoded"));

  console.log("=== 6. 开关与空地址（原项目语义：静默返回 false）===");
  captured.length = 0;
  r = await push({ enabled: false, channel: "wecom", target: "x" }, "t", "c");
  check("未启用 → 不发送", r.ok === false && r.msg === "告警未启用" && captured.length === 0);
  r = await push({ enabled: true, channel: "wecom", target: "" }, "t", "c");
  check("空地址 → 不发送", r.ok === false && r.msg === "未配置推送地址" && captured.length === 0);
  r = await push({ enabled: false, channel: "wecom", target: "x" }, "t", "c", { ignoreEnabled: true });
  check("ignoreEnabled 可越过开关（用于测试）", captured.length === 1);

  console.log("=== 7. 去重窗口（默认 30 分钟）===");
  resetDedupe();
  captured.length = 0;
  nextResponse = { status: 200, body: '{"errcode":0,"errmsg":"ok"}' }; // 用企业微信的返回体
  const cfg = { enabled: true, channel: "wecom", target: "x", dedup_minutes: 30 };
  const r1 = await push(cfg, "t1", "c1", { dedupKey: "k1", level: LEVEL_CRITICAL });
  const r2 = await push(cfg, "t2", "c2", { dedupKey: "k1" });
  check("第一条发出", r1.ok === true);
  check("窗口内第二条被去重", r2.ok === false && r2.msg === "同类告警去重中，已跳过");
  check("实际只发了一次", captured.length === 1);
  const r3 = await push(cfg, "t3", "c3", { dedupKey: "k1", force: true });
  check("force 可绕过去重", r3.ok === true && captured.length === 2);
  const r4 = await push({ ...cfg, dedup_minutes: 0 }, "t4", "c4", { dedupKey: "k1" });
  check("不同 key 不受影响", (await push(cfg, "t5", "c5", { dedupKey: "k2" })).ok === true);

  console.log("=== 8. 网络异常兜底（不抛出）===");
  globalThis.fetch = async () => {
    throw new Error("connect ECONNREFUSED 127.0.0.1:1");
  };
  r = await sendTest({ channel: "wecom", target: "x" });
  check("异常被吞掉并返回 ok:false", r.ok === false && String(r.msg).includes("ECONNREFUSED"), JSON.stringify(r));

  console.log(`\n结果：PASS ${pass} / FAIL ${fail}`);
  process.exit(fail === 0 ? 0 : 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// 真发测试
// ─────────────────────────────────────────────────────────────────────────────
if (!CHANNEL_LABEL[mode]) {
  console.error(`未知通道：${mode}（可用：wecom / bark / serverchan / selftest）`);
  process.exit(2);
}
if (!target) {
  console.error("缺少推送地址。例：node test-notify.mjs wecom https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx");
  process.exit(2);
}

const result = await sendTest({ channel: mode, target });
console.log(`通道：${CHANNEL_LABEL[mode]}`);
console.log(`地址：${target.slice(0, 40)}${target.length > 40 ? "..." : ""}`);
console.log(`结果：${result.ok ? "✅ 已送达" : "❌ 失败"}`);
console.log(`说明：${result.msg}`);
process.exit(result.ok ? 0 : 1);
