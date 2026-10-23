/** Local design preview with the actual client bundle, React supplied by devDependencies. */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
const root = resolve('docs/demo')
const assets = {
  '/__lumina/client.js': resolve('lib/client.js'),
  '/__lumina/react.js': resolve('node_modules/react/umd/react.production.min.js'),
  '/__lumina/react-dom.js': resolve('node_modules/react-dom/umd/react-dom.production.min.js'),
}
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost')
    const path = assets[url.pathname] ?? resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/particle-stroke.html' : url.pathname))
    if (!assets[url.pathname] && !path.startsWith(root + sep)) { response.writeHead(403).end(); return }
    const body = await readFile(path)
    response.writeHead(200, { 'Content-Type': extname(path) === '.js' ? 'text/javascript' : extname(path) === '.html' ? 'text/html; charset=utf-8' : 'application/octet-stream', 'Cache-Control': 'no-store' })
    response.end(body)
  } catch { response.writeHead(404).end('Not found') }
}).listen(8766, '127.0.0.1', () => console.log('http://127.0.0.1:8766/particle-stroke.html'))
