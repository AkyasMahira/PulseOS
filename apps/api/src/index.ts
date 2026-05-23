import 'dotenv/config'
import { createServer } from 'http'
import Fastify from 'fastify'
import FastifyCors from '@fastify/cors'
import FastifyJwt from '@fastify/jwt'
import FastifyRateLimit from '@fastify/rate-limit'
import { authRoutes } from './routes/auth.js'
import { metricsRoutes, alertRoutes } from './routes/metrics.js'
import { createSocketServer } from './ws/hub.js'
import { getDb, insertUser, userCount } from './db/index.js'
import bcrypt from 'bcryptjs'

const PORT = parseInt(process.env.PORT ?? '3001')
const HOST = process.env.HOST ?? '0.0.0.0'
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me'

async function bootstrap() {
  // Init DB
  getDb()

  // Seed default admin if no users exist and env creds provided
  const adminUser = process.env.ADMIN_USER
  const adminPass = process.env.ADMIN_PASS
  if (adminUser && adminPass && userCount() === 0) {
    const hashed = await bcrypt.hash(adminPass, 12)
    insertUser(adminUser, hashed)
    console.log(`[init] Created admin user: ${adminUser}`)
  }

  const app = Fastify({ logger: { level: 'warn' }, trustProxy: true })

  // Plugins
  await app.register(FastifyCors, {
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:4321',
    credentials: true,
  })

  await app.register(FastifyJwt, { secret: JWT_SECRET })

  await app.register(FastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
  })

  // Routes
  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(metricsRoutes, { prefix: '/api/metrics' })
  await app.register(alertRoutes, { prefix: '/api/alerts' })

  // Health check
  app.get('/health', async () => ({ ok: true, ts: Date.now() }))

  // Build Node HTTP server so Socket.IO can share it
  const httpServer = createServer(app.server)
  // Socket.IO attaches to existing server
  createSocketServer(app.server as any, JWT_SECRET)

  await app.listen({ port: PORT, host: HOST })
  console.log(`[pulseos] API running on http://${HOST}:${PORT}`)
  console.log(`[pulseos] Socket.IO on ws://${HOST}:${PORT}/ws`)
}

bootstrap().catch((e) => {
  console.error('[fatal]', e)
  process.exit(1)
})
