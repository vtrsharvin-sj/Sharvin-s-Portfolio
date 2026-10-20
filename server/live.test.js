import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { once } from 'node:events'
import { WebSocket } from 'ws'
import msgpack from 'msgpack-lite'
import { attachLiveServer } from './live.js'

test('validate, broadcast and persist live features across restarts', async () => {
    const dataFile = join(mkdtempSync(join(tmpdir(),'sharvin-live-test-')),'state.json')
    const server = createServer()
    let stop = attachLiveServer(server,{dataFile})
    server.listen(0,'127.0.0.1'); await once(server,'listening')
    const url = `ws://127.0.0.1:${server.address().port}/api/live`
    const sockets = []
    const connect = async () => {
        const socket = new WebSocket(url); sockets.push(socket)
        const messages = []
        socket.on('message',data=>messages.push(msgpack.decode(data)))
        await once(socket,'open')
        const next = async type => {
            for(let i=0;i<200;i++) {
                const index = messages.findIndex(m=>m.type===type)
                if(index !== -1) return messages.splice(index,1)[0]
                await new Promise(resolve=>setTimeout(resolve,10))
            }
            throw Error(`Timed out waiting for ${type}`)
        }
        return { next, send: m=>socket.send(msgpack.encode({uuid:'test-session-0000001',...m})) }
    }
    try {
        const a=await connect(), b=await connect()
        assert.deepEqual((await a.next('init')).whispers,[]); await b.next('init')
        a.send({type:'whispersInsert',message:'Hello from the test',countryCode:'in',x:1,y:0,z:2})
        assert.equal((await b.next('whispersInsert')).whispers[0].message,'Hello from the test'); await a.next('ack')
        a.send({type:'whispersInsert',message:'spam',x:1,y:0,z:2}); assert.match((await a.next('error')).message,/wait/)
        a.send({type:'circuitInsert',tag:'SJ1',duration:24000,checkpointTimings:[0,3000,6000,9000,12000,15000,18000,21000,24000]})
        assert.deepEqual((await b.next('circuitUpdate')).circuitLeaderboard,[['SJ1','',24000]]); await a.next('ack')
        a.send({type:'cookiesInsert',amount:3}); assert.equal((await b.next('cookiesUpdate')).cookiesCount,3); await a.next('ack')
        a.send({type:'cataclysmInsert'}); assert.equal((await b.next('cataclysmUpdate')).cataclysmCount,1); await a.next('ack')
        assert.equal(JSON.parse(readFileSync(dataFile,'utf8')).whispers.length,1)
        stop(); stop=attachLiveServer(server,{dataFile})
        const c=await connect(); const init=await c.next('init')
        assert.equal(init.cookiesCount,3); assert.equal(init.whispers.length,1); assert.equal(init.circuitLeaderboard[0][0],'SJ1')
        assert.equal('uuid' in init.whispers[0],false)
        c.send({type:'whispersInsert',message:'<script>',x:1,y:0,z:2}); assert.match((await c.next('error')).message,/markup/)
        c.send({type:'circuitInsert',tag:'BAD',duration:24000,checkpointTimings:[]}); assert.match((await c.next('error')).message,/checkpoint/)
    } finally { stop(); for(const socket of sockets) socket.terminate(); await new Promise(resolve=>server.close(resolve)) }
})
