import type { FastifyInstance } from 'fastify'
import type { ServerConfig, RemoteServerStatus, SystemSnapshot } from '@pulseos/types'
import { requireAdmin } from '../middleware/auth.js'
import { addServer, listServers, getServer, removeServer } from '../db/index.js'

const remoteCache = new Map<string, RemoteServerStatus>()

function stripToken(s: ServerConfig): Omit<ServerConfig, 'apiToken'> {
  const { apiToken, ...rest } = s
  return rest
}

async function pollServer(server: ServerConfig): Promise<RemoteServerStatus> {
  try {
    const res = await fetch(`${server.apiUrl}/api/metrics/now`, {
      headers: { Authorization: `Bearer ${server.apiToken}` },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const body = await res.json() as { ok: boolean; data: SystemSnapshot }
    if (!body.ok || !body.data) throw new Error('Invalid response')
    const status: RemoteServerStatus = {
      serverId: server.id,
      online: true,
      snapshot: body.data,
      lastSeen: Date.now(),
    }
    remoteCache.set(server.id, status)
    return status
  } catch (e) {
    const status: RemoteServerStatus = {
      serverId: server.id,
      online: false,
      error: String(e),
      lastSeen: remoteCache.get(server.id)?.lastSeen ?? Date.now(),
    }
    remoteCache.set(server.id, status)
    return status
  }
}

function toResponse(s: ServerConfig) {
  const status = remoteCache.get(s.id)
  return {
    ...stripToken(s),
    status: status ?? null,
  }
}

export async function serversRoutes(app: FastifyInstance) {
  // GET /api/servers
  app.get('/', { preHandler: requireAdmin }, async () => {
    const servers = listServers()
    return { ok: true, data: servers.map(toResponse) }
  })

  // GET /api/servers/:id
  app.get<{ Params: { id: string } }>('/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const server = getServer(req.params.id)
    if (!server) return reply.code(404).send({ ok: false, error: 'Server not found' })
    return { ok: true, data: toResponse(server) }
  })

  // POST /api/servers
  app.post<{ Body: { name: string; host: string; apiUrl: string; apiToken: string; tags?: string[] } }>(
    '/',
    { preHandler: requireAdmin },
    async (req, reply) => {
      const { name, host, apiUrl, apiToken, tags } = req.body
      if (!name || !host || !apiUrl || !apiToken) {
        return reply.code(400).send({ ok: false, error: 'name, host, apiUrl, and apiToken are required' })
      }
      const server = addServer({ name, host, apiUrl, apiToken, tags: tags ?? [] })
      return { ok: true, data: toResponse(server) }
    }
  )

  // DELETE /api/servers/:id
  app.delete<{ Params: { id: string } }>('/:id', { preHandler: requireAdmin }, async (req, reply) => {
    const server = getServer(req.params.id)
    if (!server) return reply.code(404).send({ ok: false, error: 'Server not found' })
    removeServer(req.params.id)
    remoteCache.delete(req.params.id)
    return { ok: true }
  })

  // GET /api/servers/:id/status  — force refresh
  app.get<{ Params: { id: string } }>('/:id/status', { preHandler: requireAdmin }, async (req, reply) => {
    const server = getServer(req.params.id)
    if (!server) return reply.code(404).send({ ok: false, error: 'Server not found' })
    const status = await pollServer(server)
    return { ok: true, data: status }
  })
}

export function startRemotePolling(intervalMs: number = 5000) {
  setInterval(async () => {
    const servers = listServers()
    await Promise.allSettled(servers.map(pollServer))
  }, intervalMs)
}
