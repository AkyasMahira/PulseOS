import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { getUserByUsername, insertUser, userCount } from '../db/index.js'

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/login
  app.post<{ Body: { username: string; password: string } }>('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', minLength: 1 },
          password: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (req, reply) => {
    const { username, password } = req.body
    const user = getUserByUsername(username)

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return reply.code(401).send({ ok: false, error: 'Invalid credentials' })
    }

    const token = app.jwt.sign({ sub: user.id, username: user.username }, { expiresIn: '7d' })
    return { ok: true, data: { token, username: user.username } }
  })

  // POST /api/auth/setup  (first-run only)
  app.post<{ Body: { username: string; password: string } }>('/setup', async (req, reply) => {
    if (userCount() > 0) {
      return reply.code(403).send({ ok: false, error: 'Setup already complete' })
    }

    const { username, password } = req.body
    if (!username || !password || password.length < 8) {
      return reply.code(400).send({ ok: false, error: 'Password must be at least 8 characters' })
    }

    const hashed = await bcrypt.hash(password, 12)
    insertUser(username, hashed)
    const token = app.jwt.sign({ sub: 1, username }, { expiresIn: '7d' })
    return { ok: true, data: { token, username } }
  })

  // GET /api/auth/me
  app.get('/me', {
    preHandler: async (req, reply) => {
      try { await req.jwtVerify() }
      catch { reply.code(401).send({ ok: false, error: 'unauthorized' }) }
    },
  }, async (req) => {
    return { ok: true, data: req.user }
  })
}
