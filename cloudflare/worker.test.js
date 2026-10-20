import test from 'node:test'
import assert from 'node:assert/strict'
import msgpack from 'msgpack-lite'
import { LiveRoom } from './worker.js'

function makeRoom() {
    const data = new Map()
    const sockets = []
    const ctx = {
        storage: {
            get: async key => data.get(key),
            put: async (key, value) => data.set(key, structuredClone(value)),
            setAlarm: async () => {},
        },
        getWebSockets: () => sockets,
        acceptWebSocket: socket => sockets.push(socket),
    }
    const room = new LiveRoom(ctx, { ALLOWED_ORIGINS: 'https://portfolio.example' })
    const sent = []
    let attachment = { uuid: null, last: {} }
    const socket = {
        send: value => sent.push(msgpack.decode(value)),
        deserializeAttachment: () => attachment,
        serializeAttachment: value => { attachment = structuredClone(value) },
    }
    sockets.push(socket)
    return { room, data, socket, sent }
}

const encoded = value => msgpack.encode(value)

test('Cloudflare room stores whispers and broadcasts only public fields', async () => {
    const { room, data, socket, sent } = makeRoom()
    await room.webSocketMessage(socket, encoded({
        type: 'whispersInsert', uuid: '01234567-89ab-cdef-0123-456789abcdef',
        message: 'Hello world', countryCode: 'US', x: 1, y: 2, z: 3,
    }))

    const state = data.get('state')
    assert.equal(state.whispers.length, 1)
    assert.equal(state.whispers[0].message, 'Hello world')
    assert.equal('uuid' in sent.find(message => message.type === 'whispersInsert').whispers[0], false)
    assert.equal(sent.at(-1).type, 'ack')
})

test('Cloudflare room rejects markup and invalid race submissions', async () => {
    const { room, socket, sent } = makeRoom()
    const uuid = '01234567-89ab-cdef-0123-456789abcdef'
    await room.webSocketMessage(socket, encoded({ type: 'whispersInsert', uuid, message: '<b>no</b>', x: 0, y: 0, z: 0 }))
    await room.webSocketMessage(socket, encoded({ type: 'circuitInsert', uuid, tag: 'ABC', duration: 30000, checkpointTimings: [] }))
    assert.equal(sent.filter(message => message.type === 'error').length, 2)
    assert.equal(sent.some(message => message.type === 'ack'), false)
})

test('Cloudflare room keeps the fastest valid score per session', async () => {
    const { room, data, socket, sent } = makeRoom()
    const uuid = '01234567-89ab-cdef-0123-456789abcdef'
    const submit = duration => room.webSocketMessage(socket, encoded({
        type: 'circuitInsert', uuid, tag: 'ABC', duration,
        checkpointTimings: [2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000, duration],
    }))
    await submit(30000)
    socket.serializeAttachment({ uuid, last: {} })
    await submit(29000)
    const state = data.get('state')
    assert.equal(state.scores.length, 1)
    assert.equal(state.scores[0].duration, 29000)
    assert.equal(sent.filter(message => message.type === 'circuitUpdate').at(-1).circuitLeaderboard[0][2], 29000)
})
