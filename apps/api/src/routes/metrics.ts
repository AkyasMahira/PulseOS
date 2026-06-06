import type { FastifyInstance } from 'fastify'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import { getMetricsHistory, getRecentAlerts, getAlertRules, insertAlertRule, updateAlertRule, deleteAlertRule, getAllAlertRules } from '../db/index.js'
import { collectAll } from '../collectors/index.js'

export async function metricsRoutes(app: FastifyInstance) {
  // GET /api/metrics/now
  app.get('/now', { preHandler: requireAuth }, async () => {
    const data = await collectAll()
    return { ok: true, data }
  })

  // GET /api/metrics/history?metric=cpu&from=&to=
  app.get<{
    Querystring: { metric?: string; from?: string; to?: string; limit?: string }
  }>('/history', { preHandler: requireAuth }, async (req, reply) => {
    const metric = (req.query.metric ?? 'cpu') as 'cpu' | 'mem' | 'net_rx' | 'net_tx'
    const to = parseInt(req.query.to ?? String(Date.now()))
    const from = parseInt(req.query.from ?? String(to - 3_600_000))  // default 1h
    const limit = Math.min(parseInt(req.query.limit ?? '500'), 1000)

    if (!['cpu', 'mem', 'net_rx', 'net_tx'].includes(metric)) {
      return reply.code(400).send({ ok: false, error: 'Invalid metric' })
    }

    const points = getMetricsHistory(metric, from, to, limit)
    return { ok: true, data: points }
  })
}

export async function alertRoutes(app: FastifyInstance) {
  // GET /api/alerts
  app.get('/', { preHandler: requireAuth }, async () => {
    return { ok: true, data: getRecentAlerts(100) }
  })

  // GET /api/alerts/rules
  app.get('/rules', { preHandler: requireAuth }, async () => {
    return { ok: true, data: getAlertRules() }
  })

  // POST /api/alerts/rules
  app.post<{ Body: any }>('/rules', { preHandler: requireAdmin }, async (req, reply) => {
    try {
      const id = insertAlertRule(req.body as any)
      return { ok: true, data: { id } }
    } catch (e) {
      return reply.code(400).send({ ok: false, error: String(e) })
    }
  })

  // GET /api/alerts/rules/all  (includes disabled)
  app.get('/rules/all', { preHandler: requireAdmin }, async () => {
    return { ok: true, data: getAllAlertRules() }
  })

  // PUT /api/alerts/rules/:id
  app.put<{ Params: { id: string }; Body: any }>('/rules/:id', { preHandler: requireAdmin }, async (req, reply) => {
    try {
      updateAlertRule(req.params.id, req.body as any)
      return { ok: true }
    } catch (e) {
      return reply.code(400).send({ ok: false, error: String(e) })
    }
  })

  // DELETE /api/alerts/rules/:id
  app.delete<{ Params: { id: string } }>('/rules/:id', { preHandler: requireAdmin }, async (req, reply) => {
    deleteAlertRule(req.params.id)
    return { ok: true }
  })
}
