// HTTPS sync + static server for TickFlow.
// Serves the built app from ../dist and a last-write-wins state API over TLS
// (a self-signed cert is generated on first run) so OS notifications — which
// browsers only allow on secure pages — work on every device, not just localhost.
//   GET  /api/state -> { version, state }
//   PUT  /api/state  ({ state }) -> { version }
import https from 'node:https'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname, normalize } from 'node:path'
import os from 'node:os'
import selfsigned from 'selfsigned'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')
const DATA = join(__dirname, 'data.json')
const CERT_DIR = join(__dirname, 'certs')
const PORT = Number(process.env.PORT) || 3000

// ---- state store ---------------------------------------------------------
let store = { version: 0, state: null }
if (existsSync(DATA)) {
  try { store = JSON.parse(readFileSync(DATA, 'utf8')) } catch { /* start fresh */ }
}
let saving = null
async function persist() {
  saving = (saving ?? Promise.resolve()).then(() => writeFile(DATA, JSON.stringify(store)))
  return saving
}

// ---- network addresses ---------------------------------------------------
function lanAddresses() {
  const out = []
  for (const [name, ifaces] of Object.entries(os.networkInterfaces())) {
    for (const n of ifaces ?? []) {
      if (n && n.family === 'IPv4' && !n.internal) out.push({ name, address: n.address })
    }
  }
  const rank = (a) => (a.address.startsWith('192.168.') ? 0 : a.address.startsWith('10.') ? 1 : 2)
  return out.sort((a, b) => rank(a) - rank(b))
}

// ---- self-signed certificate (cached, regenerated if hosts change) -------
async function ensureCert() {
  const keyPath = join(CERT_DIR, 'key.pem')
  const certPath = join(CERT_DIR, 'cert.pem')
  const hostsPath = join(CERT_DIR, 'hosts.json')
  const desired = ['localhost', '127.0.0.1', ...lanAddresses().map((a) => a.address)]

  if (existsSync(keyPath) && existsSync(certPath) && existsSync(hostsPath)) {
    try {
      const cached = JSON.parse(readFileSync(hostsPath, 'utf8'))
      if (desired.every((h) => cached.includes(h))) {
        return { key: readFileSync(keyPath, 'utf8'), cert: readFileSync(certPath, 'utf8') }
      }
      // a new IP appeared -> regenerate covering the union so old links keep working
      desired.push(...cached.filter((h) => !desired.includes(h)))
    } catch { /* regenerate */ }
  }

  const isIp = (h) => /^\d{1,3}(\.\d{1,3}){3}$/.test(h)
  const altNames = desired.map((h) => (isIp(h) ? { type: 7, ip: h } : { type: 2, value: h }))
  const pems = await selfsigned.generate([{ name: 'commonName', value: 'TickFlow' }], {
    days: 825,
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [{ name: 'subjectAltName', altNames }],
  })
  await mkdir(CERT_DIR, { recursive: true })
  await writeFile(keyPath, pems.private)
  await writeFile(certPath, pems.cert)
  await writeFile(hostsPath, JSON.stringify(desired))
  return { key: pems.private, cert: pems.cert }
}

// ---- request handling ----------------------------------------------------
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
  let pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  let file = normalize(join(DIST, pathname))
  if (!file.startsWith(DIST)) { res.writeHead(403).end('Forbidden'); return }
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

async function handler(req, res) {
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
}

// ---- start ---------------------------------------------------------------
const { key, cert } = await ensureCert()
https.createServer({ key, cert }, handler).listen(PORT, '0.0.0.0', () => {
  console.log('\n  TickFlow sync server running (HTTPS):\n')
  console.log(`    On this PC:   https://localhost:${PORT}`)
  const addrs = lanAddresses()
  if (addrs.length) {
    console.log('\n  On other devices (same Wi-Fi), open ONE of these — pick the 192.168.x one:')
    for (const a of addrs) console.log(`    https://${a.address}:${PORT}   (${a.name})`)
  }
  console.log('\n  NOTE: it is a self-signed certificate, so each device shows a one-time')
  console.log('  "Not secure / your connection is not private" warning the first time.')
  console.log('  Click Advanced -> Proceed/Continue. After that, OS notifications work.')
  console.log('\n  Not connecting? Allow Node.js through Windows Firewall on Private networks.')
  console.log('\n  Data file:', DATA, '\n  Press Ctrl+C to stop.\n')
})
