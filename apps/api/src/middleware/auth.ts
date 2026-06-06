import type { FastifyRequest, FastifyReply } from 'fastify'
import crypto from 'crypto'
import type { UserRole } from '@pulseos/types'
import { getApiKeyByHash, touchApiKey } from '../db/index.js'

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

export async function requireApiKey(req: FastifyRequest, reply: FastifyReply) {
  const key = req.headers['x-api-key'] as string | undefined
  if (!key) {
    reply.code(401).send({ ok: false, error: 'api key required' })
    return
  }

  const hash = crypto.createHash('sha256').update(key).digest('hex')
  const record = getApiKeyByHash(hash)
  if (!record) {
    reply.code(401).send({ ok: false, error: 'invalid api key' })
    return
  }

  touchApiKey(record.id)
}
