import { readFile } from 'fs/promises'
import { collectCpu } from './cpu.js'
import { collectMem } from './mem.js'
import { collectDisk } from './disk.js'
import { collectNet } from './net.js'
import { collectDocker } from './docker.js'
import { collectServices } from './services.js'
import { collectProcesses } from './processes.js'
import type { SystemSnapshot, ContainerMetric, ServiceStatus, ProcessInfo } from '@pulseos/types'

async function getHostname(): Promise<string> {
  try {
    const raw = await readFile('/etc/hostname', 'utf8')
    return raw.trim()
  } catch {
    return 'unknown'
  }
}

async function getUptime(): Promise<number> {
  try {
    const raw = await readFile('/proc/uptime', 'utf8')
    return parseFloat(raw.split(' ')[0])
  } catch {
    return 0
  }
}

export interface CollectorResult {
  snapshot: SystemSnapshot
  containers: ContainerMetric[]
  services: ServiceStatus[]
  processes: ProcessInfo[]
}

export async function collectAll(): Promise<CollectorResult> {
  const [cpu, mem, disks, net, uptime, hostname, containers, services, processes] =
    await Promise.allSettled([
      collectCpu(),
      collectMem(),
      collectDisk(),
      collectNet(),
      getUptime(),
      getHostname(),
      collectDocker(),
      collectServices(),
      collectProcesses(20),
    ])

  const resolve = <T>(r: PromiseSettledResult<T>, fallback: T): T =>
    r.status === 'fulfilled' ? r.value : fallback

  const snapshot: SystemSnapshot = {
    timestamp: Date.now(),
    uptime: resolve(uptime, 0),
    hostname: resolve(hostname, 'unknown'),
    cpu: resolve(cpu, { usage: 0, loadAvg: [0, 0, 0], cores: 1, model: 'Unknown', speed: 0 }),
    mem: resolve(mem, { total: 0, used: 0, free: 0, cached: 0, buffers: 0, usagePercent: 0 }),
    disks: resolve(disks, []),
    net: resolve(net, []),
  }

  return {
    snapshot,
    containers: resolve(containers, []),
    services: resolve(services, []),
    processes: resolve(processes, []),
  }
}
