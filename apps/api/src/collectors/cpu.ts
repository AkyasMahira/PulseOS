import { readFile } from 'fs/promises'
import type { CpuMetric } from '@pulseos/types'

interface CpuTimes {
  user: number
  nice: number
  system: number
  idle: number
  iowait: number
  irq: number
  softirq: number
  steal: number
}

let prevTimes: CpuTimes | null = null

async function readCpuTimes(): Promise<CpuTimes> {
  const raw = await readFile('/proc/stat', 'utf8')
  const line = raw.split('\n')[0]
  const parts = line.split(/\s+/).slice(1).map(Number)
  return {
    user: parts[0],
    nice: parts[1],
    system: parts[2],
    idle: parts[3],
    iowait: parts[4] ?? 0,
    irq: parts[5] ?? 0,
    softirq: parts[6] ?? 0,
    steal: parts[7] ?? 0,
  }
}

async function readLoadAvg(): Promise<[number, number, number]> {
  const raw = await readFile('/proc/loadavg', 'utf8')
  const parts = raw.trim().split(/\s+/)
  return [parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2])]
}

async function readCpuInfo(): Promise<{ model: string; cores: number; speed: number }> {
  try {
    const raw = await readFile('/proc/cpuinfo', 'utf8')
    const lines = raw.split('\n')
    const model = lines.find(l => l.startsWith('model name'))?.split(':')[1]?.trim() ?? 'Unknown'
    const cores = lines.filter(l => l.startsWith('processor')).length
    const speedStr = lines.find(l => l.startsWith('cpu MHz'))?.split(':')[1]?.trim()
    const speed = speedStr ? parseFloat(speedStr) : 0
    return { model, cores, speed }
  } catch {
    return { model: 'Unknown', cores: 1, speed: 0 }
  }
}

export async function collectCpu(): Promise<CpuMetric> {
  const current = await readCpuTimes()
  const [loadAvg, cpuInfo] = await Promise.all([readLoadAvg(), readCpuInfo()])

  let usage = 0
  if (prevTimes) {
    const prevTotal =
      prevTimes.user + prevTimes.nice + prevTimes.system +
      prevTimes.idle + prevTimes.iowait + prevTimes.irq +
      prevTimes.softirq + prevTimes.steal
    const currTotal =
      current.user + current.nice + current.system +
      current.idle + current.iowait + current.irq +
      current.softirq + current.steal

    const totalDiff = currTotal - prevTotal
    const idleDiff = current.idle - prevTimes.idle

    usage = totalDiff > 0 ? Math.round(((totalDiff - idleDiff) / totalDiff) * 100) : 0
  }

  prevTimes = current

  return {
    usage,
    loadAvg,
    cores: cpuInfo.cores,
    model: cpuInfo.model,
    speed: Math.round(cpuInfo.speed),
  }
}
