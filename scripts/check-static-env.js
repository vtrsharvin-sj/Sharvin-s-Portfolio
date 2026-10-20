import 'dotenv/config'

let url
try { url = new URL(process.env.VITE_SERVER_URL) } catch {}
if(process.env.VITE_SERVER_URL && (!url || url.protocol !== 'wss:' || ['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname) || url.pathname !== '/api/live')) {
    console.error('VITE_SERVER_URL must be a public wss:// backend URL ending in /api/live.')
    process.exit(1)
}
