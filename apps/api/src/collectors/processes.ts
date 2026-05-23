import { readdir, readFile } from 'fs/promises'
import type { ProcessInfo } from '@pulseos/types'

interface ProcStat {
  pid: number
  name: string
  state: string
  utime: number
  stime: number
}

async function readProcStat(pid: string): Promise<ProcStat | null> {
  try {
    const stat = await readFile(`/proc/${pid}/stat`, 'utf8')
    const parts = stat.trim().split(' ')
    return {
      pid: parseInt(pid),
      name: parts[1].replace(/[()]/g, ''),
      state: parts[2],
      utime: parseInt(parts[13]),
      stime: parseInt(parts[14]),
    }
  } catch {
    return null
  }
}

async function readProcCmdline(pid: string): Promise<string> {
  try {
    const raw = await readFile(`/proc/${pid}/cmdline`, 'utf8')
    return raw.replace(/\0/g, ' ').trim().slice(0, 80) || '[kernel]'
  } catch {
    return ''
  }
}

async function readProcMemRss(pid: string): Promise<number> {
  try {
    const raw = await readFile(`/proc/${pid}/statm`, 'utf8')
    const rssPages = parseInt(raw.split(' ')[1])
    return rssPages * 4096  // page size = 4KB
  } catch {
    return 0
  }
}

let prevProcTimes: Map<number, number> = new Map()
let prevSysTime = 0

export async function collectProcesses(limit = 20): Promise<ProcessInfo[]> {
  try {
    const entries = await readdir('/proc')
    const pids = entries.filter(e => /^\d+$/.test(e))

    const statRaw = await readFile('/proc/stat', 'utf8')
    const cpuLine = statRaw.split('\n')[0].split(/\s+/).slice(1).map(Number)
    const sysTime = cpuLine.reduce((a, b) => a + b, 0)
    const sysElapsed = sysTime - prevSysTime

    const processes = await Promise.allSettled(
      pids.map(async (pid) => {
        const [stat, cmdline, mem] = await Promise.all([
          readProcStat(pid),
          readProcCmdline(pid),
          readProcMemRss(pid),
        ])
        if (!stat) return null

        const procTime = stat.utime + stat.stime
        const prevTime = prevProcTimes.get(stat.pid) ?? procTime
        const cpuTicks = procTime - prevTime
        const cpuPercent = sysElapsed > 0
          ? Math.round((cpuTicks / sysElapsed) * 100 * 100) / 100
          : 0

        prevProcTimes.set(stat.pid, procTime)

        return {
          pid: stat.pid,
          name: stat.name,
          command: cmdline,
          cpu: cpuPercent,
          mem,
          status: stat.state,
        } satisfies ProcessInfo
      })
    )

    prevSysTime = sysTime

    return processes
      .filter((r): r is PromiseFulfilledResult<ProcessInfo | null> => r.status === 'fulfilled')
      .map(r => r.value)
      .filter((p): p is ProcessInfo => p !== null && p.mem > 0)
      .sort((a, b) => b.cpu - a.cpu)
      .slice(0, limit)
  } catch {
    return []
  }
}
