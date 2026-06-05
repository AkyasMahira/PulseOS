import type { FastifyRequest, FastifyReply } from 'fastify'
import type { UserRole } from '@pulseos/types'

interface JwtUser {
  sub: number
  username: string
  role: UserRole
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify()
  } catch {
    reply.code(401).send({ ok: false, error: 'unauthorized' })
    return
  }
}

export async function requireAdmin(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify()
    const user = req.user as JwtUser
    if (user.role !== 'owner' && user.role !== 'admin') {
      reply.code(403).send({ ok: false, error: 'admin access required' })
      return
    }
  } catch {
    reply.code(401).send({ ok: false, error: 'unauthorized' })
    return
  }
}

export async function requireOwner(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify()
    const user = req.user as JwtUser
    if (user.role !== 'owner') {
      reply.code(403).send({ ok: false, error: 'owner access required' })
      return
    }
  } catch {
    reply.code(401).send({ ok: false, error: 'unauthorized' })
    return
  }
}
