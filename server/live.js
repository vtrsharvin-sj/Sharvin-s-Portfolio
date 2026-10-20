import { WebSocketServer, WebSocket } from 'ws'
import msgpack from 'msgpack-lite'
import { mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export function attachLiveServer(httpServer, { dataFile = resolve('server/data/state.json'), allowedOrigins = [] } = {}) {
    const tomorrow = () => Date.parse(new Date().toISOString().slice(0, 10)) + 86400000
    let state = { whispers: [], scores: [], circuitResetTime: tomorrow(), cookiesCount: 0, cataclysmCount: 0 }
    try { state = { ...state, ...JSON.parse(readFileSync(dataFile, 'utf8')) } }
    catch(error) { if(error.code !== 'ENOENT') throw error }
    const save = () => {
        mkdirSync(dirname(dataFile), { recursive: true })
        writeFileSync(`${dataFile}.tmp`, JSON.stringify(state))
        renameSync(`${dataFile}.tmp`, dataFile)
    }
    const leaderboard = () => state.scores.slice().sort((a,b) => a.duration - b.duration).slice(0,10).map(s => [s.tag, s.countryCode, s.duration])
    let cataclysmUntil = 0
    const cataclysm = () => ({ cataclysmCount: state.cataclysmCount, cataclysmProgress: (state.cataclysmCount % 10) / 10, cataclysmRunning: Date.now() < cataclysmUntil })
    const snapshot = () => ({ type: 'init', whispers: state.whispers.map(({uuid, ...w}) => w), circuitLeaderboard: leaderboard(), circuitResetTime: state.circuitResetTime - 86400000, cookiesCount: state.cookiesCount, easterEggs: {}, ...cataclysm() })
    const wss = new WebSocketServer({ noServer: true, maxPayload: 4096 })
    const send = (socket, data) => { if(socket.readyState === WebSocket.OPEN) socket.send(msgpack.encode(data)) }
    const broadcast = data => { for(const socket of wss.clients) send(socket, data) }
    const resetDay = () => {
        if(Date.now() >= state.circuitResetTime) {
            state.scores = []; state.circuitResetTime = tomorrow(); save(); broadcast(snapshot())
        }
    }
    const upgrade = (req, socket, head) => {
        if(req.url?.split('?')[0] !== '/api/live') return
        // Split deployments must explicitly allow their frontend origins.
        try { if(req.headers.origin && new URL(req.headers.origin).host !== req.headers.host && !allowedOrigins.includes(req.headers.origin)) { socket.destroy(); return } }
        catch { socket.destroy(); return }
        if(wss.clients.size >= 100) { socket.destroy(); return }
        wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws))
    }
    httpServer.on('upgrade', upgrade)
    wss.on('connection', socket => {
        socket.alive = true
        socket.on('pong', () => { socket.alive = true })
        resetDay(); send(socket, snapshot())
        let uuid = null
        const last = new Map()
        socket.on('error', () => {})
        socket.on('message', raw => {
            let request
            try {
                const m = msgpack.decode(raw)
                request = typeof m?.type === 'string' ? m.type : undefined
                if(!m || typeof m.uuid !== 'string' || !/^[a-zA-Z0-9-]{16,64}$/.test(m.uuid)) throw Error('Invalid session')
                if(uuid && uuid !== m.uuid) throw Error('Session changed')
                uuid = m.uuid
                const intervals = { whispersInsert: 2000, circuitInsert: 2000, cookiesInsert: 500, cataclysmInsert: 5000 }
                if(!Object.hasOwn(intervals, m.type)) throw Error('Unknown request')
                if(Date.now() - (last.get(m.type) || 0) < intervals[m.type]) throw Error('Please wait before trying again')
                const countryCode = typeof m.countryCode === 'string' && /^[a-z]{2}$/i.test(m.countryCode) ? m.countryCode.toLowerCase() : ''
                resetDay()
                if(m.type === 'whispersInsert') {
                    if(typeof m.message !== 'string' || !m.message.trim() || [...m.message].length > 30 || /[<>\x00-\x1f]/.test(m.message)) throw Error('Use 1–30 characters without markup')
                    if(![m.x,m.y,m.z].every(n => Number.isFinite(n) && Math.abs(n) <= 1000)) throw Error('Invalid position')
                    const previous = state.whispers.find(w => w.uuid === uuid)
                    const whisper = { id: previous?.id || crypto.randomUUID(), uuid, message: m.message.trim(), countrycode: countryCode, x:m.x, y:m.y, z:m.z }
                    state.whispers = state.whispers.filter(w => w.uuid !== uuid)
                    const removed = state.whispers.length >= 30 ? state.whispers.shift() : null
                    state.whispers.push(whisper); save()
                    if(removed) broadcast({ type:'whispersDelete', whispers:[{id:removed.id}] })
                    const { uuid: privateId, ...publicWhisper } = whisper
                    broadcast({ type:'whispersInsert', whispers:[publicWhisper] })
                } else if(m.type === 'circuitInsert') {
                    if(!/^[A-Z0-9]{3}$/.test(m.tag) || !Number.isInteger(m.duration) || m.duration < 10000 || m.duration > 3600000) throw Error('Invalid race score')
                    if(!Array.isArray(m.checkpointTimings) || m.checkpointTimings.length !== 9 || !m.checkpointTimings.every((t,i,a) => Number.isInteger(t) && t >= 0 && t <= m.duration && (!i || t > a[i-1])) || Math.abs(m.checkpointTimings.at(-1)-m.duration) > 100) throw Error('Complete every checkpoint first')
                    const best = state.scores.find(s => s.uuid === uuid)
                    if(!best || m.duration < best.duration) {
                        state.scores = state.scores.filter(s => s.uuid !== uuid)
                        state.scores.push({uuid,tag:m.tag,countryCode,duration:m.duration})
                        state.scores.sort((a,b)=>a.duration-b.duration); state.scores = state.scores.slice(0,1000); save()
                    }
                    broadcast({type:'circuitUpdate',circuitLeaderboard:leaderboard()})
                } else if(m.type === 'cookiesInsert') {
                    if(!Number.isInteger(m.amount) || m.amount < 1 || m.amount > 100) throw Error('Invalid cookie amount')
                    state.cookiesCount += m.amount; save(); broadcast({type:'cookiesUpdate',cookiesCount:state.cookiesCount})
                } else {
                    state.cataclysmCount++; if(state.cataclysmCount % 10 === 0) cataclysmUntil = Date.now()+30000
                    save(); broadcast({type:'cataclysmUpdate',...cataclysm()})
                }
                last.set(m.type, Date.now())
                send(socket,{type:'ack',request:m.type})
            } catch(error) { send(socket,{type:'error',request,message:error.message}) }
        })
    })
    const timer = setInterval(() => {
        resetDay()
        if(cataclysmUntil && Date.now() >= cataclysmUntil) { cataclysmUntil=0; broadcast({type:'cataclysmUpdate',...cataclysm()}) }
    },1000)
    timer.unref()
    const heartbeat = setInterval(() => {
        for(const socket of wss.clients) {
            if(!socket.alive) { socket.terminate(); continue }
            socket.alive = false
            socket.ping()
        }
    }, 30000)
    heartbeat.unref()
    let closed = false
    return () => { if(closed) return; closed = true; clearInterval(timer); clearInterval(heartbeat); httpServer.off('upgrade',upgrade); for(const s of wss.clients) s.terminate(); wss.close() }
}

export function livePlugin() {
    const configure = server => { const close = attachLiveServer(server.httpServer); server.httpServer.once('close',close) }
    return { name:'portfolio-live-server', configureServer:configure, configurePreviewServer:configure }
}
