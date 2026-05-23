import { Server as SocketServer } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { collectAll } from '../collectors/index.js'
import { insertMetric, pruneOldMetrics } from '../db/index.js'
import { evaluateAlerts, onAlert } from '../alerts.js'
import type { AlertEvent } from '@pulseos/types'

const INTERVAL = parseInt(process.env.COLLECT_INTERVAL_MS ?? '5000')

let io: SocketServer | null = null
let timer: ReturnType<typeof setInterval> | null = null
let pruneTimer: ReturnType<typeof setInterval> | null = null

export function createSocketServer(httpServer: HttpServer, jwtSecret: string) {
  io = new SocketServer(httpServer, {
    cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:4321', credentials: true },
    path: '/ws',
    transports: ['websocket', 'polling'],
  })

  // Auth middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) return next(new Error('unauthorized'))

    try {
      const { verify } = await import('jsonwebtoken')
      verify(token, jwtSecret)
      next()
    } catch {
      next(new Error('unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    console.log(`[ws] client connected: ${socket.id}`)

    socket.on('subscribe', ({ channels }: { channels: string[] }) => {
      channels.forEach(ch => socket.join(ch))
    })

    socket.on('unsubscribe', ({ channels }: { channels: string[] }) => {
      channels.forEach(ch => socket.leave(ch))
    })

    socket.on('disconnect', () => {
      console.log(`[ws] client disconnected: ${socket.id}`)
    })
  })

  // Forward alerts to connected clients
  onAlert((event: AlertEvent) => {
    io?.emit('alert:fired', event)
  })

  startCollection()
  return io
}

function startCollection() {
  // Run once immediately
  tick()

  timer = setInterval(tick, INTERVAL)

  // Prune old data daily
  pruneTimer = setInterval(() => {
    pruneOldMetrics(parseInt(process.env.HISTORY_RETENTION_DAYS ?? '30'))
  }, 86_400_000)
}

async function tick() {
  try {
    const { snapshot, containers, services, processes } = await collectAll()

    // Persist to SQLite
    const netRx = snapshot.net.reduce((a, n) => a + n.rxBytes, 0)
    const netTx = snapshot.net.reduce((a, n) => a + n.txBytes, 0)
    insertMetric(snapshot.timestamp, snapshot.cpu.usage, snapshot.mem.used, snapshot.mem.total, netRx, netTx)

    // Evaluate alert rules
    await evaluateAlerts(snapshot, services)

    // Broadcast to all subscribed clients
    io?.emit('metrics:snapshot', snapshot)
    io?.emit('metrics:containers', containers)
    io?.emit('metrics:services', services)
    io?.emit('metrics:processes', processes)
  } catch (e) {
    console.error('[collector] tick error:', e)
  }
}

export function stopCollection() {
  if (timer) clearInterval(timer)
  if (pruneTimer) clearInterval(pruneTimer)
}
