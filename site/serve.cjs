// 本地预览服务器：正确的 UTF-8 charset + 正确的 MIME。
// node site/serve.cjs [port]
const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const port = Number(process.argv[2] || 8899)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.md': 'text/markdown; charset=utf-8',
}

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0])
  if (rel === '/' || rel === '') rel = '/site/index.html'
  const file = path.join(root, rel)
  if (!file.startsWith(root)) {
    res.writeHead(403); res.end('forbidden'); return
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      res.end('404 ' + rel)
      return
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
    })
    res.end(buf)
  })
}).listen(port, '127.0.0.1', () => {
  console.log('serving ' + root + ' on http://127.0.0.1:' + port + '/  (site at /site/)')
})
