import type { FastifyInstance } from 'fastify'
import { requireAdmin } from '../middleware/auth.js'
import type { ApiKeyScope } from '@pulseos/types'
import {
  createApiKey, listApiKeys, revokeApiKey,
  createWebhook, listWebhooks, deleteWebhook,
} from '../db/index.js'

export async function apiKeysRoutes(app: FastifyInstance) {
  // ── API Keys ─────────────────────────────────────────────────────────────

  // GET /api/apikeys
  app.get('/', { preHandler: requireAdmin }, async () => {
    return { ok: true, data: listApiKeys() }
  })

  // POST /api/apikeys
  app.post<{ Body: { prefix?: string; scope?: ApiKeyScope } }>(
    '/',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const jwtUser = (req as any).user
      const prefix = req.body.prefix?.slice(0, 10) ?? 'pk_'
      const scope = req.body.scope ?? 'read'

      if (!['read', 'write', 'admin'].includes(scope)) {
        return reply.code(400).send({ ok: false, error: 'Invalid scope' })
      }

      const keyHex = crypto.randomUUID().replace(/-/g, '')
      const fullKey = `${prefix}${keyHex}`

      const created = createApiKey(prefix, fullKey, scope, jwtUser.sub)

      return {
        ok: true,
        data: {
          ...created,
          fullKey,
        },
        message: 'Store this key securely — it will not be shown again.',
      }
    }
  )

  // DELETE /api/apikeys/:id
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: requireAdmin },
    async (req, reply) => {
      revokeApiKey(req.params.id)
      return { ok: true }
    }
  )

  // ── Webhooks ─────────────────────────────────────────────────────────────

  // GET /api/apikeys/webhooks
  app.get('/webhooks', { preHandler: requireAdmin }, async () => {
    return { ok: true, data: listWebhooks() }
  })

  // POST /api/apikeys/webhooks
  app.post<{ Body: { url: string; events: string[]; secret?: string } }>(
    '/webhooks',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const { url, events, secret } = req.body

      if (!url || !events || events.length === 0) {
        return reply.code(400).send({ ok: false, error: 'url and events are required' })
      }

      const webhookSecret = secret ?? crypto.randomUUID().replace(/-/g, '').slice(0, 24)
      const webhook = createWebhook(url, events, webhookSecret)

      return {
        ok: true,
        data: webhook,
        message: 'Store this secret — it will not be shown again.',
      }
    }
  )

  // DELETE /api/apikeys/webhooks/:id
  app.delete<{ Params: { id: string } }>(
    '/webhooks/:id',
    { preHandler: requireAdmin },
    async (req, reply) => {
      deleteWebhook(req.params.id)
      return { ok: true }
    }
  )
}
