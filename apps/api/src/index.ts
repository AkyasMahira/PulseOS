import 'dotenv/config'
import { createServer } from 'http'
import Fastify from 'fastify'
import FastifyCors from '@fastify/cors'
import FastifyJwt from '@fastify/jwt'
import FastifyRateLimit from '@fastify/rate-limit'
import { authRoutes } from './routes/auth.js'
import { metricsRoutes, alertRoutes } from './routes/metrics.js'
import { dockerRoutes } from './routes/docker.js'
import { statusRoutes } from './routes/status.js'
import { teamRoutes } from './routes/team.js'
import { serversRoutes, startRemotePolling } from './routes/servers.js'
import { apiKeysRoutes } from './routes/apikeys.js'
import { settingsRoutes } from './routes/settings.js'
import { createSocketServer } from './ws/hub.js'
import { getDb, insertUser, userCount } from './db/index.js'
import bcrypt from 'bcryptjs'

const PORT = parseInt(process.env.PORT ?? '3001')
const HOST = process.env.HOST ?? '0.0.0.0'
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me'

if (JWT_SECRET === 'dev-secret-change-me') {
  console.warn('[pulseos] WARNING: Using default JWT secret. Set JWT_SECRET env var for production.')
  if (process.env.NODE_ENV === 'production') {
    console.error('[pulseos] FATAL: JWT_SECRET is default. Refusing to start in production.')
    process.exit(1)
  }
}

async function bootstrap() {
  // Init DB
  getDb()

  // Seed default admin if no users exist and env creds provided
  const adminUser = process.env.ADMIN_USER
  const adminPass = process.env.ADMIN_PASS
  if (adminUser && adminPass && userCount() === 0) {
    const hashed = await bcrypt.hash(adminPass, 12)
    insertUser(adminUser, hashed, 'owner')
    console.log(`[init] Created owner account: ${adminUser}`)
  }

  const app = Fastify({ logger: { level: 'warn' }, trustProxy: true, bodyLimit: 1_048_576 })

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
  await app.register(dockerRoutes, { prefix: '/api/docker' })
  await app.register(statusRoutes, { prefix: '/status' })
  await app.register(teamRoutes, { prefix: '/api/team' })
  await app.register(serversRoutes, { prefix: '/api/servers' })
  await app.register(apiKeysRoutes, { prefix: '/api/apikeys' })
  await app.register(settingsRoutes, { prefix: '/api/settings' })

  // Health check
  app.get('/health', async () => ({ ok: true, ts: Date.now() }))

  // Build Node HTTP server so Socket.IO can share it
  const httpServer = createServer(app.server)
  // Socket.IO attaches to existing server
  createSocketServer(app.server as any, JWT_SECRET)

  startRemotePolling(parseInt(process.env.COLLECT_INTERVAL_MS ?? '5000'))

  await app.listen({ port: PORT, host: HOST })
  console.log(`[pulseos] API running on http://${HOST}:${PORT}`)
  console.log(`[pulseos] Socket.IO on ws://${HOST}:${PORT}/ws`)
}

bootstrap().catch((e) => {
  console.error('[fatal]', e)
  process.exit(1)
})
