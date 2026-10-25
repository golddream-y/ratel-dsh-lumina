/** Local design preview with the actual client bundle, React supplied by devDependencies. */
import ts from 'typescript'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
const root = resolve('docs/demo')
const assets = {
  '/__lumina/client.js': resolve('lib/client.js'),
  '/__lumina/silk-study.svg': resolve('assets/motion/silk-study.svg'),
  '/__lumina/reference.webp': resolve('assets/readme/hero-zh-CN.webp'),
  '/__lumina/react.js': resolve('node_modules/react/umd/react.production.min.js'),
  '/__lumina/react-dom.js': resolve('node_modules/react-dom/umd/react-dom.production.min.js'),
}
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost')
    if(url.pathname.startsWith('/__lumina/source/')) {
      const sourceRoot=resolve('src/client')
      const sourcePath=resolve(sourceRoot,decodeURIComponent(url.pathname.slice('/__lumina/source/'.length)).replace(/\.js$/,'.ts'))
      if(!url.pathname.endsWith('.js')||!sourcePath.startsWith(sourceRoot+sep)){response.writeHead(403).end();return}
      const source=(await readFile(sourcePath,'utf8')).replace(/(['"])(\.{1,2}\/[^'"]+)\.ts\1/g,'$1$2.js$1')
      const result=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2024,module:ts.ModuleKind.ESNext}})
      response.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'}).end(result.outputText);return
    }
    const shared = {'/__lumina/ribbon-art.js':'src/client/effects/composer-ribbon-art.generated.ts','/__lumina/ribbon-art-shaders.js':'src/client/effects/composer-ribbon-art-shaders.ts','/__lumina/ribbon-renderer.js':'src/client/effects/composer-ribbon-renderer.ts','/__lumina/session-galaxy-painter.js':'src/client/effects/session-galaxy-painter.ts','/__lumina/tokens.js':'src/client/style/tokens.ts'}[url.pathname]
    if (shared) {
      const source = (await readFile(resolve(shared), 'utf8')).replace('../style/tokens.ts','/__lumina/tokens.js').replace('./composer-ribbon-art.generated.ts','/__lumina/ribbon-art.js').replace('./composer-ribbon-art-shaders.ts','/__lumina/ribbon-art-shaders.js')
      const result = ts.transpileModule(source, {compilerOptions:{target:ts.ScriptTarget.ES2024,module:ts.ModuleKind.ESNext}})
      response.writeHead(200, {'Content-Type':'text/javascript','Cache-Control':'no-store'}).end(result.outputText); return
    }
    const path = assets[url.pathname] ?? resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/particle-stroke.html' : url.pathname))
    if (!assets[url.pathname] && !path.startsWith(root + sep)) { response.writeHead(403).end(); return }
    const body = await readFile(path)
    response.writeHead(200, { 'Content-Type': extname(path) === '.js' ? 'text/javascript' : extname(path) === '.html' ? 'text/html; charset=utf-8' : extname(path) === '.svg' ? 'image/svg+xml' : extname(path) === '.webp' ? 'image/webp' : 'application/octet-stream', 'Cache-Control': 'no-store' })
    response.end(body)
  } catch { response.writeHead(404).end('Not found') }
}).listen(8766, '127.0.0.1', () => console.log('http://127.0.0.1:8766/particle-stroke.html'))
