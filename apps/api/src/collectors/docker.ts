import { request as httpRequest } from 'http'
import type { ContainerMetric } from '@pulseos/types'

const SOCKET = process.env.DOCKER_SOCKET ?? '/var/run/docker.sock'

function dockerGet(path: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      { socketPath: SOCKET, path, method: 'GET', headers: { Host: 'localhost' } },
      (res) => {
        let data = ''
        res.on('data', chunk => { data += chunk })
        res.on('end', () => {
          try { resolve(JSON.parse(data)) }
          catch { reject(new Error('JSON parse error')) }
        })
      }
    )
    req.on('error', reject)
    req.setTimeout(3000, () => { req.destroy(); reject(new Error('timeout')) })
    req.end()
  })
}

interface DockerContainer {
  Id: string
  Names: string[]
  Image: string
  Status: string
  State: string
  RestartCount?: number
  HostConfig?: { RestartPolicy?: { Name?: string } }
}

interface DockerStats {
  cpu_stats: { cpu_usage: { total_usage: number }; system_cpu_usage: number; online_cpus?: number }
  precpu_stats: { cpu_usage: { total_usage: number }; system_cpu_usage: number }
  memory_stats: { usage?: number; limit?: number }
  networks?: Record<string, { rx_bytes: number; tx_bytes: number }>
}

async function getContainerStats(id: string): Promise<DockerStats | null> {
  try {
    return await dockerGet(`/containers/${id}/stats?stream=false`) as DockerStats
  } catch {
    return null
  }
}

function calcCpuPercent(stats: DockerStats): number {
  const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage
  const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage
  const cpuCount = stats.cpu_stats.online_cpus ?? 1
  if (systemDelta <= 0) return 0
  return Math.round((cpuDelta / systemDelta) * cpuCount * 100 * 100) / 100
}

export async function collectDocker(): Promise<ContainerMetric[]> {
  try {
    const containers = await dockerGet('/containers/json?all=true') as DockerContainer[]

    const metrics = await Promise.allSettled(
      containers.map(async (c): Promise<ContainerMetric> => {
        const stats = c.State === 'running' ? await getContainerStats(c.Id) : null
        const memUsed = stats?.memory_stats?.usage ?? 0
        const memLimit = stats?.memory_stats?.limit ?? 0
        const netRx = stats?.networks
          ? Object.values(stats.networks).reduce((a, n) => a + n.rx_bytes, 0) : 0
        const netTx = stats?.networks
          ? Object.values(stats.networks).reduce((a, n) => a + n.tx_bytes, 0) : 0

        return {
          id: c.Id.slice(0, 12),
          name: c.Names[0]?.replace(/^\//, '') ?? c.Id.slice(0, 12),
          image: c.Image,
          status: c.State as ContainerMetric['status'],
          state: c.Status,
          cpuPercent: stats ? calcCpuPercent(stats) : 0,
          memUsed,
          memLimit,
          memPercent: memLimit > 0 ? Math.round((memUsed / memLimit) * 100) : 0,
          rxBytes: netRx,
          txBytes: netTx,
          restartCount: c.RestartCount ?? 0,
          startedAt: '',
        }
      })
    )

    return metrics
      .filter((r): r is PromiseFulfilledResult<ContainerMetric> => r.status === 'fulfilled')
      .map(r => r.value)
  } catch {
    return []
  }
}
