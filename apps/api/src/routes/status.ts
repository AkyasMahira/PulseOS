import type { FastifyInstance } from 'fastify'
import { getDb } from '../db/index.js'
import { collectServices } from '../collectors/services.js'
import type { StatusPage } from '@pulseos/types'

export async function statusRoutes(app: FastifyInstance) {
  // GET /status — public, no auth
  app.get('/', async (_req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*')

    const services = await collectServices()

    // Calculate 7d uptime from alert events
    const since7d = Date.now() - 7 * 86_400_000
    const db = getDb()

    const statusServices = services.map(svc => {
      const downtimeRows = db.prepare(`
        SELECT SUM(COALESCE(resolved_at, ?) - fired_at) as total_down
        FROM alert_events
        WHERE rule_name LIKE ? AND fired_at > ?
      `).get(Date.now(), `%${svc.name}%`, since7d) as { total_down: number | null }

      const totalMs = 7 * 86_400_000
      const downMs = downtimeRows.total_down ?? 0
      const uptime7d = Math.max(0, Math.round(((totalMs - downMs) / totalMs) * 1000) / 10)

      return {
        name: svc.name,
        status: svc.status === 'online' ? 'operational' as const
          : svc.status === 'warning' ? 'degraded' as const
          : 'outage' as const,
        uptime7d,
      }
    })

    const incidents = db.prepare(`
      SELECT id, rule_name as title, message as body, fired_at as createdAt, resolved_at as resolvedAt
      FROM alert_events
      WHERE fired_at > ?
      ORDER BY fired_at DESC
      LIMIT 10
    `).all(since7d) as any[]

    const hasOutage = statusServices.some(s => s.status === 'outage')
    const hasDegraded = statusServices.some(s => s.status === 'degraded')

    const page: StatusPage = {
      title: process.env.STATUS_PAGE_TITLE ?? 'System Status',
      description: process.env.STATUS_PAGE_DESC ?? 'Real-time service status',
      services: statusServices,
      incidents: incidents.map(i => ({ ...i, id: String(i.id) })),
      overallStatus: hasOutage ? 'outage' : hasDegraded ? 'degraded' : 'operational',
    }

    return page
  })
}
