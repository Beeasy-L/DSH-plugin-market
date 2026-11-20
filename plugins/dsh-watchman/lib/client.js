/**
 * dsh-watchman —— 浏览器半边（设置页「守夜人告警」一节）
 *
 * 形态照抄宿主自己的设置页扩展方式（与 dsh-connect-doubao 同款）：
 *   ctx.slots.inject("settings.section", () => ctx.slots.register({
 *     name:"settings.section", id:"dsh-watchman", order:45, label:()=>"守夜人告警"
 *   }, Component))
 * descriptor 只认 id / order / label（宿主 0.1.x 的限制），没有 icon 字段。
 *
 * 数据全部来自宿主半边那四条路由；凭据只以打码形式展示，留空即不修改。
 */
window.__ModuleLoader__.load({
  id: "dsh-watchman",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    const react = require("react");
    const h = react.createElement;

    const name = "dsh-watchman";
    const inject = ["slots"];

    const EVENTS = [
      ["approval", "需要我拍板（工具放行）"],
      ["question", "在等我回答（提问 / 计划待批）"],
      ["sessionError", "任务报错"],
      ["turnEnd", "任务结束（每条都推）"],
      ["gap", "订阅断线（可能漏通知）"],
      ["authError", "登录态失效（harness cookie 过期）"],
    ];

    const CHANNELS = [
      ["serverchan", "Server酱（推送到微信）"],
      ["wecom", "企业微信群机器人"],
      ["bark", "Bark（iPhone）"],
    ];

    const TARGET_HINT = {
      serverchan: "填 SENDKEY（SCT 开头）",
      wecom: "填群机器人完整 webhook 或只填 key",
      bark: "填 https://api.day.app/<key> 或只填 key",
    };

    const S = {
      wrap: { padding: "4px 2px", display: "flex", flexDirection: "column", gap: "14px" },
      card: {
        border: "1px solid var(--dsh-border, rgba(127,127,127,.28))",
        borderRadius: "10px",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      },
      row: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" },
      label: { minWidth: "102px", opacity: 0.85, fontSize: "13px" },
      input: {
        flex: "1 1 260px",
        minWidth: "200px",
        padding: "6px 9px",
        borderRadius: "7px",
        border: "1px solid var(--dsh-border, rgba(127,127,127,.35))",
        background: "transparent",
        color: "inherit",
        font: "inherit",
      },
      btn: {
        padding: "6px 13px",
        borderRadius: "7px",
        border: "1px solid var(--dsh-border, rgba(127,127,127,.35))",
        background: "transparent",
        color: "inherit",
        cursor: "pointer",
        font: "inherit",
      },
      title: { fontSize: "14px", fontWeight: 600, margin: 0 },
      mono: {
        fontFamily: "ui-monospace, Consolas, monospace",
        fontSize: "12px",
        whiteSpace: "pre-wrap",
        background: "rgba(127,127,127,.09)",
        borderRadius: "7px",
        padding: "9px 11px",
        maxHeight: "190px",
        overflow: "auto",
        margin: 0,
      },
      dim: { opacity: 0.62, fontSize: "12px" },
      ok: { color: "#2e9e5b" },
      bad: { color: "#d9534f" },
    };

    function api(path, body) {
      return fetch(path, {
        method: body === undefined ? "GET" : "POST",
        headers: body === undefined ? undefined : { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      }).then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.ok === false) throw new Error(j.error || j.message || `HTTP ${r.status}`);
        return j;
      });
    }

    function WatchmanSection() {
      const [st, setSt] = react.useState(null);
      const [err, setErr] = react.useState("");
      const [msg, setMsg] = react.useState("");
      const [busy, setBusy] = react.useState("");
      const [form, setForm] = react.useState(null);

      const load = react.useCallback(() => {
        api("/plugins/watchman/state")
          .then((j) => {
            setSt(j);
            setErr("");
            setForm((f) => f || {
              channel: j.channel,
              target: "",
              enabled: j.enabled,
              dedup_minutes: j.dedupMinutes,
              pushOn: { ...j.pushOn },
            });
          })
          .catch((e) => setErr(String(e.message || e)));
      }, []);

      react.useEffect(() => {
        load();
        const t = setInterval(load, 5000);
        return () => clearInterval(t);
      }, [load]);

      const run = (tag, fn) => {
        setBusy(tag);
        setMsg("");
        setErr("");
        fn()
          .then(() => setMsg("完成"))
          .catch((e) => setErr(String(e.message || e)))
          .finally(() => setBusy(""));
      };

      if (!st && !err) return h("div", { style: S.dim }, "正在读取守夜人状态…");

      const f = form || {};
      const set = (k, v) => setForm({ ...f, [k]: v });
      const setEv = (k, v) => setForm({ ...f, pushOn: { ...(f.pushOn || {}), [k]: v } });

      return h(
        "div",
        { style: S.wrap },
        err ? h("div", { style: S.bad }, "⚠ " + err) : null,

        // ── 状态 ──
        h(
          "div",
          { style: S.card },
          h("h3", { style: S.title }, "运行状态"),
          h(
            "div",
            { style: S.row },
            h("span", { style: st.running ? S.ok : S.bad }, st.running ? "● 守夜人正在运行" : "○ 未运行"),
            st.running && st.pid ? h("span", { style: S.dim }, "pid " + st.pid) : null,
            h("span", { style: S.dim }, "通道：" + st.channel),
            h("span", { style: S.dim }, "地址：" + (st.target.masked || "（未配置）")),
            h("span", { style: S.dim }, "去重：" + st.dedupMinutes + " 分钟"),
          ),
          h(
            "div",
            { style: S.row },
            h("button", { style: S.btn, disabled: busy === "start", onClick: () => run("start", () => api("/plugins/watchman/control", { action: "start" }).then(load)) }, "启动"),
            h("button", { style: S.btn, disabled: busy === "stop", onClick: () => run("stop", () => api("/plugins/watchman/control", { action: "stop" }).then(load)) }, "停止"),
            h("button", { style: S.btn, disabled: busy === "restart", onClick: () => run("restart", () => api("/plugins/watchman/control", { action: "restart" }).then(load)) }, "重启"),
            h("button", { style: S.btn, disabled: busy === "refresh", onClick: () => run("refresh", () => Promise.resolve(load())) }, "刷新"),
            h("span", { style: S.dim }, "数据目录：" + st.dataDir),
          ),
        ),

        // ── 配置 ──
        h(
          "div",
          { style: S.card },
          h("h3", { style: S.title }, "推送通道"),
          h(
            "div",
            { style: S.row },
            h("span", { style: S.label }, "通道"),
            h(
              "select",
              { style: S.input, value: f.channel || "serverchan", onChange: (e) => set("channel", e.target.value) },
              CHANNELS.map(([v, label]) => h("option", { key: v, value: v }, label)),
            ),
          ),
          h(
            "div",
            { style: S.row },
            h("span", { style: S.label }, "推送地址"),
            h("input", {
              style: S.input,
              type: "text",
              placeholder: "留空 = 不改动（当前 " + (st.target.masked || "未配置") + "）；" + (TARGET_HINT[f.channel] || ""),
              value: f.target || "",
              onChange: (e) => set("target", e.target.value),
            }),
          ),
          h(
            "div",
            { style: S.row },
            h("span", { style: S.label }, "启用告警"),
            h("input", { type: "checkbox", checked: f.enabled !== false, onChange: (e) => set("enabled", e.target.checked) }),
            h("span", { style: S.label }, "去重窗口(分)"),
            h("input", {
              style: { ...S.input, flex: "0 0 90px", minWidth: "90px" },
              type: "number",
              min: 1,
              max: 1440,
              value: f.dedup_minutes ?? 30,
              onChange: (e) => set("dedup_minutes", Number(e.target.value)),
            }),
          ),
        ),

        // ── 推什么 ──
        h(
          "div",
          { style: S.card },
          h("h3", { style: S.title }, "推哪些事件"),
          ...EVENTS.map(([k, label]) =>
            h(
              "div",
              { key: k, style: S.row },
              h("input", {
                type: "checkbox",
                checked: (f.pushOn || {})[k] !== false,
                onChange: (e) => setEv(k, e.target.checked),
              }),
              h("span", null, label),
            ),
          ),
          h("div", { style: S.dim }, "「任务结束」勾上 = 每条任务跑完都推；取消勾选则只有异常结束（报错/中断/超长）才推。"),
        ),

        // ── 操作 ──
        h(
          "div",
          { style: S.row },
          h(
            "button",
            {
              style: S.btn,
              disabled: busy === "save",
              onClick: () =>
                run("save", () =>
                  api("/plugins/watchman/config", {
                    channel: f.channel,
                    target: f.target,
                    enabled: f.enabled,
                    dedup_minutes: f.dedup_minutes,
                    pushOn: f.pushOn,
                  }).then((j) => {
                    setSt(j.state);
                    setForm({ ...f, target: "" });
                  }),
                ),
            },
            "保存配置",
          ),
          h(
            "button",
            { style: S.btn, disabled: busy === "test", onClick: () => run("test", () => api("/plugins/watchman/test", {}).then((j) => setMsg(j.message || "已发送"))) },
            "发送测试到手机",
          ),
          msg ? h("span", { style: S.ok }, "✅ " + msg) : null,
        ),

        // ── 日志 ──
        h(
          "div",
          { style: S.card },
          h("h3", { style: S.title }, "最近日志"),
          h("pre", { style: S.mono }, (st.log && st.log.length ? st.log.join("\n") : "（暂无日志）")),
        ),
      );
    }

    function apply(ctx) {
      try {
        ctx.slots.inject("settings.section", () =>
          ctx.slots.register(
            {
              name: "settings.section",
              id: "dsh-watchman",
              order: 45,
              label: () => "守夜人告警",
            },
            WatchmanSection,
          ),
        );
      } catch (e) {
        console.error("[dsh-watchman] settings.section 注册失败（不影响宿主）:", e);
      }
    }

    exports.WatchmanSection = WatchmanSection;
    exports.apply = apply;
    exports.inject = inject;
    exports.name = name;
    return module.exports;
  },
});
