import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/auth.js'
import { collectDocker } from '../collectors/docker.js'
import { request as httpRequest } from 'http'

const SOCKET = process.env.DOCKER_SOCKET ?? '/var/run/docker.sock'

function dockerPost(path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      { socketPath: SOCKET, path, method: 'POST', headers: { Host: 'localhost', 'Content-Length': '0' } },
      (res) => {
        res.resume()
        res.on('end', () => resolve(res.statusCode ?? 0))
      }
    )
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')) })
    req.end()
  })
}

function dockerDelete(path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      { socketPath: SOCKET, path, method: 'DELETE', headers: { Host: 'localhost' } },
      (res) => { res.resume(); res.on('end', () => resolve(res.statusCode ?? 0)) }
    )
    req.on('error', reject)
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')) })
    req.end()
  })
}

export async function dockerRoutes(app: FastifyInstance) {
  // GET /api/docker
  app.get('/', { preHandler: requireAuth }, async () => {
    const containers = await collectDocker()
    return { ok: true, data: containers }
  })

  // POST /api/docker/:id/:action
  app.post<{ Params: { id: string; action: string } }>(
    '/:id/:action',
    { preHandler: requireAuth },
    async (req, reply) => {
      const { id, action } = req.params
      const allowed = ['start', 'stop', 'restart', 'pause', 'unpause']

      if (!allowed.includes(action)) {
        return reply.code(400).send({ ok: false, error: `Invalid action. Allowed: ${allowed.join(', ')}` })
      }

      try {
        const status = await dockerPost(`/containers/${id}/${action}`)
        if (status >= 400) {
          return reply.code(status).send({ ok: false, error: `Docker returned ${status}` })
        }
        return { ok: true, data: { id, action, status } }
      } catch (e) {
        return reply.code(500).send({ ok: false, error: String(e) })
      }
    }
  )

  // DELETE /api/docker/:id
  app.delete<{ Params: { id: string }; Querystring: { force?: string } }>(
    '/:id',
    { preHandler: requireAuth },
    async (req, reply) => {
      const { id } = req.params
      const force = req.query.force === 'true'
      try {
        const status = await dockerDelete(`/containers/${id}?force=${force}`)
        if (status >= 400) return reply.code(status).send({ ok: false, error: `Docker returned ${status}` })
        return { ok: true }
      } catch (e) {
        return reply.code(500).send({ ok: false, error: String(e) })
      }
    }
  )

  // GET /api/docker/:id/logs
  app.get<{ Params: { id: string }; Querystring: { tail?: string } }>(
    '/:id/logs',
    { preHandler: requireAuth },
    async (req, reply) => {
      const { id } = req.params
      const tail = Math.min(parseInt(req.query.tail ?? '100'), 500)

      return new Promise((resolve) => {
        let data = ''
        const r = httpRequest(
          { socketPath: SOCKET, path: `/containers/${id}/logs?stdout=1&stderr=1&tail=${tail}&timestamps=1`, method: 'GET', headers: { Host: 'localhost' } },
          (res) => {
            res.on('data', chunk => { data += chunk })
            res.on('end', () => resolve({ ok: true, data: data.split('\n').filter(Boolean) }))
          }
        )
        r.on('error', (e) => resolve({ ok: false, error: String(e) }))
        r.setTimeout(5000, () => { r.destroy(); resolve({ ok: false, error: 'timeout' }) })
        r.end()
      })
    }
  )
}
