import { readFile } from 'fs/promises'
import type { NetMetric } from '@pulseos/types'

interface RawNet {
  rxBytes: number
  txBytes: number
}

let prevSnapshot: Map<string, RawNet> = new Map()
let prevTime = Date.now()

const EXCLUDED = new Set(['lo'])

async function readNetDev(): Promise<Map<string, RawNet>> {
  const raw = await readFile('/proc/net/dev', 'utf8')
  const result = new Map<string, RawNet>()

  for (const line of raw.split('\n').slice(2)) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const colonIdx = trimmed.indexOf(':')
    if (colonIdx === -1) continue

    const iface = trimmed.slice(0, colonIdx).trim()
    if (EXCLUDED.has(iface)) continue

    const nums = trimmed.slice(colonIdx + 1).trim().split(/\s+/).map(Number)
    result.set(iface, {
      rxBytes: nums[0],
      txBytes: nums[8],
    })
  }

  return result
}

export async function collectNet(): Promise<NetMetric[]> {
  const current = await readNetDev()
  const now = Date.now()
  const elapsed = (now - prevTime) / 1000  // seconds

  const metrics: NetMetric[] = []

  for (const [iface, curr] of current) {
    const prev = prevSnapshot.get(iface)
    let rxRate = 0
    let txRate = 0

    if (prev && elapsed > 0) {
      rxRate = Math.max(0, (curr.rxBytes - prev.rxBytes) / elapsed)
      txRate = Math.max(0, (curr.txBytes - prev.txBytes) / elapsed)
    }

    metrics.push({
      interface: iface,
      rxBytes: Math.round(rxRate),
      txBytes: Math.round(txRate),
      rxTotal: curr.rxBytes,
      txTotal: curr.txBytes,
    })
  }

  prevSnapshot = current
  prevTime = now

  return metrics
}
