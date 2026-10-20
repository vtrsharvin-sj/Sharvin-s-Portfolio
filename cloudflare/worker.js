import msgpack from 'msgpack-lite'

const MAX_MESSAGE_BYTES = 4096
const MAX_CONNECTIONS = 100
const WHISPER_LIMIT = 30
const SCORE_LIMIT = 1000

const tomorrowUtc = () => {
    const now = new Date()
    return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
}

const emptyState = () => ({
    whispers: [],
    scores: [],
    circuitResetTime: tomorrowUtc(),
    cookiesCount: 0,
    cataclysmCount: 0,
    cataclysmUntil: 0,
})

const encode = value => msgpack.encode(value)

function decode(raw) {
    let bytes
    if(typeof raw === 'string') bytes = new TextEncoder().encode(raw)
    else if(raw instanceof ArrayBuffer) bytes = new Uint8Array(raw)
    else if(ArrayBuffer.isView(raw)) bytes = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength)
    else throw new Error('Invalid message')

    if(bytes.byteLength > MAX_MESSAGE_BYTES) throw new Error('Message is too large')
    return msgpack.decode(bytes)
}

const leaderboard = state => state.scores
    .slice()
    .sort((a, b) => a.duration - b.duration)
    .slice(0, 10)
    .map(score => [score.tag, score.countryCode, score.duration])

export class LiveRoom {
    constructor(ctx, env) {
        this.ctx = ctx
        this.env = env
        this.statePromise = null
    }

    async getState() {
        if(!this.statePromise) {
            this.statePromise = this.ctx.storage.get('state').then(state => {
                this.state = state || emptyState()
                return this.state
            })
        }
        return this.statePromise
    }

    async saveState() {
        await this.ctx.storage.put('state', this.state)
    }

    async resetDay() {
        if(Date.now() >= this.state.circuitResetTime) {
            this.state.scores = []
            this.state.circuitResetTime = tomorrowUtc()
            await this.saveState()
            this.broadcast(await this.snapshot())
        }
    }

    async snapshot() {
        await this.getState()
        const now = Date.now()
        if(this.state.cataclysmUntil && now >= this.state.cataclysmUntil) {
            this.state.cataclysmUntil = 0
            await this.saveState()
        }

        return {
            type: 'init',
            whispers: this.state.whispers.map(({ uuid, ...whisper }) => whisper),
            circuitLeaderboard: leaderboard(this.state),
            circuitResetTime: this.state.circuitResetTime - 86400000,
            cookiesCount: this.state.cookiesCount,
            easterEggs: {},
            cataclysmCount: this.state.cataclysmCount,
            cataclysmProgress: (this.state.cataclysmCount % 10) / 10,
            cataclysmRunning: now < this.state.cataclysmUntil,
        }
    }

    broadcast(data) {
        const message = encode(data)
        for(const socket of this.ctx.getWebSockets()) {
            try { socket.send(message) } catch {}
        }
    }

    async fetch(request) {
        const url = new URL(request.url)
        if(url.pathname !== '/api/live') return new Response('Not found', { status: 404 })
        if(request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
            return new Response('WebSocket upgrade required', { status: 426, headers: { Upgrade: 'websocket' } })
        }

        const origin = request.headers.get('Origin')
        const allowedOrigins = (this.env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean)
        if(origin && origin !== url.origin && !allowedOrigins.includes(origin)) {
            return new Response('Origin not allowed', { status: 403 })
        }

        if(this.ctx.getWebSockets().length >= MAX_CONNECTIONS) {
            return new Response('Server is full', { status: 503 })
        }

        await this.getState()
        await this.resetDay()
        const pair = new WebSocketPair()
        const [client, server] = Object.values(pair)
        server.serializeAttachment({ uuid: null, last: {} })
        this.ctx.acceptWebSocket(server)
        server.send(encode(await this.snapshot()))
        return new Response(null, { status: 101, webSocket: client })
    }

