import { readFile } from 'fs/promises'
import type { MemMetric } from '@pulseos/types'

function parseMeminfo(raw: string): Record<string, number> {
  const result: Record<string, number> = {}
  for (const line of raw.split('\n')) {
    const match = line.match(/^(\w+):\s+(\d+)/)
    if (match) result[match[1]] = parseInt(match[2]) * 1024  // kB → bytes
  }
  return result
}

export async function collectMem(): Promise<MemMetric> {
  const raw = await readFile('/proc/meminfo', 'utf8')
  const m = parseMeminfo(raw)

  const total = m['MemTotal'] ?? 0
  const free = m['MemFree'] ?? 0
  const buffers = m['Buffers'] ?? 0
  const cached = (m['Cached'] ?? 0) + (m['SReclaimable'] ?? 0)
  const used = total - free - buffers - cached

  return {
    total,
    used,
    free: total - used,
    cached,
    buffers,
    usagePercent: total > 0 ? Math.round((used / total) * 100) : 0,
  }
}
