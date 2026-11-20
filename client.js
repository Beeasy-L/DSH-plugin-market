/**
 * dsh-plugin-categorized — browser half.
 *
 * 插件页多一个「分类」标签：把已安装的插件按用途分组，一眼看清装了什么。
 * 「其他」组里的每一项都能就地改分类，改动记在浏览器 localStorage；
 * 以后再装新插件，宿主的另一半会自动补中文标题与说明。
 *
 * 自带控件与样式（只用 --dsw-alias-* 主题 token），唯一外部依赖是 react。
 */
window.__ModuleLoader__.load({
  id: 'dsh-plugin-categorized',
  factory(require) {
    const React = require('react')
    const { useCallback, useEffect, useMemo, useState } = React
    const h = React.createElement

    /** 本插件拥有的文案命名空间。 */
    const NS = 'pluginCategories'
    /** 分类覆盖表（包名 → 分类 id）存在浏览器侧，不动 profile 文件。 */
    const STORAGE_KEY = 'dsh-plugin-categorized:overrides'
    const CSS_ID = 'dsh-plugin-categorized-css'

    const CSS = [
      '.dpc-root{display:flex;flex-direction:column;gap:20px;padding:6px 0 28px;color:var(--dsw-alias-label-primary)}',
      '.dpc-group{display:flex;flex-direction:column;gap:8px}',
      '.dpc-head{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--dsw-alias-label-secondary)}',
      '.dpc-count{font-size:12px;font-weight:400;color:var(--dsw-alias-label-tertiary)}',
      '.dpc-row{display:flex;align-items:flex-start;gap:12px;padding:10px 12px;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));border-radius:10px}',
      '.dpc-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}',
      '.dpc-name{font-size:13px;font-weight:600;line-height:1.4;overflow-wrap:anywhere}',
      '.dpc-pkg{font-size:11px;line-height:1.4;color:var(--dsw-alias-label-tertiary);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;overflow-wrap:anywhere}',
      '.dpc-desc{font-size:12px;line-height:1.55;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}',
      '.dpc-side{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex:none}',
      '.dpc-select{font:inherit;font-size:12px;max-width:150px;padding:3px 6px;border-radius:6px;color:var(--dsw-alias-label-secondary);background:transparent;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));cursor:pointer}',
      '.dpc-select:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
      '.dpc-new{display:flex;gap:6px}',
      '.dpc-input{font:inherit;font-size:12px;width:120px;padding:3px 6px;border-radius:6px;color:var(--dsw-alias-label-primary);background:transparent;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14))}',
      '.dpc-btn{font:inherit;font-size:12px;padding:3px 8px;border-radius:6px;color:var(--dsw-alias-label-secondary);background:transparent;border:1px solid var(--dsw-alias-border-l2,rgba(255,255,255,.14));cursor:pointer}',
      '.dpc-btn:hover{background:color-mix(in oklab,currentColor 8%,transparent)}',
      '.dpc-status{display:flex;align-items:center;gap:8px;margin:0;padding:14px 2px;font-size:13px;color:var(--dsw-alias-label-secondary)}',
      '.dpc-dot{width:7px;height:7px;border-radius:50%;flex:none;background:var(--dsw-alias-label-tertiary)}',
    ].join('')

    function ensureCss() {
      try {
        const node = document.getElementById(CSS_ID)
        if (node !== null) {
          if (node.textContent !== CSS) node.textContent = CSS
          return
        }
        const style = document.createElement('style')
        style.id = CSS_ID
        style.textContent = CSS
        document.head.appendChild(style)
      } catch {
        /* 锁死的文档就退回浏览器默认样式 */
      }
    }

    const DICT = {
      zh: {
        title: '分类',
        loading: '加载中…',
        unavailable: '当前 Profile 未启用插件管理',
        error: '读取插件列表失败，稍后重试',
        empty: '还没有装第三方插件',
        other: '其他',
        changeCategory: '修改分类',
        auto: '自动归类',
        newCategory: '新建分类…',
        newPlaceholder: '新分类名',
        ok: '确定',
        cancel: '取消',
        unit: '个',
      },
      en: {
        title: 'Categories',
        loading: 'Loading…',
        unavailable: 'Plugin management is not available in this profile',
        error: 'Failed to read plugins, try again later',
        empty: 'No third-party plugins installed yet',
        other: 'Other',
        changeCategory: 'Change category',
        auto: 'Auto',
        newCategory: 'New category…',
        newPlaceholder: 'Category name',
        ok: 'OK',
        cancel: 'Cancel',
        unit: '',
      },
    }

    /** 分类定义；顺序就是页面上的分组顺序。 */
    const CATEGORIES = [
      { id: 'vision', zh: '视觉与视频', en: 'Vision & video' },
      { id: 'ui', zh: '界面与美化', en: 'UI & theming' },
      { id: 'usage', zh: '用量与计费', en: 'Usage & billing' },
      { id: 'im', zh: '即时通讯', en: 'Messaging' },
      { id: 'remote', zh: '远程控制', en: 'Remote control' },
      { id: 'finance', zh: '金融行情', en: 'Markets' },
      { id: 'dev', zh: '开发与效率', en: 'Dev & productivity' },
      { id: 'system', zh: '系统与维护', en: 'System & maintenance' },
      { id: 'official', zh: '官方核心', en: 'Official core' },
      { id: 'other', zh: '其他', en: 'Other' },
    ]

    /** 精确包名 → 分类；这里是内置规则，覆盖表优先于它。 */
    const RULES = {
      '@liustack/modlens': 'vision',
      'dsh-vision-router': 'vision',
      'dsh-vision-proxy-route': 'vision',
      'dsh-video-kit': 'vision',
      'dsh-motion': 'vision',
      'dsh-animation-router': 'vision',
      '@changfenhuang/dsh-genui': 'ui',
      'dsh-skin-market': 'ui',
      'dsh-video-skin': 'ui',
      'dsh-dream-skin': 'ui',
      '@istarry/dsh-ui-liquid-glass': 'ui',
      'dsh-tide-badge': 'usage',
      '@shallbay/dsh-token-stats': 'usage',
      'dsh-qq-panel': 'im',
      'qq-mode-console': 'im',
      'qq-agent-presets': 'im',
      'dsh-channel-wechat': 'im',
      'dsh-groupchat': 'im',
      'dsh-remote-web': 'remote',
      '@czf1995/dsh-waste-market': 'finance',
      '@tt-a1i/archify-dsh': 'dev',
      'dsh-skill-palette': 'dev',
      'dsh-workspace-mover': 'dev',
      '@xiao-53/dsh-mindmap': 'dev',
      'dsh-ppt-maker': 'dev',
      '@sueleven/dsh-auto-update': 'system',
      'dsh-ding': 'system',
      '@txc2768651338/dsh-plugin-manager': 'system',
      'dsh-plugin-categorized': 'system',
    }

    /** 前缀 → 分类：同一家族的插件（壁纸引擎等）不必逐个列。 */
    const PREFIX_RULES = [
      { prefix: 'dsh-plugin-wallpaper-engine', category: 'ui' },
      { prefix: 'dsh-wallpaper-engine', category: 'ui' },
      { prefix: 'dsh-qq', category: 'im' },
      { prefix: 'dsh-vision', category: 'vision' },
    ]

    const ORDER = ['vision', 'ui', 'usage', 'im', 'remote', 'finance', 'dev', 'system']
    const CUSTOM_PREFIX = 'custom:'
    const AUTO = '__auto__'
    const NEW = '__new__'

    function asRecord(value) {
      return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : null
    }

    function readOverrides() {
      try {
        const parsed = asRecord(JSON.parse(window.localStorage.getItem(STORAGE_KEY)))
        return parsed ?? {}
      } catch {
        return {}
      }
    }

    function writeOverrides(map) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
      } catch {
        /* 存不下只是本次会话内的改动会丢，不影响当前渲染 */
      }
    }

    /** 只认字符串文本，对象取 zh → en → 第一个可用值。 */
    function localized(text, fallback) {
      if (typeof text === 'string' && text !== '') return text
      const record = asRecord(text)
      if (record === null) return fallback
      for (const key of ['zh', 'zh-CN', 'en']) {
        if (typeof record[key] === 'string' && record[key] !== '') return record[key]
      }
      for (const key of Object.keys(record)) {
        if (typeof record[key] === 'string' && record[key] !== '') return record[key]
      }
      return fallback
    }

    function categoryOf(name, overrides) {
      const override = overrides[name]
      if (typeof override === 'string' && override !== '') return override
      if (typeof name !== 'string') return 'other'
      if (name.startsWith('@deepseek-ai/')) return 'official'
      if (typeof RULES[name] === 'string') return RULES[name]
      for (const rule of PREFIX_RULES) if (name.startsWith(rule.prefix)) return rule.category
      return 'other'
    }

    function builtinOf(id) {
      return CATEGORIES.find((item) => item.id === id) ?? null
    }

    /** 分类 id → 当前语言下的显示名。 */
    function labelOf(id, t, resolveText) {
      const builtin = builtinOf(id)
      if (builtin !== null) {
        const resolved = resolveText({ zh: builtin.zh, en: builtin.en })
        return typeof resolved === 'string' && resolved !== '' ? resolved : builtin.zh
      }
      if (id.startsWith(CUSTOM_PREFIX)) return id.slice(CUSTOM_PREFIX.length)
      return t('other')
    }

    /**
     * 读已安装的插件。宿主没开插件管理就报 unavailable，
     * 只有 inventory 说 managementAvailable 才去列 bundle。
     */
    async function readPackages(ctx) {
      const remote = ctx.remote
      if (remote === undefined || remote === null) return { status: 'unavailable' }
      const inventory = await remote.pluginInventory.list()
      if (!inventory.ok) return { status: 'error' }
      if (inventory.value.managementAvailable !== true) return { status: 'unavailable' }
      const bundles = await remote.pluginManager.listBundles()
      if (!bundles.ok) return { status: 'error' }
      const list = Array.isArray(bundles.value) ? bundles.value : []
      return { status: 'ready', packages: list.filter((item) => item.installed === true) }
    }

    /** 一行插件：标题、包名、说明，右侧是分类选择器。 */
    function Row(props) {
      const { pkg, t, resolveText, overrides, editing, onPick, onNew, onCancelNew, options } = props
      const [draft, setDraft] = useState('')
      const name = typeof pkg.name === 'string' ? pkg.name : ''
      const title = localized(pkg.meta?.title, name) || name
      const description = localized(pkg.meta?.description, pkg.description ?? '')
      const current = categoryOf(name, overrides)
      const isNew = editing === name
      const submit = () => {
        const value = draft.trim()
        if (value !== '') onNew(name, value)
        setDraft('')
      }
      return h('div', { className: 'dpc-row' },
        h('div', { className: 'dpc-main' },
          h('div', { className: 'dpc-name' }, title),
          name !== title ? h('div', { className: 'dpc-pkg' }, name) : null,
          description !== '' ? h('div', { className: 'dpc-desc' }, description) : null,
        ),
        h('div', { className: 'dpc-side' },
          isNew
            ? h('div', { className: 'dpc-new' },
              h('input', {
                className: 'dpc-input',
                value: draft,
                autoFocus: true,
                placeholder: t('newPlaceholder'),
                onChange: (event) => setDraft(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter') submit()
                  else if (event.key === 'Escape') { setDraft(''); onCancelNew() }
                },
              }),
              h('button', { type: 'button', className: 'dpc-btn', onClick: submit }, t('ok')),
              h('button', { type: 'button', className: 'dpc-btn', onClick: () => { setDraft(''); onCancelNew() } }, t('cancel')),
            )
            : h('select', {
              className: 'dpc-select',
              value: current,
              title: t('changeCategory'),
              'aria-label': t('changeCategory'),
              onChange: (event) => onPick(name, event.target.value),
            },
            h('option', { value: AUTO }, t('auto')),
            options.map((option) => h('option', { key: option.id, value: option.id }, labelOf(option.id, t, resolveText))),
            h('option', { value: NEW }, t('newCategory')),
            ),
        ),
      )
    }

    function CategoriesSection(props) {
      const t = props.t
      const ctx = props.ctx
      const resolveText = typeof props.resolveText === 'function' ? props.resolveText : (text) => text
      const [state, setState] = useState({ status: 'loading' })
      const [overrides, setOverrides] = useState(() => readOverrides())
      const [editing, setEditing] = useState(null)

      const refresh = useCallback(() => {
        let live = true
        readPackages(ctx)
          .then((result) => { if (live) setState(result) })
          .catch(() => { if (live) setState({ status: 'error' }) })
        return () => { live = false }
      }, [ctx])

      useEffect(() => {
        ensureCss()
        const cancel = refresh()
        const off = ctx.remote?.$on?.('plugin-manager/changed', () => { refresh() })
        return () => {
          cancel()
          if (typeof off === 'function') off()
        }
      }, [ctx, refresh])

      const commit = useCallback((next) => {
        setOverrides(next)
        writeOverrides(next)
      }, [])

      const onPick = useCallback((name, value) => {
        if (value === NEW) { setEditing(name); return }
        const next = { ...overrides }
        if (value === AUTO) delete next[name]
        else next[name] = value
        commit(next)
      }, [commit, overrides])

      const onNew = useCallback((name, label) => {
        const next = { ...overrides, [name]: CUSTOM_PREFIX + label }
        setEditing(null)
        commit(next)
      }, [commit, overrides])

      const options = useMemo(() => {
        const custom = Object.keys(overrides)
          .map((key) => overrides[key])
          .filter((value) => typeof value === 'string' && value.startsWith(CUSTOM_PREFIX))
        const seen = new Set()
        const list = []
        for (const id of [...ORDER, 'other', ...custom]) {
          if (seen.has(id) || id === 'official') continue
          seen.add(id)
          list.push({ id })
        }
        return list
      }, [overrides])

      const groups = useMemo(() => {
        if (state.status !== 'ready') return []
        const buckets = new Map()
        for (const pkg of state.packages) {
          const id = categoryOf(pkg.name, overrides)
          if (!buckets.has(id)) buckets.set(id, [])
          buckets.get(id).push(pkg)
        }
        const customIds = [...buckets.keys()].filter((id) => id.startsWith(CUSTOM_PREFIX)).sort()
        const ids = [...ORDER, ...customIds, 'official', 'other']
          .filter((id, index, all) => all.indexOf(id) === index && buckets.has(id))
        return ids.map((id) => ({ id, items: buckets.get(id) }))
      }, [state, overrides])

      if (state.status === 'loading') {
        return h('p', { className: 'dpc-status', role: 'status' }, h('span', { className: 'dpc-dot' }), t('loading'))
      }
      if (state.status === 'unavailable') {
        return h('p', { className: 'dpc-status', role: 'status' }, h('span', { className: 'dpc-dot' }), t('unavailable'))
      }
      if (state.status === 'error') {
        return h('p', { className: 'dpc-status', role: 'alert' }, h('span', { className: 'dpc-dot' }), t('error'))
      }
      if (groups.length === 0) {
        return h('p', { className: 'dpc-status', role: 'status' }, h('span', { className: 'dpc-dot' }), t('empty'))
      }

      return h('div', { className: 'dpc-root' },
        groups.map((group) => h('section', { className: 'dpc-group', key: group.id },
          h('div', { className: 'dpc-head' },
            h('span', null, labelOf(group.id, t, resolveText)),
            h('span', { className: 'dpc-count' }, String(group.items.length) + t('unit')),
          ),
          group.items.map((pkg) => h(Row, {
            key: pkg.name,
            pkg,
            t,
            resolveText,
            overrides,
            editing,
            onPick,
            onNew,
            onCancelNew: () => setEditing(null),
            options,
          })),
        )),
      )
    }

    return {
      inject: ['slots', 'locale', 'remote', 'remote.pluginManager', 'remote.pluginInventory'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, DICT), 'dsh-plugin-categorized: dictionaries')
        const t = ctx.locale.bind(NS)
        const face = { ctx, resolveText: (text) => ctx.locale.resolveText(text) }
        ctx.slots.inject('plugins.tab', () => ctx.slots.register({
          name: 'plugins.tab',
          id: 'categories',
          label: () => t('title'),
          locale: NS,
          inject: () => face,
        }, CategoriesSection))
      },
    }
  },
})
