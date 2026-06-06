import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { getUserByUsername, insertUser, userCount, updateLastLogin, updateUserPassword } from '../db/index.js'

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

    const token = app.jwt.sign({ sub: user.id, username: user.username, role: user.role }, { expiresIn: '7d' })
    updateLastLogin(user.id)
    return { ok: true, data: { token, username: user.username, role: user.role } }
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
    insertUser(username, hashed, 'owner')
    const token = app.jwt.sign({ sub: 1, username, role: 'owner' }, { expiresIn: '7d' })
    return { ok: true, data: { token, username, role: 'owner' } }
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

  // PUT /api/auth/password
  app.put<{ Body: { currentPassword: string; newPassword: string } }>('/password', {
    preHandler: async (req, reply) => {
      try { await req.jwtVerify() }
      catch { reply.code(401).send({ ok: false, error: 'unauthorized' }); return }
    },
    schema: {
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', minLength: 1 },
          newPassword: { type: 'string', minLength: 8, maxLength: 128 },
        },
      },
    },
  }, async (req, reply) => {
    const { currentPassword, newPassword } = req.body
    const jwtUser = (req as any).user
    const user = getUserByUsername(jwtUser.username)

    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return reply.code(400).send({ ok: false, error: 'Current password is incorrect' })
    }

    const hashed = await bcrypt.hash(newPassword, 12)
    updateUserPassword(user.id, hashed)
    return { ok: true }
  })

  // GET /api/auth/token  (shows current JWT — useful for multi-server)
  app.get('/token', {
    preHandler: async (req, reply) => {
      try { await req.jwtVerify() }
      catch { reply.code(401).send({ ok: false, error: 'unauthorized' }) }
    },
  }, async (req) => {
    const authHeader = req.headers.authorization ?? ''
    const token = authHeader.replace('Bearer ', '')
    return { ok: true, data: { token } }
  })
}
