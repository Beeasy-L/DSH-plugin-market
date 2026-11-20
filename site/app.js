/* DSH 插件市场 · site behaviour
   语言切换与插件详情都在当前页完成，不跳转。 */
(function () {
  'use strict'

  var DATA = {}
  var LANG = 'zh'
  var KEY = 'dpm-lang'
  var current = null

  function $(sel, root) { return (root || document).querySelector(sel) }
  function el(tag, cls, text) {
    var node = document.createElement(tag)
    if (cls) node.className = cls
    if (text !== undefined && text !== null) node.textContent = text
    return node
  }

  /* ---------------- 极简 Markdown ----------------
     只处理本仓库用到的语法：段落、列表、**粗体**、`代码`、以及 [链接](url)。 */

  function inline(text) {
    var frag = document.createDocumentFragment()
    // 先切出 `code`，避免里面的字符被后续规则改写
    var parts = String(text).split(/(`[^`]+`)/g)
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i]
      if (part.length > 1 && part.charAt(0) === '`' && part.charAt(part.length - 1) === '`') {
        frag.appendChild(el('code', null, part.slice(1, -1)))
        continue
      }
      // **粗体**
      var bold = /\*\*([^*]+)\*\*/g
      var last = 0
      var m
      while ((m = bold.exec(part)) !== null) {
        if (m.index > last) frag.appendChild(document.createTextNode(part.slice(last, m.index)))
        frag.appendChild(el('strong', null, m[1]))
        last = m.index + m[0].length
      }
      if (last < part.length) frag.appendChild(document.createTextNode(part.slice(last)))
    }
    return frag
  }

  function renderMarkdown(text, target) {
    var lines = String(text || '').split('\n')
    var list = null
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim()
      if (line === '') { list = null; continue }
      var bullet = /^[-*]\s+(.*)$/.exec(line)
      if (bullet) {
        if (list === null) { list = el('ul'); target.appendChild(list) }
        var li = el('li')
        li.appendChild(inline(bullet[1]))
        list.appendChild(li)
        continue
      }
      list = null
      var p = el('p')
      p.appendChild(inline(line))
      target.appendChild(p)
    }
  }

  function pick(obj) {
    if (obj === null || obj === undefined) return ''
    if (typeof obj === 'string') return obj
    // 数组直接用（install.uiSteps 这类就是数组）
    if (Array.isArray(obj)) return obj
    // {zh, en} 形态
    if (obj[LANG] !== undefined) return obj[LANG]
    return obj.zh !== undefined ? obj.zh : (obj.en !== undefined ? obj.en : '')
  }

  /* ---------------- 语言 ---------------- */

  function t(key) {
    var table = DATA.meta && DATA.meta[LANG]
    if (!table) return ''
    var value = table[key]
    return typeof value === 'string' ? value : ''
  }

  function applyLanguage(lang) {
    LANG = lang === 'en' ? 'en' : 'zh'
    document.documentElement.lang = LANG === 'en' ? 'en' : 'zh-CN'

    var nodes = document.querySelectorAll('[data-i18n]')
    for (var i = 0; i < nodes.length; i++) {
      var value = t(nodes[i].getAttribute('data-i18n'))
      if (value) nodes[i].textContent = value
    }

    var buttons = document.querySelectorAll('.lang-btn')
    for (var j = 0; j < buttons.length; j++) {
      buttons[j].setAttribute('aria-pressed', buttons[j].getAttribute('data-lang') === LANG ? 'true' : 'false')
    }

    document.title = LANG === 'en'
      ? 'DSH Plugin Market · DeepSeek Harness plugins'
      : 'DSH 插件市场 · DeepSeek Harness 插件合集'

    try { window.localStorage.setItem(KEY, LANG) } catch (e) { /* 无痕模式 */ }

    renderCards()
    if (current !== null) openDetail(current, true)
  }

  /* ---------------- 卡片列表 ---------------- */

  function renderCards() {
    var host = $('#plugin-list')
    host.textContent = ''

    DATA.plugins.forEach(function (plugin) {
      var card = el('div', 'card')

      var head = el('div', 'card-head')
      var img = el('img', 'card-icon')
      img.src = plugin.icon
      img.alt = ''
      img.loading = 'lazy'
      var titles = el('div', 'card-titles')
      titles.appendChild(el('h2', 'card-name', pick(plugin.name)))
      titles.appendChild(el('p', 'card-pkg', plugin.id))
      head.appendChild(img)
      head.appendChild(titles)
      card.appendChild(head)

      var summary = el('p', 'card-summary')
      summary.appendChild(inline(pick(plugin.summary)))
      card.appendChild(summary)

      var tags = el('div', 'card-tags')
      ;(pick(plugin.tags) || []).forEach(function (tag) { tags.appendChild(el('span', 'tag', tag)) })
      card.appendChild(tags)

      var actions = el('div', 'card-actions')
      var more = el('button', 'btn btn-primary', t('readMore'))
      more.type = 'button'
      more.addEventListener('click', function () { openDetail(plugin) })
      actions.appendChild(more)

      var install = el('a', 'btn', t('install'))
      install.href = '#install-' + plugin.id
      install.addEventListener('click', function (event) {
        event.preventDefault()
        openDetail(plugin, false, 'install')
      })
      actions.appendChild(install)

      var repo = el('a', 'btn btn-ghost', t('repo'))
      repo.href = plugin.repo
      repo.target = '_blank'
      repo.rel = 'noopener'
      actions.appendChild(repo)

      card.appendChild(actions)
      host.appendChild(card)
    })
  }

  /* ---------------- 详情（当前页展开） ---------------- */

  function ensureDetail() {
    var detail = $('#detail')
    if (detail) return detail

    var backdrop = el('div', 'detail-backdrop')
    backdrop.id = 'detail-backdrop'
    backdrop.addEventListener('click', closeDetail)
    document.body.appendChild(backdrop)

    detail = el('div', 'detail')
    detail.id = 'detail'
    detail.setAttribute('role', 'dialog')
    detail.setAttribute('aria-modal', 'true')
    detail.setAttribute('aria-labelledby', 'detail-name')

    var head = el('div', 'detail-head')
    var icon = el('img', 'detail-icon')
    icon.id = 'detail-icon'
    icon.alt = ''
    var heading = el('div', 'detail-heading')
    var name = el('h2', 'detail-name')
    name.id = 'detail-name'
    var pkg = el('p', 'detail-pkg')
    pkg.id = 'detail-pkg'
    heading.appendChild(name)
    heading.appendChild(pkg)
    var close = el('button', 'detail-close', '✕')
    close.type = 'button'
    close.setAttribute('aria-label', t('close'))
    close.addEventListener('click', closeDetail)
    head.appendChild(icon)
    head.appendChild(heading)
    head.appendChild(close)
    detail.appendChild(head)

    var body = el('div', 'detail-body')
    body.id = 'detail-body'
    detail.appendChild(body)

    document.body.appendChild(detail)
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && detail.classList.contains('open')) closeDetail()
    })
    return detail
  }

  function openDetail(plugin, keepScroll, scrollTo) {
    var detail = ensureDetail()
    current = plugin

    var icon = $('#detail-icon')
    icon.src = plugin.icon
    $('#detail-name').textContent = pick(plugin.name)
    $('#detail-pkg').textContent = plugin.id
    $('.detail-close').setAttribute('aria-label', t('close'))

    var body = $('#detail-body')
    body.textContent = ''

    // 介绍各节
    ;(plugin.sections || []).forEach(function (section) {
      var block = el('section', 'detail-section')
      block.id = 'section-' + plugin.id + '-' + section.id
      block.appendChild(el('h3', null, pick(section.title)))

      if (section.table) {
        var table = el('table', 'detail-table')
        var spec = pick(section.table)
        var thead = el('thead')
        var hrow = el('tr')
        ;(spec.head || []).forEach(function (cell) { hrow.appendChild(el('th', null, cell)) })
        thead.appendChild(hrow)
        table.appendChild(thead)
        var tbody = el('tbody')
        ;(spec.rows || []).forEach(function (row) {
          var tr = el('tr')
          row.forEach(function (cell, index) {
            var td = el('td')
            if (index === 0) td.appendChild(inline(cell))
            else td.textContent = cell
            tr.appendChild(td)
          })
          tbody.appendChild(tr)
        })
        table.appendChild(tbody)
        block.appendChild(table)
      } else if (section.body) {
        renderMarkdown(pick(section.body), block)
      }
      body.appendChild(block)
    })

    // 截图
    if (plugin.screenshots && plugin.screenshots.length) {
      var shotBlock = el('section', 'detail-section')
      shotBlock.appendChild(el('h3', null, t('screenshots')))
      var shots = el('div', 'shots')
      plugin.screenshots.forEach(function (src) {
        var fig = el('figure', 'shot')
        var shot = el('img')
        shot.src = src
        shot.alt = ''
        shot.loading = 'lazy'
        fig.appendChild(shot)
        shots.appendChild(fig)
      })
      shotBlock.appendChild(shots)
      body.appendChild(shotBlock)
    }

    // 安装
    var installBlock = el('section', 'detail-section install-block')
    installBlock.id = 'install-' + plugin.id
    installBlock.appendChild(el('h3', null, t('installTitle')))

    var installData = pick(DATA.install) || {}
    var uiTitle = pick(installData.ui) || ''
    var uiSteps = pick(installData.uiSteps) || []
    var cliTitle = pick(installData.cli) || ''
    var cliSteps = pick(installData.cliSteps) || []

    if (uiTitle) installBlock.appendChild(el('h4', null, uiTitle))
    var uiList = el('ol', 'steps')
    uiSteps.forEach(function (step) {
      var li = el('li')
      li.appendChild(inline(step))
      uiList.appendChild(li)
    })
    installBlock.appendChild(uiList)

    if (cliTitle) installBlock.appendChild(el('h4', null, cliTitle))
    var cliList = el('ol', 'steps')
    cliSteps.forEach(function (step) {
      var li = el('li')
      li.appendChild(inline(step))
      cliList.appendChild(li)
    })
    installBlock.appendChild(cliList)

    var cmdText = cliSteps.join('\n')
    var pre = el('pre', 'cmd')
    var code = el('code', null, cmdText)
    pre.appendChild(code)
    var copy = el('button', 'copy-btn', t('copy'))
    copy.type = 'button'
    copy.addEventListener('click', function () {
      var done = function () {
        copy.textContent = t('copied')
        window.setTimeout(function () { copy.textContent = t('copy') }, 1600)
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cmdText).then(done, function () { done() })
      } else {
        var ta = el('textarea')
        ta.value = cmdText
        document.body.appendChild(ta)
        ta.select()
        try { document.execCommand('copy') } catch (e) { /* 忽略 */ }
        document.body.removeChild(ta)
        done()
      }
    })
    pre.appendChild(copy)
    installBlock.appendChild(pre)
    body.appendChild(installBlock)

    // 链接
    var links = el('div', 'detail-links')
    var back = el('button', 'btn', t('back'))
    back.type = 'button'
    back.addEventListener('click', closeDetail)
    links.appendChild(back)
    var docs = el('a', 'btn', t('docs'))
    docs.href = plugin.docs
    docs.target = '_blank'
    docs.rel = 'noopener'
    links.appendChild(docs)
    var repoLink = el('a', 'btn btn-ghost', t('repo'))
    repoLink.href = plugin.repo
    repoLink.target = '_blank'
    repoLink.rel = 'noopener'
    links.appendChild(repoLink)
    body.appendChild(links)

    detail.classList.add('open')
    $('#detail-backdrop').classList.add('open')
    document.body.style.overflow = 'hidden'

    if (!keepScroll) body.scrollTop = 0
    if (scrollTo === 'install') {
      var target = $('#install-' + plugin.id)
      if (target) {
        window.setTimeout(function () {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 60)
      }
    }
  }

  function closeDetail() {
    var detail = $('#detail')
    if (!detail) return
    detail.classList.remove('open')
    $('#detail-backdrop').classList.remove('open')
    document.body.style.overflow = ''
    current = null
  }

  /* ---------------- 深链 · Deep link ----------------
     ?lang=en 切换语言；?plugin=<id> 直接展开某个插件的介绍。
     这样任何一个插件都能被单独链接分享，也方便自动化截图验证。 */

  function applyDeepLink() {
    var params = new URLSearchParams(window.location.search)
    var lang = params.get('lang')
    var pluginId = params.get('plugin')

    if (lang === 'zh' || lang === 'en') {
      applyLanguage(lang)
    }
    if (pluginId) {
      var found = null
      for (var i = 0; i < DATA.plugins.length; i++) {
        if (DATA.plugins[i].id === pluginId) { found = DATA.plugins[i]; break }
      }
      if (found) {
        // 等一帧，确保卡片已渲染、图标已开始加载
        window.setTimeout(function () { openDetail(found) }, 60)
      }
    }
  }

  /* ---------------- 启动 ---------------- */

  function boot() {
    var buttons = document.querySelectorAll('.lang-btn')
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function (event) {
        applyLanguage(event.currentTarget.getAttribute('data-lang'))
      })
    }

    // 数据用 fetch 读，避免 <script type="application/json"> 的编码与转义坑。
    window.fetch('data/plugins.json')
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status)
        return response.json()
      })
      .then(function (data) {
        DATA = data
        var saved = null
        try { saved = window.localStorage.getItem(KEY) } catch (e) { saved = null }
        if (!saved) {
          var nav = (navigator.language || 'zh').toLowerCase()
          saved = nav.indexOf('zh') === 0 ? 'zh' : 'en'
        }
        applyLanguage(saved)
        applyDeepLink()
      })
      .catch(function (error) {
        var hero = document.querySelector('.hero')
        if (hero) {
          hero.appendChild(el('p', 'hero-note', 'Failed to load plugin data: ' + error.message))
        }
      })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }
})()
