import type { FastifyInstance } from 'fastify'
import { requireAdmin } from '../middleware/auth.js'
import { getAllSettings, setSetting } from '../db/index.js'

export async function settingsRoutes(app: FastifyInstance) {
  // GET /api/settings
  app.get('/', { preHandler: requireAdmin }, async () => {
    return { ok: true, data: getAllSettings() }
  })

  // PUT /api/settings
  app.put('/', {
    preHandler: requireAdmin,
    schema: {
      body: { type: 'object', additionalProperties: { type: 'string' } },
    },
  }, async (req, reply) => {
    const body = req.body as Record<string, string>
    for (const [key, value] of Object.entries(body)) {
      setSetting(key, value)
    }
    return { ok: true, data: getAllSettings() }
  })
}
