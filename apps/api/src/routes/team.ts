import type { FastifyInstance, FastifyRequest } from 'fastify'
import bcrypt from 'bcryptjs'
import { requireAdmin, requireOwner } from '../middleware/auth.js'
import type { UserRole } from '@pulseos/types'
import {
  getAllUsers, getUserById, updateUserRole, deleteUser,
  createInvite, listInvites, deleteInvite, getInviteByToken,
  insertUser, userCount,
} from '../db/index.js'

export async function teamRoutes(app: FastifyInstance) {
  // ── Users ────────────────────────────────────────────────────────────────

  // GET /api/team/users
  app.get('/users', { preHandler: requireAdmin }, async () => {
    return { ok: true, data: getAllUsers() }
  })

  // PUT /api/team/users/:id/role
  app.put<{ Params: { id: string }; Body: { role: UserRole } }>(
    '/users/:id/role',
    { preHandler: requireOwner },
    async (req, reply) => {
      const id = parseInt(req.params.id)
      const { role } = req.body

      if (!['owner', 'admin', 'viewer'].includes(role)) {
        return reply.code(400).send({ ok: false, error: 'Invalid role' })
      }

      const user = getUserById(id)
      if (!user) {
        return reply.code(404).send({ ok: false, error: 'User not found' })
      }

      const jwtUser = (req as any).user
      if (jwtUser?.sub === id) {
        return reply.code(400).send({ ok: false, error: 'Cannot change your own role' })
      }

      updateUserRole(id, role)
      return { ok: true, data: { id, role } }
    }
  )

  // DELETE /api/team/users/:id
  app.delete<{ Params: { id: string } }>(
    '/users/:id',
    { preHandler: requireOwner },
    async (req, reply) => {
      const id = parseInt(req.params.id)
      const user = getUserById(id)
      if (!user) {
        return reply.code(404).send({ ok: false, error: 'User not found' })
      }

      const jwtUser = (req as any).user
      if (jwtUser?.sub === id) {
        return reply.code(400).send({ ok: false, error: 'Cannot delete yourself' })
      }

      deleteUser(id)
      return { ok: true }
    }
  )

  // ── Invites ──────────────────────────────────────────────────────────────

  // POST /api/team/invites
  app.post<{ Body: { email: string; role: UserRole } }>(
    '/invites',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const { email, role } = req.body

      if (!email || !role) {
        return reply.code(400).send({ ok: false, error: 'Email and role are required' })
      }

      if (!['viewer', 'admin'].includes(role)) {
        return reply.code(400).send({ ok: false, error: 'Invite role must be viewer or admin' })
      }

      const jwtUser = (req as any).user
      const invite = createInvite({
        email,
        role: role as UserRole,
        expiresAt: Date.now() + 48 * 3600 * 1000,
        createdBy: jwtUser.sub,
      })

      const baseUrl = process.env.WEB_ORIGIN ?? 'http://localhost:4321'
      return {
        ok: true,
        data: {
          ...invite,
          inviteUrl: `${baseUrl}/accept-invite?token=${invite.token}`,
        },
      }
    }
  )

  // GET /api/team/invites
  app.get('/invites', { preHandler: requireAdmin }, async () => {
    return { ok: true, data: listInvites() }
  })

  // DELETE /api/team/invites/:id
  app.delete<{ Params: { id: string } }>(
    '/invites/:id',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const { id } = req.params
      deleteInvite(id)
      return { ok: true }
    }
  )

  // ── Accept Invite (no auth — token-based) ────────────────────────────────

  app.get<{ Querystring: { token: string } }>('/invite-info', async (req, reply) => {
    const { token } = req.query
    if (!token) {
      return reply.code(400).send({ ok: false, error: 'Token is required' })
    }

    const invite = getInviteByToken(token)
    if (!invite) {
      return reply.code(404).send({ ok: false, error: 'Invite not found or expired' })
    }

    return { ok: true, data: { email: invite.email, role: invite.role } }
  })

  app.post<{ Body: { token: string; username: string; password: string } }>(
    '/accept-invite',
    async (req, reply) => {
      const { token, username, password } = req.body

      if (!token || !username || !password) {
        return reply.code(400).send({ ok: false, error: 'Token, username, and password are required' })
      }

      if (password.length < 8) {
        return reply.code(400).send({ ok: false, error: 'Password must be at least 8 characters' })
      }

      const invite = getInviteByToken(token)
      if (!invite) {
        return reply.code(404).send({ ok: false, error: 'Invite not found or expired' })
      }

      if (getUserById(1) === undefined && userCount() === 0) {
        // fallback: if no users exist, treat as first-run
      }

      const hashed = await bcrypt.hash(password, 12)
      insertUser(username, hashed, invite.role, invite.email)
      deleteInvite(invite.id)

      return { ok: true, data: { username } }
    }
  )
}