    async webSocketMessage(socket, raw) {
        let request
        try {
            await this.getState()
            await this.resetDay()
            const message = decode(raw)
            request = typeof message?.type === 'string' ? message.type : undefined
            if(!message || typeof message.uuid !== 'string' || !/^[a-zA-Z0-9-]{16,64}$/.test(message.uuid)) throw new Error('Invalid session')

            const attachment = socket.deserializeAttachment() || { uuid: null, last: {} }
            if(attachment.uuid && attachment.uuid !== message.uuid) throw new Error('Session changed')
            attachment.uuid = message.uuid
            const intervals = { whispersInsert: 2000, circuitInsert: 2000, cookiesInsert: 500, cataclysmInsert: 5000 }
            if(!Object.hasOwn(intervals, message.type)) throw new Error('Unknown request')
            if(Date.now() - (attachment.last[message.type] || 0) < intervals[message.type]) throw new Error('Please wait before trying again')

            const countryCode = typeof message.countryCode === 'string' && /^[a-z]{2}$/i.test(message.countryCode) ? message.countryCode.toLowerCase() : ''

            if(message.type === 'whispersInsert') {
                if(typeof message.message !== 'string' || !message.message.trim() || [...message.message].length > 30 || /[<>\x00-\x1f]/.test(message.message)) throw new Error('Use 1–30 characters without markup')
                if(![message.x, message.y, message.z].every(value => Number.isFinite(value) && Math.abs(value) <= 1000)) throw new Error('Invalid position')
                const previous = this.state.whispers.find(whisper => whisper.uuid === message.uuid)
                const whisper = { id: previous?.id || crypto.randomUUID(), uuid: message.uuid, message: message.message.trim(), countrycode: countryCode, x: message.x, y: message.y, z: message.z }
                this.state.whispers = this.state.whispers.filter(item => item.uuid !== message.uuid)
                const removed = this.state.whispers.length >= WHISPER_LIMIT ? this.state.whispers.shift() : null
                this.state.whispers.push(whisper)
                await this.saveState()
                if(removed) this.broadcast({ type: 'whispersDelete', whispers: [{ id: removed.id }] })
                const { uuid, ...publicWhisper } = whisper
                this.broadcast({ type: 'whispersInsert', whispers: [publicWhisper] })
            } else if(message.type === 'circuitInsert') {
                if(!/^[A-Z0-9]{3}$/.test(message.tag) || !Number.isInteger(message.duration) || message.duration < 10000 || message.duration > 3600000) throw new Error('Invalid race score')
                if(!Array.isArray(message.checkpointTimings) || message.checkpointTimings.length !== 9 || !message.checkpointTimings.every((time, index, all) => Number.isInteger(time) && time >= 0 && time <= message.duration && (!index || time > all[index - 1])) || Math.abs(message.checkpointTimings.at(-1) - message.duration) > 100) throw new Error('Complete every checkpoint first')
                const best = this.state.scores.find(score => score.uuid === message.uuid)
                if(!best || message.duration < best.duration) {
                    this.state.scores = this.state.scores.filter(score => score.uuid !== message.uuid)
                    this.state.scores.push({ uuid: message.uuid, tag: message.tag, countryCode, duration: message.duration })
                    this.state.scores.sort((a, b) => a.duration - b.duration)
                    this.state.scores = this.state.scores.slice(0, SCORE_LIMIT)
                    await this.saveState()
                }
                this.broadcast({ type: 'circuitUpdate', circuitLeaderboard: leaderboard(this.state) })
            } else if(message.type === 'cookiesInsert') {
                if(!Number.isInteger(message.amount) || message.amount < 1 || message.amount > 100) throw new Error('Invalid cookie amount')
                this.state.cookiesCount += message.amount
                await this.saveState()
                this.broadcast({ type: 'cookiesUpdate', cookiesCount: this.state.cookiesCount })
            } else {
                this.state.cataclysmCount++
                if(this.state.cataclysmCount % 10 === 0) {
                    this.state.cataclysmUntil = Date.now() + 30000
                    await this.ctx.storage.setAlarm(this.state.cataclysmUntil)
                }
                await this.saveState()
                this.broadcast(await this.cataclysmUpdate())
            }

            attachment.last[message.type] = Date.now()
            socket.serializeAttachment(attachment)
            socket.send(encode({ type: 'ack', request: message.type }))
        } catch(error) {
            socket.send(encode({ type: 'error', request, message: error.message }))
        }
    }

    async cataclysmUpdate() {
        await this.getState()
        return {
            type: 'cataclysmUpdate',
            cataclysmCount: this.state.cataclysmCount,
            cataclysmProgress: (this.state.cataclysmCount % 10) / 10,
            cataclysmRunning: Date.now() < this.state.cataclysmUntil,
        }
    }

    async alarm() {
        await this.getState()
        if(this.state.cataclysmUntil && Date.now() >= this.state.cataclysmUntil) {
            this.state.cataclysmUntil = 0
            await this.saveState()
            this.broadcast(await this.cataclysmUpdate())
        }
    }
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url)
        if(url.pathname === '/healthz') return Response.json({ status: 'ok' })
        if(url.pathname !== '/api/live') return new Response('Not found', { status: 404 })

        const id = env.LIVE_ROOM.idFromName('global')
        return env.LIVE_ROOM.get(id).fetch(request)
    },
}
