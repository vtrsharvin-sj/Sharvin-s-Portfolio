import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { once } from 'node:events'
import { WebSocket } from 'ws'
import { createApp } from './index.js'

test('production backend health, private files, and frontend origin allowlist', async () => {
    const app = createApp({ staticDir: null, dataDir: mkdtempSync(join(tmpdir(), 'sharvin-production-test-')), allowedOrigins: ['https://portfolio.example'] })
    app.server.listen(0, '127.0.0.1')
    await once(app.server, 'listening')
    const base = `http://127.0.0.1:${app.server.address().port}`
    try {
        assert.deepEqual(await (await fetch(`${base}/healthz`)).json(), { status: 'ok' })
        for(const path of ['/server/data/state.json', '/.env', '/sources/main.js']) assert.equal((await fetch(base + path)).status, 404)
        assert.equal((await fetch(`${base}/healthz`, { method: 'POST' })).status, 405)
        const good = new WebSocket(base.replace('http:', 'ws:') + '/api/live', { origin: 'https://portfolio.example' })
        await once(good, 'open'); good.terminate()
        const bad = new WebSocket(base.replace('http:', 'ws:') + '/api/live', { origin: 'https://untrusted.example' })
        await once(bad, 'error')
    } finally { app.close(); await once(app.server, 'close') }
})
