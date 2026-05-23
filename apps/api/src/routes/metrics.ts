import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/auth.js'
import { getMetricsHistory, getRecentAlerts, getAlertRules, insertAlertRule } from '../db/index.js'
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
  app.post<{ Body: any }>('/rules', { preHandler: requireAuth }, async (req, reply) => {
    try {
      const id = insertAlertRule(req.body)
      return { ok: true, data: { id } }
    } catch (e) {
      return reply.code(400).send({ ok: false, error: String(e) })
    }
  })
}
