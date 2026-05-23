import { exec } from 'child_process'
import { promisify } from 'util'
import type { ServiceStatus } from '@pulseos/types'

const execAsync = promisify(exec)

const WATCHED_SYSTEMD = (process.env.WATCH_SERVICES ?? 'nginx,ssh,cron').split(',').map(s => s.trim())
const WATCH_PM2 = process.env.WATCH_PM2 !== 'false'

async function collectSystemd(): Promise<ServiceStatus[]> {
  const results: ServiceStatus[] = []
  await Promise.allSettled(
    WATCHED_SYSTEMD.map(async (svc) => {
      try {
        const { stdout } = await execAsync(`systemctl is-active ${svc} 2>/dev/null`)
        const active = stdout.trim() === 'active'

        let uptime: number | undefined
        try {
          const { stdout: show } = await execAsync(
            `systemctl show ${svc} --property=ActiveEnterTimestamp 2>/dev/null`
          )
          const ts = show.split('=')[1]?.trim()
          if (ts && ts !== 'n/a') {
            const d = new Date(ts)
            if (!isNaN(d.getTime())) uptime = Math.floor((Date.now() - d.getTime()) / 1000)
          }
        } catch { /* ignore */ }

        results.push({
          name: svc,
          type: 'systemd',
          status: active ? 'online' : 'offline',
          uptime,
        })
      } catch {
        results.push({ name: svc, type: 'systemd', status: 'offline' })
      }
    })
  )
  return results
}

async function collectPm2(): Promise<ServiceStatus[]> {
  try {
    const { stdout } = await execAsync('pm2 jlist 2>/dev/null')
    const procs = JSON.parse(stdout) as Array<{
      name: string
      pid: number
      pm2_env: { status: string; pm_uptime: number; restart_time: number }
      monit: { cpu: number; memory: number }
    }>

    return procs.map(p => ({
      name: p.name,
      type: 'pm2' as const,
      status: p.pm2_env.status === 'online' ? 'online' : 'offline',
      pid: p.pid,
      uptime: p.pm2_env.pm_uptime
        ? Math.floor((Date.now() - p.pm2_env.pm_uptime) / 1000)
        : undefined,
      restartCount: p.pm2_env.restart_time,
      cpu: p.monit.cpu,
      mem: p.monit.memory,
    }))
  } catch {
    return []
  }
}

export async function collectServices(): Promise<ServiceStatus[]> {
  const [systemd, pm2] = await Promise.all([
    collectSystemd(),
    WATCH_PM2 ? collectPm2() : Promise.resolve([]),
  ])
  return [...systemd, ...pm2]
}
