import 'dotenv/config'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, accessSync, constants } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import sirv from 'sirv'
import { attachLiveServer } from './live.js'

export function createApp({ staticDir = resolve('dist'), dataDir = resolve(process.env.DATA_DIR || 'server/data'), allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean) } = {}) {
    if(staticDir && !existsSync(resolve(staticDir, 'index.html'))) throw Error('Build the portfolio first: npm run build (or set SERVE_STATIC=false for a backend-only host)')
    mkdirSync(dataDir, { recursive: true })
    accessSync(dataDir, constants.W_OK)
    const serve = staticDir ? sirv(staticDir, { etag: true, maxAge: 0 }) : null
    const server = createServer((req, res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
        res.setHeader('X-Frame-Options', 'DENY')
        if(!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end() }
        if(req.url?.split('?')[0] === '/healthz') {
            res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
            return res.end(JSON.stringify({ status: 'ok' }))
        }
        const notFound = () => { res.writeHead(404); res.end('Not found') }
        if(serve) serve(req, res, notFound)
        else notFound()
    })
    const closeLive = attachLiveServer(server, { dataFile: resolve(dataDir, 'state.json'), allowedOrigins })
    server.once('close', closeLive)
    return { server, close: () => { closeLive(); server.close() } }
}

if(process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    const app = createApp({ staticDir: process.env.SERVE_STATIC === 'false' ? null : resolve('dist') })
    const port = Number(process.env.PORT || 3000)
    app.server.listen(port, process.env.HOST || '0.0.0.0', () => console.log(`Sharvin portfolio listening on http://localhost:${port}`))
    for(const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => app.close())
}
