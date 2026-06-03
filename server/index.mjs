// Zero-dependency sync + static server for TickFlow.
// Serves the built app from ../dist and a tiny last-write-wins state API.
//   GET  /api/state -> { version, state }
//   PUT  /api/state  ({ state }) -> { version }   (bumps version, persists)
// Data is kept in ./data.json so it survives restarts.
import http from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname, normalize } from 'node:path'
import os from 'node:os'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')
const DATA = join(__dirname, 'data.json')
const PORT = Number(process.env.PORT) || 3000

let store = { version: 0, state: null }
if (existsSync(DATA)) {
  try { store = JSON.parse(readFileSync(DATA, 'utf8')) } catch { /* start fresh */ }
}
let saving = null
async function persist() {
  // serialize writes so concurrent PUTs don't corrupt the file
  saving = (saving ?? Promise.resolve()).then(() => writeFile(DATA, JSON.stringify(store)))
  return saving
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => {
      data += c
      if (data.length > 25 * 1024 * 1024) reject(new Error('payload too large'))
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

async function serveStatic(req, res) {
  // map URL path to a file in dist; fall back to index.html (SPA)
  let pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  let file = normalize(join(DIST, pathname))
  if (!file.startsWith(DIST)) { res.writeHead(403).end('Forbidden'); return } // path traversal guard
  if (pathname === '/' || !existsSync(file)) file = join(DIST, 'index.html')
  if (!existsSync(file)) {
    res.writeHead(404).end('Build not found — run "npm run build" first.')
    return
  }
  try {
    const buf = await readFile(file)
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' })
    res.end(buf)
  } catch {
    res.writeHead(500).end('Server error')
  }
}

const server = http.createServer(async (req, res) => {
  cors(res)
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return }

  const url = new URL(req.url, 'http://x')
  if (url.pathname === '/api/state') {
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(store))
      return
    }
    if (req.method === 'PUT') {
      try {
        const body = JSON.parse(await readBody(req))
        if (!body || typeof body.state !== 'object' || body.state === null) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'missing state' }))
          return
        }
        store = { version: store.version + 1, state: body.state }
        await persist()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ version: store.version }))
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'bad request' }))
      }
      return
    }
    res.writeHead(405).end('Method not allowed')
    return
  }

  await serveStatic(req, res)
})

server.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces()
  const addrs = []
  for (const [name, ifaces] of Object.entries(nets)) {
    for (const n of ifaces ?? []) {
      if (n && n.family === 'IPv4' && !n.internal) addrs.push({ name, address: n.address })
    }
  }
  // most-likely-LAN first: home Wi-Fi/router ranges (192.168.x, 10.x) before
  // virtual adapters (WSL/Hyper-V/Docker/VPN, often 172.x).
  const rank = (a) => (a.address.startsWith('192.168.') ? 0 : a.address.startsWith('10.') ? 1 : 2)
  addrs.sort((a, b) => rank(a) - rank(b))

  console.log('\n  TickFlow sync server running:\n')
  console.log(`    Local:    http://localhost:${PORT}`)
  if (addrs.length) {
    console.log('\n  Open ONE of these on your other devices (try the 192.168.x one first):')
    for (const a of addrs) console.log(`    http://${a.address}:${PORT}   (${a.name})`)
    console.log('\n  Not connecting? Allow Node.js through Windows Firewall on Private networks.')
  }
  console.log('\n  Data file:', DATA, '\n  Press Ctrl+C to stop.\n')
})
